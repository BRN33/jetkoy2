import { Tabs } from "expo-router";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

function NativeTabLayout({ isAdmin }: { isAdmin: boolean }) {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "car", selected: "car.fill" }} />
        <Label>İş Havuzu</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my-jobs">
        <Icon sf={{ default: "briefcase", selected: "briefcase.fill" }} />
        <Label>İşlerim</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wallet">
        <Icon sf={{ default: "creditcard", selected: "creditcard.fill" }} />
        <Label>Cüzdan</Label>
      </NativeTabs.Trigger>
      {isAdmin && (
        <NativeTabs.Trigger name="admin">
          <Icon sf={{ default: "shield", selected: "shield.fill" }} />
          <Label>Admin</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="create-job" href="/(main)/create-job" options={{ href: null }}>
        {/* Hidden trigger for modal */}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout({ isAdmin }: { isAdmin: boolean }) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const safeAreaInsets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: true,
        headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
        headerTintColor: colors.foreground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          paddingBottom: safeAreaInsets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "İş Havuzu",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="car.fill" tintColor={color} size={24} /> : <Feather name="truck" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-jobs"
        options={{
          title: "İşlerim",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="briefcase.fill" tintColor={color} size={24} /> : <Feather name="briefcase" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Cüzdan",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="creditcard.fill" tintColor={color} size={24} /> : <Feather name="credit-card" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: isAdmin ? "/(main)/admin" : null,
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="shield.fill" tintColor={color} size={24} /> : <Feather name="shield" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create-job"
        options={{
          href: null,
          presentation: "modal",
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout isAdmin={isAdmin} />;
  }
  return <ClassicTabLayout isAdmin={isAdmin} />;
}