import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { useListJobs, useGrabJob, getListJobsQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, Link } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

export default function JobPoolScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: jobs, isLoading, refetch, isRefetching } = useListJobs({
    query: {
      queryKey: getListJobsQueryKey(),
      refetchInterval: 5000,
    },
  });
  const grabMutation = useGrabJob();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleGrab = useCallback(
    (jobId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      grabMutation.mutate(
        { id: jobId },
        {
          onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
            router.push({
              pathname: "/job-grabbed/[id]",
              params: { id: data.job.id, passengerPhone: data.passengerPhone, newCreditBalance: data.newCreditBalance },
            });
          },
          onError: (err: any) => {
            Alert.alert("Hata", err?.message || "İş kapılamadı");
          },
        }
      );
    },
    [grabMutation, queryClient]
  );

  const allJobs = jobs?.filter((job) => job.status === "available") ?? [];

  const visibleJobs = user?.isVip
    ? allJobs
    : allJobs.filter((job) => {
        const ageMs = now - new Date(job.createdAt).getTime();
        return ageMs >= 10000;
      });

  const pendingCount = user?.isVip ? 0 : allJobs.length - visibleJobs.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {pendingCount > 0 && (
            <View style={[styles.pendingBanner, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.pendingText, { color: colors.mutedForeground }]}>
                {pendingCount} iş bekleniyor...
              </Text>
            </View>
          )}

          <FlatList
            data={visibleJobs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Feather name="inbox" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {pendingCount > 0 ? "Yeni işler geliyor..." : "Şu an iş yok"}
                </Text>
                {pendingCount > 0 && (
                  <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
                    VIP olarak anında görmek ister misiniz?
                  </Text>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.routeContainer}>
                    <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={1}>
                      {item.departure}
                    </Text>
                    <Feather name="arrow-right" size={16} color={colors.mutedForeground} style={{ marginHorizontal: 8 }} />
                    <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={1}>
                      {item.destination}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <View>
                    <Text style={[styles.label, { color: colors.mutedForeground }]}>Yolcu</Text>
                    <Text style={[styles.value, { color: colors.foreground }]}>{item.passengerName}</Text>
                  </View>
                  <View>
                    <Text style={[styles.label, { color: colors.mutedForeground }]}>Telefon</Text>
                    <Text style={[styles.value, { color: colors.foreground }]}>{item.passengerPhoneMasked}</Text>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <View>
                    <Text style={[styles.label, { color: colors.mutedForeground }]}>Oluşturan</Text>
                    <Text style={[styles.value, { color: colors.foreground }]}>
                      {item.creatorName} ({item.creatorPlate})
                    </Text>
                  </View>
                </View>

                <View style={styles.footerRow}>
                  <View>
                    <Text style={[styles.priceText, { color: colors.foreground }]}>{item.totalFare} TL</Text>
                    <Text style={[styles.commissionText, { color: colors.mutedForeground }]}>
                      Komisyon: {item.commission} TL
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.grabButton,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                    ]}
                    onPress={() => handleGrab(item.id)}
                    disabled={grabMutation.isPending}
                  >
                    {grabMutation.isPending && grabMutation.variables?.id === item.id ? (
                      <ActivityIndicator color={colors.primaryForeground} />
                    ) : (
                      <Text style={[styles.grabButtonText, { color: colors.primaryForeground }]}>İŞİ KAP</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          />
        </>
      )}

      <Link href="/(main)/create-job" asChild>
        <Pressable style={[styles.fab, { backgroundColor: colors.primary }]}>
          <Feather name="plus" size={24} color={colors.primaryForeground} />
          <Text style={[styles.fabText, { color: colors.primaryForeground }]}>İŞ PAYLAŞ</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100, flexGrow: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100, gap: 12 },
  emptyText: { fontSize: 16, textAlign: "center" },
  emptySubText: { fontSize: 13, textAlign: "center" },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pendingText: { fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16, gap: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  routeContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
  routeText: { fontSize: 18, fontWeight: "700", flexShrink: 1 },
  detailsRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 12, marginBottom: 4 },
  value: { fontSize: 14, fontWeight: "500" },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 },
  priceText: { fontSize: 24, fontWeight: "900" },
  commissionText: { fontSize: 12, marginTop: 4 },
  grabButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  grabButtonText: { fontWeight: "800", fontSize: 16 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 32,
    gap: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  fabText: { fontWeight: "800", fontSize: 16 },
});
