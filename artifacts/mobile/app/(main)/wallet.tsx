import React from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useGetWallet, useGetCommissions, getGetWalletQueryKey, getGetCommissionsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";

export default function WalletScreen() {
  const colors = useColors();
  const walletQuery = useGetWallet({ query: { queryKey: getGetWalletQueryKey() } });
  const commissionsQuery = useGetCommissions({ query: { queryKey: getGetCommissionsQueryKey() } });

  const onRefresh = () => {
    walletQuery.refetch();
    commissionsQuery.refetch();
  };

  const isLoading = walletQuery.isLoading || commissionsQuery.isLoading;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const wallet = walletQuery.data;
  const comms = commissionsQuery.data;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={walletQuery.isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={[styles.balanceCard, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
        <Text style={[styles.balanceLabel, { color: colors.primaryForeground }]}>Kredim</Text>
        <Text style={[styles.balanceAmount, { color: colors.primaryForeground }]}>{wallet?.credits ?? 0} Kredi</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Toplam Kazanç</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{wallet?.totalEarned ?? 0} TL</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Toplam Harcanan</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{wallet?.totalSpent ?? 0} TL</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Alacaklarım (Komisyon)</Text>
      <View style={[styles.table, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
        {comms?.receivable.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Alacak bulunmuyor.</Text>
        ) : (
          comms?.receivable.map((rec) => (
            <View key={rec.id} style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{rec.driverName} ({rec.driverPlate})</Text>
                <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>{rec.departure} → {rec.destination}</Text>
              </View>
              <Text style={[styles.rowAmount, { color: colors.primary }]}>+{rec.amount} TL</Text>
            </View>
          ))
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Borçlarım (Komisyon)</Text>
      <View style={[styles.table, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
        {comms?.payable.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Borç bulunmuyor.</Text>
        ) : (
          comms?.payable.map((pay) => (
            <View key={pay.id} style={[styles.row, { borderBottomColor: colors.border }]}>
              <View style={styles.rowMain}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{pay.driverName} ({pay.driverPlate})</Text>
                <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>{pay.departure} → {pay.destination}</Text>
              </View>
              <Text style={[styles.rowAmount, { color: colors.destructive }]}>-{pay.amount} TL</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100, gap: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  balanceCard: { padding: 32, alignItems: "center", gap: 8 },
  balanceLabel: { fontSize: 16, fontWeight: "600", opacity: 0.9 },
  balanceAmount: { fontSize: 48, fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: 16 },
  statBox: { flex: 1, padding: 16, borderWidth: 1, gap: 4 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 20, fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: -8 },
  table: { borderWidth: 1, overflow: "hidden" },
  emptyText: { padding: 16, textAlign: "center" },
  row: { flexDirection: "row", padding: 16, borderBottomWidth: 1, alignItems: "center", justifyContent: "space-between" },
  rowMain: { flex: 1, paddingRight: 16 },
  rowTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  rowSubtitle: { fontSize: 12 },
  rowAmount: { fontSize: 16, fontWeight: "700" },
});