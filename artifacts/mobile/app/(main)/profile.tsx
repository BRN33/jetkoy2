import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useGetMe, useUpdateProfile, getGetMeQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfileScreen() {
  const colors = useColors();
  const { login, token } = useAuth();
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const updateMutation = useUpdateProfile();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [plate, setPlate] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const startEdit = () => {
    setFullName(me?.fullName ?? "");
    setPlate(me?.plate ?? "");
    setCurrentPassword("");
    setNewPassword("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const handleSave = () => {
    const body: Record<string, string> = {};
    if (fullName.trim() && fullName.trim() !== me?.fullName) body.fullName = fullName.trim();
    if (plate.trim() && plate.trim() !== me?.plate) body.plate = plate.trim();
    if (newPassword.trim()) {
      if (!currentPassword.trim()) {
        Alert.alert("Hata", "Yeni sifre icin mevcut sifrenizi girin.");
        return;
      }
      body.currentPassword = currentPassword.trim();
      body.newPassword = newPassword.trim();
    }

    if (Object.keys(body).length === 0) {
      setEditing(false);
      return;
    }

    updateMutation.mutate(
      { data: body },
      {
        onSuccess: (updated) => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          if (token) {
            login(token, updated);
          }
          setEditing(false);
          Alert.alert("Kaydedildi", "Profiliniz guncellendi.");
        },
        onError: (err: any) => Alert.alert("Hata", err?.message || "Guncellenemedi."),
      }
    );
  };

  if (isLoading || !me) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      {/* Avatar placeholder */}
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
          {me.fullName.charAt(0).toUpperCase()}
        </Text>
      </View>

      {!editing ? (
        <>
          {/* Info cards */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <InfoRow icon="user" label="Ad Soyad" value={me.fullName} colors={colors} />
            <InfoRow icon="phone" label="Telefon" value={me.phone} colors={colors} />
            <InfoRow icon="truck" label="Plaka" value={me.plate} colors={colors} />
            <InfoRow icon="credit-card" label="Kredi" value={`${me.credits} TL`} colors={colors} />
            <InfoRow
              icon="star"
              label="Durum"
              value={me.isVip ? "VIP Uye" : "Standart Uye"}
              colors={colors}
              highlight={me.isVip}
            />
          </View>

          <Pressable
            style={[styles.editBtn, { backgroundColor: colors.primary }]}
            onPress={startEdit}
          >
            <Feather name="edit-2" size={16} color={colors.primaryForeground} />
            <Text style={[styles.editBtnText, { color: colors.primaryForeground }]}>Profili Duzenle</Text>
          </Pressable>
        </>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Profili Duzenle</Text>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Ad Soyad</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            value={fullName}
            onChangeText={setFullName}
            placeholder={me.fullName}
            placeholderTextColor={colors.mutedForeground}
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Plaka</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            value={plate}
            onChangeText={setPlate}
            placeholder={me.plate}
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
          />

          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>Sifre Degistir (Opsiyonel)</Text>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Mevcut Sifre</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Mevcut sifreniz"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Yeni Sifre</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Yeni sifreniz"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
          />

          <View style={styles.btnRow}>
            <Pressable
              style={[styles.cancelBtn, { backgroundColor: colors.secondary }]}
              onPress={cancelEdit}
            >
              <Text style={{ color: colors.secondaryForeground, fontWeight: "700" }}>Vazgec</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>Kaydet</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  colors: any;
  highlight?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Feather name={icon} size={16} color={highlight ? colors.primary : colors.mutedForeground} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: highlight ? colors.primary : colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60, alignItems: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  avatarText: { fontSize: 32, fontWeight: "800" },
  card: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    marginBottom: 20,
  },
  infoRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  infoLabel: { fontSize: 12, marginBottom: 2 },
  infoValue: { fontSize: 16, fontWeight: "600" },
  sectionTitle: { fontSize: 17, fontWeight: "800", marginBottom: 4 },
  fieldLabel: { fontSize: 13, marginBottom: 4, marginTop: 4 },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  editBtnText: { fontSize: 16, fontWeight: "700" },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
});
