import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useGetMyJobs, getGetMyJobsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

export default function MyJobsScreen() {
  const colors = useColors();
  const { data, isLoading, refetch, isRefetching } = useGetMyJobs({ query: { queryKey: getGetMyJobsQueryKey() } });
  const [activeTab, setActiveTab] = useState<"created" | "grabbed">("created");

  const jobs = activeTab === "created" ? data?.createdJobs : data?.grabbedJobs;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        <Text
          onPress={() => setActiveTab("created")}
          style={[styles.tab, activeTab === "created" ? { color: colors.primary, borderBottomColor: colors.primary } : { color: colors.mutedForeground, borderBottomColor: "transparent" }]}
        >
          Oluşturduğum İşler
        </Text>
        <Text
          onPress={() => setActiveTab("grabbed")}
          style={[styles.tab, activeTab === "grabbed" ? { color: colors.primary, borderBottomColor: colors.primary } : { color: colors.mutedForeground, borderBottomColor: "transparent" }]}
        >
          Kapttığım İşler
        </Text>
      </View>

      <FlatList
        data={jobs || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.centerEmpty}>
            <Feather name="folder" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Kayıt bulunamadı</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={styles.routeContainer}>
                <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={1}>{item.departure}</Text>
                <Feather name="arrow-right" size={16} color={colors.mutedForeground} style={{ marginHorizontal: 8 }} />
                <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={1}>{item.destination}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: item.status === "grabbed" ? colors.secondary : colors.primary }]}>
                <Text style={[styles.badgeText, { color: item.status === "grabbed" ? colors.secondaryForeground : colors.primaryForeground }]}>
                  {item.status === "grabbed" ? "Kapıldı" : "Bekliyor"}
                </Text>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <View>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Yolcu</Text>
                <Text style={[styles.value, { color: colors.foreground }]}>{item.passengerName}</Text>
              </View>
              <View>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Ücret</Text>
                <Text style={[styles.value, { color: colors.foreground }]}>{item.totalFare} TL</Text>
              </View>
            </View>
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{new Date(item.createdAt).toLocaleString("tr-TR")}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  centerEmpty: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100, gap: 16 },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, textAlign: "center", paddingVertical: 16, fontSize: 16, fontWeight: "600", borderBottomWidth: 2 },
  listContent: { padding: 16, paddingBottom: 100, flexGrow: 1 },
  emptyText: { fontSize: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16, gap: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  routeContainer: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 16 },
  routeText: { fontSize: 16, fontWeight: "700", flexShrink: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  detailsRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 12, marginBottom: 4 },
  value: { fontSize: 14, fontWeight: "500" },
  dateText: { fontSize: 12, textAlign: "right" },
});