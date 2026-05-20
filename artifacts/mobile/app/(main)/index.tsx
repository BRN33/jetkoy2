import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { useListJobs, useGrabJob, getListJobsQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/hooks/useLocation";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function JobPoolScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const location = useLocation();
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
            Alert.alert("Hata", err?.message || "Is kapilamadi");
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

  // Sort by distance from user if location known
  const sortedJobs = location
    ? [...visibleJobs].sort((a, b) => {
        const aLat = a.departureLat;
        const aLng = a.departureLng;
        const bLat = b.departureLat;
        const bLng = b.departureLng;
        if (aLat == null || aLng == null) return 1;
        if (bLat == null || bLng == null) return -1;
        const dA = haversineKm(location.lat, location.lng, aLat, aLng);
        const dB = haversineKm(location.lat, location.lng, bLat, bLng);
        return dA - dB;
      })
    : visibleJobs;

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
                {pendingCount} is bekleniyor...
              </Text>
            </View>
          )}

          <FlatList
            data={sortedJobs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
            ListHeaderComponent={
              <>
                {location && (
                  <View style={[styles.locationBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Feather name="map-pin" size={14} color={colors.primary} />
                    <Text style={[styles.locationText, { color: colors.mutedForeground }]}>
                      Yakininizdaki isler once gosteriliyor
                    </Text>
                  </View>
                )}
                <Pressable
                  style={({ pressed }) => [
                    styles.shareButton,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                  onPress={() => router.push("/(main)/create-job")}
                >
                  <Feather name="plus-circle" size={20} color={colors.primaryForeground} />
                  <Text style={[styles.shareButtonText, { color: colors.primaryForeground }]}>
                    Is Paylas
                  </Text>
                </Pressable>
              </>
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Feather name="inbox" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {pendingCount > 0 ? "Yeni isler geliyor..." : "Su an is yok"}
                </Text>
                {pendingCount > 0 && (
                  <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
                    VIP olarak aninda gormek ister misiniz?
                  </Text>
                )}
              </View>
            }
            renderItem={({ item }) => {
              const dist = location && item.departureLat != null && item.departureLng != null
                ? haversineKm(location.lat, location.lng, item.departureLat, item.departureLng)
                : null;

              return (
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
                    {dist != null && (
                      <View style={[styles.distBadge, { backgroundColor: colors.primary + "22" }]}>
                        <Feather name="map-pin" size={12} color={colors.primary} />
                        <Text style={[styles.distText, { color: colors.primary }]}>
                          {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
                        </Text>
                      </View>
                    )}
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
                      <Text style={[styles.label, { color: colors.mutedForeground }]}>Olusturan</Text>
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
                        <Text style={[styles.grabButtonText, { color: colors.primaryForeground }]}>ISI KAP</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
        </>
      )}
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
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  locationText: { fontSize: 13 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16, gap: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  routeContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
  routeText: { fontSize: 18, fontWeight: "700", flexShrink: 1 },
  distBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  distText: { fontSize: 12, fontWeight: "700" },
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
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  shareButtonText: { fontWeight: "800", fontSize: 16 },
});
