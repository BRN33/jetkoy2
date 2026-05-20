import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

const APP_VERSION = "1.0.0";

export default function AboutScreen() {
  const colors = useColors();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
        <Feather name="truck" size={48} color={colors.primaryForeground} />
      </View>
      <Text style={[styles.appName, { color: colors.foreground }]}>JetKoy</Text>
      <Text style={[styles.version, { color: colors.mutedForeground }]}>Surum {APP_VERSION}</Text>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row icon="info" label="Amac" value="Suruculer icin is paylasim ve koordinasyon platformu" colors={colors} />
        <Row icon="users" label="Hedef Kitle" value="Aktif calismasini surucu ve operatorler" colors={colors} />
        <Row icon="globe" label="Platform" value="Mobil (iOS & Android)" colors={colors} />
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row icon="cpu" label="Teknoloji" value="React Native (Expo) + Node.js" colors={colors} />
        <Row icon="database" label="Veritabani" value="PostgreSQL" colors={colors} />
        <Row icon="shield" label="Guvenlik" value="JWT + bcrypt sifreleme" colors={colors} />
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        Tum haklar saklidir.{"\n"}JetKoy {new Date().getFullYear()}
      </Text>
    </ScrollView>
  );
}

function Row({ icon, label, value, colors }: { icon: any; label: string; value: string; colors: any }) {
  return (
    <View style={styles.row}>
      <Feather name={icon} size={16} color={colors.mutedForeground} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 60, alignItems: "center" },
  logoBox: { width: 90, height: 90, borderRadius: 22, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  appName: { fontSize: 28, fontWeight: "800", marginBottom: 4 },
  version: { fontSize: 14, marginBottom: 32 },
  card: { width: "100%", borderRadius: 16, borderWidth: 1, padding: 20, gap: 16, marginBottom: 16 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  rowLabel: { fontSize: 12, marginBottom: 2 },
  rowValue: { fontSize: 15, fontWeight: "600" },
  footer: { marginTop: 24, textAlign: "center", fontSize: 13, lineHeight: 22 },
});
