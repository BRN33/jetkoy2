import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { registerForPushNotificationsAsync } from "@/utils/notifications";
import { requestPermissionsOnce } from "@/hooks/useLocation";

interface AuthContextValue {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAuth() {
      try {
        const storedToken = await AsyncStorage.getItem("auth_token");
        const storedUser = await AsyncStorage.getItem("auth_user");

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error("Failed to load auth", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadAuth();
  }, []);

  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  const login = async (newToken: string, newUser: User) => {
    try {
      await AsyncStorage.setItem("auth_token", newToken);
      await AsyncStorage.setItem("auth_user", JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    } catch (e) {
      console.error("Failed to save auth", e);
    }
    // One-time: request location + notification permissions after first login
    requestPermissionsOnce().catch(() => {});
    // Register push token in background (best-effort)
    registerForPushNotificationsAsync().then(async (pushToken) => {
      if (!pushToken) return;
      try {
        await fetch("/api/profile/push-token", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${newToken}` },
          body: JSON.stringify({ pushToken }),
        });
      } catch {
        // ignore
      }
    });
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("auth_token");
      await AsyncStorage.removeItem("auth_user");
      setToken(null);
      setUser(null);
    } catch (e) {
      console.error("Failed to remove auth", e);
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}