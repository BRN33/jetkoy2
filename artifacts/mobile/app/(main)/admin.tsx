import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Modal, TextInput, Alert } from "react-native";
import { useAdminListUsers, useAdminAddCredits, useAdminSetVip, getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useAdminListUsers({ query: { queryKey: getAdminListUsersQueryKey() } });
  const addCreditsMutation = useAdminAddCredits();
  const setVipMutation = useAdminSetVip();

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");

  const filteredUsers = users?.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search) ||
      u.plate.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddCredits = () => {
    if (!selectedUser || !creditAmount) return;
    addCreditsMutation.mutate(
      { id: selectedUser.id, data: { amount: Number(creditAmount), note: creditNote } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
          setSelectedUser(null);
          setCreditAmount("");
          setCreditNote("");
          Alert.alert("Başarılı", "Kredi eklendi.");
        },
        onError: (err: any) => Alert.alert("Hata", err?.message || "Kredi eklenemedi."),
      }
    );
  };

  const handleToggleVip = (userId: string, currentVip: boolean) => {
    setVipMutation.mutate(
      { id: userId, data: { isVip: !currentVip } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() }),
        onError: (err: any) => Alert.alert("Hata", err?.message || "VIP durumu güncellenemedi."),
      }
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.input, color: colors.foreground, borderRadius: colors.radius, borderColor: colors.border }]}
          placeholder="İsim, telefon veya plaka ara..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.cardHeader}>
              <View style={styles.userTitleRow}>
                <Text style={[styles.name, { color: colors.foreground }]}>{item.fullName}</Text>
                {item.isVip && (
                  <View style={[styles.vipBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.vipText, { color: colors.primaryForeground }]}>VIP</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.credits, { color: colors.primary }]}>{item.credits} Kr</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.info, { color: colors.mutedForeground }]}>{item.phone} • {item.plate}</Text>
              <Text style={[styles.info, { color: colors.mutedForeground }]}>İş: {item.jobsCreated} (O) / {item.jobsGrabbed} (K)</Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}
                onPress={() => setSelectedUser(item)}
              >
                <Text style={[styles.btnText, { color: colors.secondaryForeground }]}>Kredi Ekle</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, { backgroundColor: item.isVip ? colors.destructive : colors.primary, borderRadius: colors.radius }]}
                onPress={() => handleToggleVip(item.id, item.isVip)}
              >
                <Text style={[styles.btnText, { color: item.isVip ? colors.destructiveForeground : colors.primaryForeground }]}>
                  {item.isVip ? "VIP Kaldır" : "VIP Yap"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={!!selectedUser} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderRadius: colors.radius, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Kredi Ekle</Text>
            <Text style={{ color: colors.mutedForeground, marginBottom: 16 }}>{selectedUser?.fullName} kullanıcısına kredi ekliyorsunuz.</Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius }]}
              placeholder="Miktar"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              value={creditAmount}
              onChangeText={setCreditAmount}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius, marginTop: 12 }]}
              placeholder="Not (Opsiyonel)"
              placeholderTextColor={colors.mutedForeground}
              value={creditNote}
              onChangeText={setCreditNote}
            />

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={() => setSelectedUser(null)}>
                <Text style={{ color: colors.secondaryForeground, fontWeight: "600" }}>İptal</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleAddCredits} disabled={addCreditsMutation.isPending}>
                <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>Ekle</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchContainer: { padding: 16, borderBottomWidth: 1 },
  searchInput: { height: 48, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  list: { padding: 16, paddingBottom: 100, gap: 16 },
  card: { padding: 16, borderWidth: 1, gap: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  userTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 18, fontWeight: "700" },
  vipBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  vipText: { fontSize: 10, fontWeight: "900" },
  credits: { fontSize: 18, fontWeight: "900" },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  info: { fontSize: 14 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  btnText: { fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalContent: { padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  input: { height: 48, borderWidth: 1, paddingHorizontal: 16 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  modalBtn: { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: 8 },
});