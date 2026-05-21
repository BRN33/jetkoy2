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
  Image,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
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
  const [avatarUploading, setAvatarUploading] = useState(false);

  const startEdit = () => {
    setFullName(me?.fullName ?? "");
    setPlate(me?.plate ?? "");
    setCurrentPassword("");
    setNewPassword("");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const handleSave = () => {
    const body: Record<string, string> = {};
    if (fullName.trim() && fullName.trim() !== me?.fullName) body.fullName = fullName.trim();
    if (plate.trim() && plate.trim() !== me?.plate) body.plate = plate.trim();
    if (newPassword.trim()) {
      if (!currentPassword.trim()) {
        Alert.alert("Hata", "Yeni şifre için mevcut şifrenizi girin.");
        return;
      }
      body.currentPassword = currentPassword.trim();
      body.newPassword = newPassword.trim();
    }
    if (Object.keys(body).length === 0) { setEditing(false); return; }

    updateMutation.mutate(
      { data: body },
      {
        onSuccess: (updated) => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          if (token) login(token, updated);
          setEditing(false);
          Alert.alert("Kaydedildi", "Profiliniz güncellendi.");
        },
        onError: (err: any) => Alert.alert("Hata", err?.message || "Güncellenemedi."),
      }
    );
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("İzin Gerekli", "Fotoğraf seçmek için galeri iznine ihtiyaç var.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const fileName = asset.uri.split("/").pop() ?? "avatar.jpg";
    const contentType = asset.mimeType ?? "image/jpeg";

    setAvatarUploading(true);
    try {
      // Step 1: request presigned URL
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: fileName, size: asset.fileSize ?? 0, contentType }),
      });
      if (!urlRes.ok) throw new Error("Yükleme URL alınamadı.");
      const { uploadURL, objectPath } = await urlRes.json();

      // Step 2: upload directly to GCS
      const blob = await fetch(asset.uri).then((r) => r.blob());
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob,
      });
      if (!uploadRes.ok) throw new Error("Dosya yüklenemedi.");

      // Step 3: save objectPath as avatarUrl
      const avatarUrl = `/api/storage${objectPath}`;
      const saveRes = await fetch("/api/profile/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatarUrl }),
      });
      if (!saveRes.ok) throw new Error("Avatar kaydedilemedi.");

      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      if (token && me) login(token, { ...me, avatarUrl });
      Alert.alert("Kaydedildi", "Profil resminiz güncellendi.");
    } catch (err: any) {
      Alert.alert("Hata", err?.message || "Yüklenemedi.");
    } finally {
      setAvatarUploading(false);
    }
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
      {/* Avatar */}
      <Pressable onPress={handlePickAvatar} disabled={avatarUploading} style={styles.avatarWrap}>
        {me.avatarUrl ? (
          <Image source={{ uri: me.avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
              {me.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={[styles.avatarBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {avatarUploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="camera" size={14} color={colors.primary} />
          )}
        </View>
      </Pressable>

      {!editing ? (
        <>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <InfoRow icon="user" label="Ad Soyad" value={me.fullName} colors={colors} />
            <InfoRow icon="phone" label="Telefon" value={me.phone} colors={colors} />
            <InfoRow icon="truck" label="Plaka" value={me.plate} colors={colors} />
            <InfoRow icon="credit-card" label="Kredi" value={`${me.credits} TL`} colors={colors} />
            <InfoRow
              icon="star"
              label="Durum"
              value={me.isVip ? "VIP Üye" : "Standart Üye"}
              colors={colors}
              highlight={me.isVip}
            />
          </View>

          <Pressable style={[styles.editBtn, { backgroundColor: colors.primary }]} onPress={startEdit}>
            <Feather name="edit-2" size={16} color={colors.primaryForeground} />
            <Text style={[styles.editBtnText, { color: colors.primaryForeground }]}>Profili Düzenle</Text>
          </Pressable>

          {/* Settings / Legal Section */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 8 }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontSize: 12, marginBottom: 0 }]}>UYGULAMA</Text>
            <SettingsRow icon="shield" label="Gizlilik Politikası" onPress={() => router.push("/(main)/privacy" as any)} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingsRow icon="file-text" label="Kullanım Koşulları" onPress={() => router.push("/(main)/terms" as any)} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SettingsRow icon="info" label="Hakkinda" onPress={() => router.push("/(main)/about" as any)} colors={colors} />
          </View>
        </>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Profili Düzenle</Text>

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

          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>Şifre Değiştir (Opsiyonel)</Text>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Mevcut Şifre</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Mevcut şifreniz"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Yeni Şifre</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Yeni şifreniz"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
          />

          <View style={styles.btnRow}>
            <Pressable style={[styles.cancelBtn, { backgroundColor: colors.secondary }]} onPress={cancelEdit}>
              <Text style={{ color: colors.secondaryForeground, fontWeight: "700" }}>Vazgeç</Text>
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

function SettingsRow({ icon, label, onPress, colors }: { icon: any; label: string; onPress: () => void; colors: any }) {
  return (
    <Pressable onPress={onPress} style={styles.settingsRow}>
      <Feather name={icon} size={16} color={colors.mutedForeground} />
      <Text style={[styles.settingsLabel, { color: colors.foreground }]}>{label}</Text>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function InfoRow({
  icon, label, value, colors, highlight,
}: {
  icon: any; label: string; value: string; colors: any; highlight?: boolean;
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
  avatarWrap: { position: "relative", marginBottom: 24 },
  avatar: { width: 90, height: 90, borderRadius: 45, justifyContent: "center", alignItems: "center" },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarText: { fontSize: 36, fontWeight: "800" },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  card: { width: "100%", borderRadius: 16, borderWidth: 1, padding: 20, gap: 12, marginBottom: 20 },
  infoRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  infoLabel: { fontSize: 12, marginBottom: 2 },
  infoValue: { fontSize: 16, fontWeight: "600" },
  sectionTitle: { fontSize: 17, fontWeight: "800", marginBottom: 4 },
  fieldLabel: { fontSize: 13, marginBottom: 4, marginTop: 4 },
  input: { height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 16 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  editBtnText: { fontSize: 16, fontWeight: "700" },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  settingsRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  settingsLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
  divider: { height: 1, marginLeft: 28 },
});
