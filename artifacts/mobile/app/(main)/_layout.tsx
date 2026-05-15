import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

export default function TabLayout() {
  const colors = useColors();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
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
        name="admin"
        options={{
          title: "Admin",
          href: isAdmin ? "/(main)/admin" : null,
          tabBarIcon: ({ color, size }) => <Feather name="shield" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create-job"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
