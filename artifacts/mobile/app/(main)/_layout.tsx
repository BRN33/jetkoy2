import { Tabs, router } from "expo-router";
import { Alert, Platform, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

export default function TabLayout() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  const handleLogout = () => {
    Alert.alert("Çıkış Yap", "Hesabınızdan çıkmak istiyor musunuz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };
  const safeAreaInsets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        } as any,
        headerTintColor: colors.foreground,
        headerRight: () => (
          <Pressable
            onPress={handleLogout}
            style={{ paddingHorizontal: 16, paddingVertical: 8 }}
            hitSlop={8}
          >
            <Feather name="log-out" size={20} color={colors.mutedForeground} />
          </Pressable>
        ),
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          paddingBottom: isIOS ? safeAreaInsets.bottom : isWeb ? 8 : 4,
          height: isIOS ? safeAreaInsets.bottom + 56 : isWeb ? 72 : 60,
        },
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: colors.background }} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "İş Havuzu",
          tabBarIcon: ({ color, size }) => <Feather name="truck" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-jobs"
        options={{
          title: "İşlerim",
          tabBarIcon: ({ color, size }) => <Feather name="briefcase" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Cüzdan",
          tabBarIcon: ({ color, size }) => <Feather name="credit-card" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Mesajlar",
          tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: isAdmin ? "/(main)/admin" : null,
          tabBarIcon: ({ color, size }) => <Feather name="shield" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="create-job" options={{ href: null }} />
      <Tabs.Screen name="privacy" options={{ href: null, title: "Gizlilik Politikasi" }} />
      <Tabs.Screen name="terms" options={{ href: null, title: "Kullanim Kosullari" }} />
      <Tabs.Screen name="about" options={{ href: null, title: "Hakkinda" }} />
    </Tabs>
  );
}
