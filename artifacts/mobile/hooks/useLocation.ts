import { useState, useEffect } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCATION_ASKED_KEY = "location_permission_asked";

export interface UserLocation {
  lat: number;
  lng: number;
}

export function useLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;
    (async () => {
      try {
        const Location = await import("expo-location");
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch {
        // location unavailable
      }
    })();
  }, []);

  return location;
}

export async function requestPermissionsOnce(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const already = await AsyncStorage.getItem(LOCATION_ASKED_KEY);
    if (already) return;
    await AsyncStorage.setItem(LOCATION_ASKED_KEY, "1");

    const Location = await import("expo-location");
    await Location.requestForegroundPermissionsAsync();

    // Try to get position immediately after granting so it's cached
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === "granted") {
      await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    }
  } catch {
    // ignore
  }
}
