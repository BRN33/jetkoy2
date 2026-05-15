import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import {
  useAdminListUsers,
  useAdminAddCredits,
  useAdminSetVip,
  useAdminGetMessages,
  useAdminReplyMessage,
  getAdminListUsersQueryKey,
  getAdminGetMessagesQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

type AdminTab = "users" | "messages";

export default function AdminScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  const { data: users, isLoading: usersLoading } = useAdminListUsers({
    query: { queryKey: getAdminListUsersQueryKey() },
  });
  const { data: messages, isLoading: messagesLoading } = useAdminGetMessages({
    query: { queryKey: getAdminGetMessagesQueryKey() },
  });

  const addCreditsMutation = useAdminAddCredits();
  const setVipMutation = useAdminSetVip();
  const replyMutation = useAdminReplyMessage();

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");

  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replyText, setReplyText] = useState("");

  const filteredUsers = users?.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search) ||
      u.plate.toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = messages?.filter((m) => !m.isRead).length ?? 0;

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

  const handleReply = () => {
    if (!selectedMessage || !replyText.trim()) return;
    replyMutation.mutate(
      { id: selectedMessage.id, data: { reply: replyText.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminGetMessagesQueryKey() });
          setSelectedMessage(null);
          setReplyText("");
          Alert.alert("Gönderildi", "Yanıt iletildi.");
        },
        onError: (err: any) => Alert.alert("Hata", err?.message || "Yanıt gönderilemedi."),
      }
    );
  };

  const isLoading = activeTab === "users" ? usersLoading : messagesLoading;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === "users" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("users")}
        >
          <Feather name="users" size={16} color={activeTab === "users" ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.tabText, { color: activeTab === "users" ? colors.primary : colors.mutedForeground }]}>
            Kullanıcılar
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "messages" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("messages")}
        >
          <Feather name="message-circle" size={16} color={activeTab === "messages" ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.tabText, { color: activeTab === "messages" ? colors.primary : colors.mutedForeground }]}>
            Mesajlar
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
              <Text style={[styles.badgeText, { color: colors.destructiveForeground }]}>{unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {activeTab === "users" ? (
        <>
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
        </>
      ) : (
        <FlatList
          data={messages ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="inbox" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Mesaj yok</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.messageCard, { backgroundColor: colors.card, borderColor: item.isRead ? colors.border : colors.primary, borderRadius: colors.radius }]}>
              <View style={styles.messageHeader}>
                <View>
                  <Text style={[styles.senderName, { color: colors.foreground }]}>{item.senderName}</Text>
                  <Text style={[styles.senderInfo, { color: colors.mutedForeground }]}>{item.senderPhone} • {item.senderPlate}</Text>
                </View>
                <View style={styles.messageMeta}>
                  {!item.isRead && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                  )}
                  <Text style={[styles.messageTime, { color: colors.mutedForeground }]}>
                    {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                  </Text>
                </View>
              </View>

              <Text style={[styles.messageContent, { color: colors.foreground }]}>{item.content}</Text>

              {item.adminReply ? (
                <View style={[styles.replyBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.replyLabel, { color: colors.mutedForeground }]}>Yanıtın:</Text>
                  <Text style={[styles.replyText, { color: colors.foreground }]}>{item.adminReply}</Text>
                </View>
              ) : (
                <Pressable
                  style={[styles.replyBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                  onPress={() => { setSelectedMessage(item); setReplyText(""); }}
                >
                  <Feather name="corner-up-left" size={14} color={colors.primaryForeground} />
                  <Text style={[styles.replyBtnText, { color: colors.primaryForeground }]}>Yanıtla</Text>
                </Pressable>
              )}
            </View>
          )}
        />
      )}

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

      <Modal visible={!!selectedMessage} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderRadius: colors.radius, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Yanıtla</Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>{selectedMessage?.senderName}:</Text>
            <Text style={[styles.modalMessage, { color: colors.foreground, borderColor: colors.border }]}>{selectedMessage?.content}</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius }]}
              placeholder="Yanıtınızı yazın..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              value={replyText}
              onChangeText={setReplyText}
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={() => setSelectedMessage(null)}>
                <Text style={{ color: colors.secondaryForeground, fontWeight: "600" }}>İptal</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleReply} disabled={replyMutation.isPending}>
                <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>Gönder</Text>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 16 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 15, fontWeight: "600" },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 20, alignItems: "center" },
  badgeText: { fontSize: 11, fontWeight: "800" },
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
  messageCard: { padding: 16, borderWidth: 1.5, gap: 12 },
  messageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  senderName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  senderInfo: { fontSize: 13 },
  messageMeta: { alignItems: "flex-end", gap: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  messageTime: { fontSize: 12 },
  messageContent: { fontSize: 15, lineHeight: 22 },
  replyBox: { padding: 12, borderRadius: 8, borderWidth: 1 },
  replyLabel: { fontSize: 11, fontWeight: "700", marginBottom: 4 },
  replyText: { fontSize: 14 },
  replyBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8 },
  replyBtnText: { fontSize: 13, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalContent: { padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  modalSubtitle: { fontSize: 14, marginBottom: 4 },
  modalMessage: { fontSize: 15, padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  input: { height: 48, borderWidth: 1, paddingHorizontal: 16 },
  textArea: { borderWidth: 1, padding: 12, fontSize: 15, minHeight: 100, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  modalBtn: { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: 8 },
});
