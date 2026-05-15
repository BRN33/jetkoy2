import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  useGetMyMessages,
  useSendMessage,
  getGetMyMessagesQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

export default function MessagesScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const { data: messages, isLoading, refetch, isRefetching } = useGetMyMessages({
    query: { queryKey: getGetMyMessagesQueryKey() },
  });
  const sendMutation = useSendMessage();

  const handleSend = () => {
    const text = content.trim();
    if (!text) return;
    sendMutation.mutate(
      { data: { content: text } },
      {
        onSuccess: () => {
          setContent("");
          queryClient.invalidateQueries({ queryKey: getGetMyMessagesQueryKey() });
        },
      }
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={88}
    >
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={messages ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          inverted={!!(messages && messages.length > 0)}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-circle" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Mesaj Yok</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Admin'e mesaj gönderebilirsiniz
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.messageGroup}>
              <View style={[styles.bubble, styles.userBubble, { backgroundColor: colors.primary }]}>
                <Text style={[styles.bubbleText, { color: colors.primaryForeground }]}>{item.content}</Text>
                <Text style={[styles.bubbleTime, { color: colors.primaryForeground + "99" }]}>
                  {new Date(item.createdAt).toLocaleString("tr-TR")}
                </Text>
              </View>

              {item.adminReply ? (
                <View style={[styles.bubble, styles.adminBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.adminLabel, { color: colors.mutedForeground }]}>Admin</Text>
                  <Text style={[styles.bubbleText, { color: colors.foreground }]}>{item.adminReply}</Text>
                  {item.repliedAt && (
                    <Text style={[styles.bubbleTime, { color: colors.mutedForeground }]}>
                      {new Date(item.repliedAt).toLocaleString("tr-TR")}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={[styles.pendingRow]}>
                  <Feather name="clock" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.pendingText, { color: colors.mutedForeground }]}>Yanıt bekleniyor</Text>
                </View>
              )}
            </View>
          )}
        />
      )}

      <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
          ]}
          placeholder="Admin'e mesaj yaz..."
          placeholderTextColor={colors.mutedForeground}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={500}
        />
        <Pressable
          style={[
            styles.sendBtn,
            { backgroundColor: content.trim() ? colors.primary : colors.secondary },
          ]}
          onPress={handleSend}
          disabled={sendMutation.isPending || !content.trim()}
        >
          {sendMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Feather name="send" size={20} color={content.trim() ? colors.primaryForeground : colors.mutedForeground} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
  listContent: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  messageGroup: { marginBottom: 20, gap: 8 },
  bubble: { maxWidth: "80%", padding: 14, borderRadius: 16 },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  adminBubble: { alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1 },
  adminLabel: { fontSize: 11, fontWeight: "700", marginBottom: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTime: { fontSize: 11, marginTop: 4, textAlign: "right" },
  pendingRow: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end" },
  pendingText: { fontSize: 12 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});
