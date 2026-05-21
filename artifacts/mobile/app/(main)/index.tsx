import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { useListJobs, useGrabJob, getListJobsQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/hooks/useLocation";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Audio } from "expo-av";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} sa önce`;
  return `${Math.floor(hrs / 24)} gün önce`;
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
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingJobId, setPlayingJobId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const handlePlayVoice = useCallback(async (jobId: string, url: string) => {
    if (playingJobId === jobId) {
      await soundRef.current?.pauseAsync();
      setPlayingJobId(null);
      return;
    }
    await soundRef.current?.unloadAsync();
    soundRef.current = null;
    setPlayingJobId(null);
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      soundRef.current = sound;
      setPlayingJobId(jobId);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) setPlayingJobId(null);
      });
    } catch {
      Alert.alert("Hata", "Ses dosyası oynatılamadı");
    }
  }, [playingJobId]);

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

  const sortedJobs = [...visibleJobs].sort((a, b) => {
    const aLat = a.departureLat;
    const aLng = a.departureLng;
    const bLat = b.departureLat;
    const bLng = b.departureLng;
    const aHasCoords = aLat != null && aLng != null;
    const bHasCoords = bLat != null && bLng != null;

    if (location) {
      if (aHasCoords && bHasCoords) {
        const dA = haversineKm(location.lat, location.lng, aLat!, aLng!);
        const dB = haversineKm(location.lat, location.lng, bLat!, bLng!);
        if (Math.abs(dA - dB) > 0.05) return dA - dB;
      } else if (aHasCoords) {
        return -1;
      } else if (bHasCoords) {
        return 1;
      }
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={sortedJobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <>
              {pendingCount > 0 && (
                <View style={[styles.pendingBanner, { backgroundColor: "#1C1500", borderColor: colors.primary }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.pendingText, { color: colors.primary }]}>
                    {pendingCount} iş bekleniyor...
                  </Text>
                  <Text style={[styles.pendingVip, { color: colors.mutedForeground }]}>VIP olun, anında görün</Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.shareButton,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() => router.push("/(main)/create-job")}
              >
                <Feather name="plus-circle" size={22} color={colors.primaryForeground} />
                <Text style={[styles.shareButtonText, { color: colors.primaryForeground }]}>
                  YENİ İŞ OLUŞTUR
                </Text>
              </Pressable>

              {sortedJobs.length > 0 && (
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Açık İşler </Text>
                  <Text style={[styles.sectionCount, { color: colors.primary }]}>({sortedJobs.length})</Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={52} color={colors.mutedForeground} />
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
          renderItem={({ item }) => {
            const dist =
              location && item.departureLat != null && item.departureLng != null
                ? haversineKm(location.lat, location.lng, item.departureLat, item.departureLng)
                : null;
            const netFare = item.totalFare - item.commission;

            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Top: status badge + distance + time */}
                <View style={styles.topRow}>
                  <View style={[styles.statusBadge, { backgroundColor: "#0A2010" }]}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>AÇIK</Text>
                  </View>
                  <View style={styles.topRight}>
                    {dist != null && (
                      <View style={[styles.distBadge, { backgroundColor: colors.primary + "18" }]}>
                        <Feather name="map-pin" size={11} color={colors.primary} />
                        <Text style={[styles.distText, { color: colors.primary }]}>
                          {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.timeAgo, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt)}</Text>
                  </View>
                </View>

                {/* Route */}
                <View style={styles.routeBlock}>
                  <View style={styles.routeRow}>
                    <View style={styles.routeDotGreen} />
                    <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={1}>
                      {item.departure}
                    </Text>
                  </View>
                  <View style={[styles.routeConnector, { borderColor: colors.border }]} />
                  <View style={styles.routeRow}>
                    <Feather name="map-pin" size={14} color="#EF4444" style={{ width: 14 }} />
                    <Text style={[styles.routeText, { color: colors.foreground }]} numberOfLines={1}>
                      {item.destination}
                    </Text>
                  </View>
                </View>

                {/* Price stats */}
                <View style={[styles.statsBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>TOPLAM ÜCRET</Text>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>₺{item.totalFare}</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>KOMİSYON</Text>
                    <Text style={[styles.statValue, { color: "#22C55E" }]}>₺{item.commission}</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>NET KAZANÇ</Text>
                    <Text style={[styles.statValue, { color: "#F97316" }]}>₺{netFare}</Text>
                  </View>
                </View>

                {/* Driver info */}
                <View style={styles.driverRow}>
                  <Feather name="user" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.driverText, { color: colors.mutedForeground }]}>
                    {item.creatorName} ({item.creatorPlate})
                  </Text>
                </View>

                {/* Privacy hint */}
                <View style={styles.privacyRow}>
                  <Feather name="lock" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>
                    Yolcu bilgileri işi kapan şoföre gösterilir
                  </Text>
                </View>

                {/* Voice note playback */}
                {item.voiceNoteUrl && (
                  <Pressable
                    style={[styles.voiceBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                    onPress={() => handlePlayVoice(item.id, item.voiceNoteUrl!)}
                  >
                    <Feather
                      name={playingJobId === item.id ? "pause-circle" : "play-circle"}
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={[styles.voiceBtnText, { color: colors.primary }]}>
                      {playingJobId === item.id ? "Duraklat" : "Sesli Notu Dinle"}
                    </Text>
                  </Pressable>
                )}

                {/* Grab button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.grabButton,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                  onPress={() => handleGrab(item.id)}
                  disabled={grabMutation.isPending}
                >
                  {grabMutation.isPending && grabMutation.variables?.id === item.id ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="zap" size={18} color="#FFFFFF" />
                      <Text style={styles.grabButtonText}>İŞİ KAP</Text>
                    </>
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100, flexGrow: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60, gap: 12 },
  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, textAlign: "center" },
  emptySubText: { fontSize: 13, textAlign: "center" },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  pendingText: { fontSize: 14, fontWeight: "700", flex: 1 },
  pendingVip: { fontSize: 12 },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  shareButtonText: { fontWeight: "900", fontSize: 16, letterSpacing: 0.5 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sectionLabel: { fontSize: 15, fontWeight: "600" },
  sectionCount: { fontSize: 15, fontWeight: "800" },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 16, gap: 14 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#22C55E" },
  statusText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, color: "#22C55E" },
  topRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  distBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  distText: { fontSize: 11, fontWeight: "700" },
  timeAgo: { fontSize: 12 },
  routeBlock: { gap: 4 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeDotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#22C55E" },
  routeConnector: {
    height: 12,
    width: 0,
    borderLeftWidth: 2,
    borderStyle: "dashed",
    marginLeft: 5,
  },
  routeText: { fontSize: 17, fontWeight: "700", flex: 1 },
  statsBox: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  statItem: { flex: 1, paddingVertical: 12, paddingHorizontal: 6, alignItems: "center", gap: 5 },
  statDivider: { width: 1 },
  statLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.3, textAlign: "center" },
  statValue: { fontSize: 20, fontWeight: "900" },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  driverText: { fontSize: 13 },
  privacyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  privacyText: { fontSize: 11, fontStyle: "italic" },
  grabButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#22C55E",
    marginTop: 2,
  },
  grabButtonText: { fontWeight: "900", fontSize: 18, color: "#FFFFFF", letterSpacing: 0.8 },
  voiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  voiceBtnText: { fontWeight: "600", fontSize: 14 },
});
