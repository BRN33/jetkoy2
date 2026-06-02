import React, { useState, useMemo } from "react";
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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  useAdminListUsers,
  useAdminAddCredits,
  useAdminSetVip,
  useAdminGetMessages,
  useAdminReplyMessage,
  useAdminSendMessage,
  useAdminDeleteMessage,
  useAdminKeepMessage,
  useAdminDeleteUser,
  useAdminEditUser,
  getAdminListUsersQueryKey,
  getAdminGetMessagesQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

type AdminTab = "users" | "members";
type UserModal = "credits" | "send-message" | "edit" | null;

interface ConversationUser {
  senderId: string;
  senderName: string;
  senderPhone: string;
  senderPlate: string;
  messages: any[];
  unreadCount: number;
  latestAt: string;
}

export default function AdminScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  const { data: users, isLoading: usersLoading } = useAdminListUsers({
    query: { queryKey: getAdminListUsersQueryKey() },
  });
  const { data: messages, isLoading: messagesLoading } = useAdminGetMessages({
    query: { queryKey: getAdminGetMessagesQueryKey(), refetchInterval: 10000 },
  });

  const sortedMembers = useMemo(
    () => users ? [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [],
    [users]
  );

  const addCreditsMutation = useAdminAddCredits();
  const setVipMutation = useAdminSetVip();
  const replyMutation = useAdminReplyMessage();
  const sendMessageMutation = useAdminSendMessage();
  const deleteMutation = useAdminDeleteMessage();
  const keepMutation = useAdminKeepMessage();
  const deleteUserMutation = useAdminDeleteUser();
  const editUserMutation = useAdminEditUser();

  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userModal, setUserModal] = useState<UserModal>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [sendMessageText, setSendMessageText] = useState("");

  // Edit user fields
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPlate, setEditPlate] = useState("");
  const [editCredits, setEditCredits] = useState("");
  const [editIsVip, setEditIsVip] = useState(false);
  const [editIsAdmin, setEditIsAdmin] = useState(false);

  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [openConversation, setOpenConversation] = useState<ConversationUser | null>(null);

  // Group messages by sender
  const conversations: ConversationUser[] = useMemo(() => {
    if (!messages) return [];
    const map = new Map<string, ConversationUser>();
    for (const m of messages) {
      const existing = map.get(m.senderId);
      if (existing) {
        existing.messages.push(m);
        if (!m.isRead) existing.unreadCount++;
        if (m.createdAt > existing.latestAt) existing.latestAt = m.createdAt;
      } else {
        map.set(m.senderId, {
          senderId: m.senderId,
          senderName: m.senderName,
          senderPhone: m.senderPhone,
          senderPlate: m.senderPlate,
          messages: [m],
          unreadCount: m.isRead ? 0 : 1,
          latestAt: m.createdAt,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
    );
  }, [messages]);

  const filteredUsers = users?.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search) ||
      u.plate.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const openCreditsModal = (user: any) => {
    setSelectedUser(user);
    setCreditAmount("");
    setCreditNote("");
    setUserModal("credits");
  };

  const openSendMessageModal = (user: any) => {
    setSelectedUser(user);
    setSendMessageText("");
    setUserModal("send-message");
  };

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setEditFullName(user.fullName);
    setEditPhone(user.phone);
    setEditPlate(user.plate);
    setEditCredits(String(user.credits));
    setEditIsVip(user.isVip);
    setEditIsAdmin(user.isAdmin);
    setUserModal("edit");
  };

  const closeModal = () => {
    setSelectedUser(null);
    setUserModal(null);
  };

  const handleDeleteUser = (user: any) => {
    Alert.alert(
      "Kullaniciyi Sil",
      `${user.fullName} adli kullaniciyi silmek istiyor musunuz? Bu islem geri alinamaz.`,
      [
        { text: "Iptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => {
            deleteUserMutation.mutate(
              { id: user.id },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
                  Alert.alert("Silindi", "Kullanici basariyla silindi.");
                },
                onError: (err: any) => Alert.alert("Hata", err?.message || "Silinemedi."),
              }
            );
          },
        },
      ]
    );
  };

  const handleEditUser = () => {
    if (!selectedUser) return;
    const body: Record<string, any> = {};
    if (editFullName.trim() !== selectedUser.fullName) body.fullName = editFullName.trim();
    if (editPhone.trim() !== selectedUser.phone) body.phone = editPhone.trim();
    if (editPlate.trim() !== selectedUser.plate) body.plate = editPlate.trim();
    if (Number(editCredits) !== selectedUser.credits) body.credits = Number(editCredits);
    if (editIsVip !== selectedUser.isVip) body.isVip = editIsVip;
    if (editIsAdmin !== selectedUser.isAdmin) body.isAdmin = editIsAdmin;

    if (Object.keys(body).length === 0) { closeModal(); return; }

    editUserMutation.mutate(
      { id: selectedUser.id, data: body },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
          closeModal();
          Alert.alert("Kaydedildi", "Kullanici bilgileri guncellendi.");
        },
        onError: (err: any) => Alert.alert("Hata", err?.message || "Guncellenemedi."),
      }
    );
  };

  const handleAddCredits = () => {
    if (!selectedUser || !creditAmount) return;
    addCreditsMutation.mutate(
      { id: selectedUser.id, data: { amount: Number(creditAmount), note: creditNote } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
          closeModal();
          Alert.alert("Basarili", "Kredi eklendi.");
        },
        onError: (err: any) => Alert.alert("Hata", err?.message || "Kredi eklenemedi."),
      }
    );
  };

  const handleSendMessage = () => {
    if (!selectedUser || !sendMessageText.trim()) return;
    sendMessageMutation.mutate(
      { data: { userId: selectedUser.id, content: sendMessageText.trim() } },
      {
        onSuccess: () => {
          closeModal();
          Alert.alert("Gonderildi", `${selectedUser.fullName} adli kullaniciya mesaj gonderildi.`);
        },
        onError: (err: any) => Alert.alert("Hata", err?.message || "Mesaj gonderilemedi."),
      }
    );
  };

  const handleToggleVip = (userId: string, currentVip: boolean) => {
    setVipMutation.mutate(
      { id: userId, data: { isVip: !currentVip } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() }),
        onError: (err: any) => Alert.alert("Hata", err?.message || "VIP durumu guncellenemedi."),
      }
    );
  };

  const handleReply = () => {
    if (!selectedMessage || !replyText.trim()) return;
    replyMutation.mutate(
      { id: selectedMessage.id, data: { reply: replyText.trim() } },
      {
        onSuccess: (updated) => {
          queryClient.invalidateQueries({ queryKey: getAdminGetMessagesQueryKey() });
          // update conversation in place
          if (openConversation) {
            setOpenConversation((prev) =>
              prev
                ? {
                    ...prev,
                    messages: prev.messages.map((m) => (m.id === updated.id ? updated : m)),
                  }
                : prev
            );
          }
          setSelectedMessage(null);
          setReplyText("");
        },
        onError: (err: any) => Alert.alert("Hata", err?.message || "Yanit gonderilemedi."),
      }
    );
  };

  const handleDelete = (msgId: string) => {
    Alert.alert("Sil", "Bu mesaji silmek istiyor musunuz?", [
      { text: "Iptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => {
          deleteMutation.mutate(
            { id: msgId },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getAdminGetMessagesQueryKey() });
                setOpenConversation((prev) =>
                  prev
                    ? { ...prev, messages: prev.messages.filter((m) => m.id !== msgId) }
                    : prev
                );
              },
              onError: (err: any) => Alert.alert("Hata", err?.message || "Silinemedi."),
            }
          );
        },
      },
    ]);
  };

  const handleToggleKeep = (msg: any) => {
    keepMutation.mutate(
      { id: msg.id },
      {
        onSuccess: (updated) => {
          queryClient.invalidateQueries({ queryKey: getAdminGetMessagesQueryKey() });
          setOpenConversation((prev) =>
            prev
              ? {
                  ...prev,
                  messages: prev.messages.map((m) => (m.id === updated.id ? updated : m)),
                }
              : prev
          );
        },
        onError: (err: any) => Alert.alert("Hata", err?.message || "Guncellenemedi."),
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
      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === "users" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("users")}
        >
          <Feather name="users" size={16} color={activeTab === "users" ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.tabText, { color: activeTab === "users" ? colors.primary : colors.mutedForeground }]}>
            Kullanicilar
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "members" && { borderBottomColor: colors.primary }]}
          onPress={() => setActiveTab("members")}
        >
          <Feather name="users" size={16} color={activeTab === "members" ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.tabText, { color: activeTab === "members" ? colors.primary : colors.mutedForeground }]}>
            Üyeler
          </Text>
        </Pressable>
      </View>

      {/* Users tab */}
      {activeTab === "users" ? (
        <>
          <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.input, color: colors.foreground, borderRadius: colors.radius, borderColor: colors.border }]}
              placeholder="Isim, telefon veya plaka ara..."
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
                    {item.isAdmin && (
                      <View style={[styles.vipBadge, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.vipText, { color: colors.secondaryForeground }]}>ADMIN</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.credits, { color: colors.primary }]}>{item.credits} Kr</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.info, { color: colors.mutedForeground }]}>{item.phone} - {item.plate}</Text>
                  <Text style={[styles.info, { color: colors.mutedForeground }]}>Is: {item.jobsCreated} (O) / {item.jobsGrabbed} (K)</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.btn, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}
                    onPress={() => openCreditsModal(item)}
                  >
                    <Feather name="plus-circle" size={14} color={colors.secondaryForeground} />
                    <Text style={[styles.btnText, { color: colors.secondaryForeground }]}>Kredi</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btn, { backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border }]}
                    onPress={() => openEditModal(item)}
                  >
                    <Feather name="edit-2" size={14} color={colors.foreground} />
                    <Text style={[styles.btnText, { color: colors.foreground }]}>Duzenle</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btn, { backgroundColor: colors.destructive, borderRadius: colors.radius }]}
                    onPress={() => handleDeleteUser(item)}
                  >
                    <Feather name="trash-2" size={14} color={colors.destructiveForeground} />
                    <Text style={[styles.btnText, { color: colors.destructiveForeground }]}>Sil</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </>
      ) : (
        /* Members tab — all registered users sorted by newest */
        <>
          <View style={[styles.membersHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.membersCount, { color: colors.mutedForeground }]}>
              {users ? `${users.length} üye kayıtlı` : "Yükleniyor..."}
            </Text>
          </View>
          <FlatList
            data={sortedMembers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.center}>
                <Feather name="users" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Kayıtlı üye yok</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={styles.memberTop}>
                  <View style={styles.memberTitleRow}>
                    <Text style={[styles.memberName, { color: colors.foreground }]}>{item.fullName}</Text>
                    {item.isVip && (
                      <View style={[styles.vipBadge, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.vipText, { color: colors.primaryForeground }]}>VIP</Text>
                      </View>
                    )}
                    {item.isAdmin && (
                      <View style={[styles.vipBadge, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.vipText, { color: colors.secondaryForeground }]}>ADMIN</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.memberCredits, { color: colors.primary }]}>{item.credits} Kr</Text>
                </View>
                <Text style={[styles.memberInfo, { color: colors.mutedForeground }]}>{item.phone} · {item.plate}</Text>
                <Text style={[styles.memberDate, { color: colors.mutedForeground }]}>
                  Kayıt: {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                </Text>
              </View>
            )}
          />
        </>
      )}

      {/* Conversation detail modal */}
      <Modal visible={!!openConversation} animationType="slide" transparent={false}>
        <View style={[styles.convModal, { backgroundColor: colors.background }]}>
          <View style={[styles.convModalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setOpenConversation(null)} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color={colors.foreground} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.convModalTitle, { color: colors.foreground }]} numberOfLines={1}>
                {openConversation?.senderName}
              </Text>
              <Text style={[styles.convModalSub, { color: colors.mutedForeground }]}>
                {openConversation?.senderPhone} · {openConversation?.senderPlate}
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.convMessages}>
            {(openConversation?.messages ?? []).map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.msgBubble,
                  {
                    backgroundColor: colors.card,
                    borderColor: msg.isRead ? colors.border : colors.primary,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text style={[styles.msgContent, { color: colors.foreground }]}>{msg.content}</Text>
                <Text style={[styles.msgTime, { color: colors.mutedForeground }]}>
                  {new Date(msg.createdAt).toLocaleString("tr-TR")}
                </Text>

                {msg.adminReply && (
                  <View style={[styles.replyBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.replyLabel, { color: colors.mutedForeground }]}>Yanitiniz:</Text>
                    <Text style={[styles.replyText, { color: colors.foreground }]}>{msg.adminReply}</Text>
                  </View>
                )}

                <View style={styles.msgActions}>
                  {!msg.adminReply && (
                    <Pressable
                      style={[styles.smallBtn, { backgroundColor: colors.primary, borderRadius: 6 }]}
                      onPress={() => { setSelectedMessage(msg); setReplyText(""); }}
                    >
                      <Feather name="corner-up-left" size={12} color={colors.primaryForeground} />
                      <Text style={[styles.smallBtnText, { color: colors.primaryForeground }]}>Yanitla</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={[styles.smallBtn, { backgroundColor: msg.adminKeep ? colors.primary : colors.secondary, borderRadius: 6 }]}
                    onPress={() => handleToggleKeep(msg)}
                  >
                    <Feather name="bookmark" size={12} color={msg.adminKeep ? colors.primaryForeground : colors.secondaryForeground} />
                    <Text style={[styles.smallBtnText, { color: msg.adminKeep ? colors.primaryForeground : colors.secondaryForeground }]}>
                      {msg.adminKeep ? "Koruyorum" : "Koru"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.smallBtn, { backgroundColor: colors.destructive, borderRadius: 6 }]}
                    onPress={() => handleDelete(msg.id)}
                  >
                    <Feather name="trash-2" size={12} color={colors.destructiveForeground} />
                    <Text style={[styles.smallBtnText, { color: colors.destructiveForeground }]}>Sil</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            {(openConversation?.messages ?? []).length === 0 && (
              <View style={styles.center}>
                <Text style={{ color: colors.mutedForeground }}>Tum mesajlar silindi</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal visible={userModal === "edit"} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderRadius: colors.radius, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Kullaniciyi Duzenle</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius }]}
              placeholder="Ad Soyad"
              placeholderTextColor={colors.mutedForeground}
              value={editFullName}
              onChangeText={setEditFullName}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius, marginTop: 10 }]}
              placeholder="Telefon"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              value={editPhone}
              onChangeText={setEditPhone}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius, marginTop: 10 }]}
              placeholder="Plaka"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              value={editPlate}
              onChangeText={setEditPlate}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius, marginTop: 10 }]}
              placeholder="Kredi"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              value={editCredits}
              onChangeText={setEditCredits}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable
                style={[styles.toggleBtn, { backgroundColor: editIsVip ? colors.primary : colors.secondary, borderRadius: colors.radius }]}
                onPress={() => setEditIsVip(!editIsVip)}
              >
                <Text style={{ color: editIsVip ? colors.primaryForeground : colors.secondaryForeground, fontWeight: "700" }}>
                  {editIsVip ? "VIP" : "VIP Degil"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, { backgroundColor: editIsAdmin ? colors.primary : colors.secondary, borderRadius: colors.radius }]}
                onPress={() => setEditIsAdmin(!editIsAdmin)}
              >
                <Text style={{ color: editIsAdmin ? colors.primaryForeground : colors.secondaryForeground, fontWeight: "700" }}>
                  {editIsAdmin ? "Admin" : "Admin Degil"}
                </Text>
              </Pressable>
            </View>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={closeModal}>
                <Text style={{ color: colors.secondaryForeground, fontWeight: "600" }}>Iptal</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleEditUser} disabled={editUserMutation.isPending}>
                {editUserMutation.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>Kaydet</Text>}
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Credits Modal */}
      <Modal visible={userModal === "credits"} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderRadius: colors.radius, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Kredi Ekle</Text>
            <Text style={{ color: colors.mutedForeground, marginBottom: 16 }}>{selectedUser?.fullName} kullanicisina kredi ekliyorsunuz.</Text>
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
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={closeModal}>
                <Text style={{ color: colors.secondaryForeground, fontWeight: "600" }}>Iptal</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleAddCredits} disabled={addCreditsMutation.isPending}>
                {addCreditsMutation.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>Ekle</Text>}
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Send Message Modal */}
      <Modal visible={userModal === "send-message"} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderRadius: colors.radius, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Mesaj Gonder</Text>
            <Text style={{ color: colors.mutedForeground, marginBottom: 16 }}>{selectedUser?.fullName} kullanicisina mesaj gonderiyorsunuz.</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius }]}
              placeholder="Mesajinizi yazin..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              value={sendMessageText}
              onChangeText={setSendMessageText}
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={closeModal}>
                <Text style={{ color: colors.secondaryForeground, fontWeight: "600" }}>Iptal</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleSendMessage} disabled={sendMessageMutation.isPending || !sendMessageText.trim()}>
                {sendMessageMutation.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>Gonder</Text>}
              </Pressable>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reply Modal */}
      <Modal visible={!!selectedMessage} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderRadius: colors.radius, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Yanitla</Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>{selectedMessage?.senderName}:</Text>
            <Text style={[styles.modalMessage, { color: colors.foreground, borderColor: colors.border }]}>{selectedMessage?.content}</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius }]}
              placeholder="Yanitinizi yazin..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              value={replyText}
              onChangeText={setReplyText}
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={() => setSelectedMessage(null)}>
                <Text style={{ color: colors.secondaryForeground, fontWeight: "600" }}>Iptal</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleReply} disabled={replyMutation.isPending}>
                {replyMutation.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>Gonder</Text>}
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
  userTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: { fontSize: 17, fontWeight: "700" },
  vipBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  vipText: { fontSize: 10, fontWeight: "900" },
  credits: { fontSize: 18, fontWeight: "900" },
  infoRow: { gap: 2 },
  info: { fontSize: 13 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4, flexWrap: "wrap" },
  btn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 10 },
  btnText: { fontWeight: "700", fontSize: 13 },
  // Conversation list
  convCard: { padding: 16, borderWidth: 1.5, gap: 8 },
  convHeader: { flexDirection: "row", alignItems: "flex-start" },
  convMeta: { alignItems: "flex-end", gap: 4 },
  convCount: { fontSize: 12 },
  senderName: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  senderInfo: { fontSize: 13 },
  convPreview: { fontSize: 14, lineHeight: 20 },
  convTime: { fontSize: 12 },
  // Conversation modal
  convModal: { flex: 1 },
  convModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  convModalTitle: { fontSize: 17, fontWeight: "700" },
  convModalSub: { fontSize: 13 },
  convMessages: { padding: 16, gap: 16, paddingBottom: 40 },
  msgBubble: { padding: 14, borderWidth: 1.5, gap: 8 },
  msgContent: { fontSize: 15, lineHeight: 22 },
  msgTime: { fontSize: 12 },
  replyBox: { padding: 10, borderRadius: 8, borderWidth: 1 },
  replyLabel: { fontSize: 11, fontWeight: "700", marginBottom: 4 },
  replyText: { fontSize: 14 },
  msgActions: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
  smallBtnText: { fontSize: 12, fontWeight: "700" },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 8 },
  // Members tab
  membersHeader: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  membersCount: { fontSize: 13 },
  memberCard: { padding: 14, borderWidth: 1, gap: 6 },
  memberTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  memberTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" },
  memberName: { fontSize: 16, fontWeight: "700" },
  memberCredits: { fontSize: 16, fontWeight: "800" },
  memberInfo: { fontSize: 13 },
  memberDate: { fontSize: 12 },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 },
  modalContent: { padding: 24, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  modalSubtitle: { fontSize: 14, marginBottom: 4 },
  modalMessage: { fontSize: 15, padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  input: { height: 48, borderWidth: 1, paddingHorizontal: 16 },
  textArea: { borderWidth: 1, padding: 12, fontSize: 15, minHeight: 100, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  modalBtn: { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: 8 },
});
