import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

export default function JobGrabbedScreen() {
  const { id, passengerPhone, newCreditBalance } = useLocalSearchParams<{ id: string; passengerPhone: string; newCreditBalance: string }>();
  const colors = useColors();

  const handleCall = () => {
    if (passengerPhone) {
      Linking.openURL(`tel:${passengerPhone}`);
    }
  };

  const handleNav = () => {
    // Basic fallback navigation
    Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent("Arnavutköy")}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
          <Feather name="check" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>İşi Kaptın!</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Yeni Bakiye: <Text style={{ color: colors.foreground, fontWeight: "700" }}>{newCreditBalance} Kr</Text>
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Yolcu Telefonu</Text>
          <Text style={[styles.phone, { color: colors.foreground }]}>{passengerPhone}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.primary, borderRadius: colors.radius }]} onPress={handleCall}>
            <Feather name="phone" size={20} color={colors.primaryForeground} />
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Tıkla Ara</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnSecondary, { backgroundColor: colors.secondary, borderRadius: colors.radius }]} onPress={handleNav}>
            <Feather name="navigation" size={20} color={colors.secondaryForeground} />
            <Text style={[styles.btnText, { color: colors.secondaryForeground }]}>Navigasyona Git</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={[styles.backBtn, { borderColor: colors.border, borderRadius: colors.radius }]} onPress={() => router.back()}>
        <Text style={[styles.backBtnText, { color: colors.foreground }]}>İş Havuzuna Dön</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "space-between" },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  iconCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: "center", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 32, fontWeight: "900", marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 32 },
  card: { padding: 24, borderWidth: 1, width: "100%", alignItems: "center", marginBottom: 32 },
  label: { fontSize: 14, marginBottom: 8 },
  phone: { fontSize: 28, fontWeight: "700", letterSpacing: 2 },
  actions: { width: "100%", gap: 16 },
  btn: { flexDirection: "row", paddingVertical: 16, justifyContent: "center", alignItems: "center", gap: 12 },
  btnPrimary: {},
  btnSecondary: {},
  btnText: { fontSize: 16, fontWeight: "700" },
  backBtn: { paddingVertical: 16, alignItems: "center", borderWidth: 1 },
  backBtnText: { fontSize: 16, fontWeight: "600" },
});