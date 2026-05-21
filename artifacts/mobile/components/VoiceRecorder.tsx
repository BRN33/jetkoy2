import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Audio } from "expo-av";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

const MAX_DURATION_MS = 60000; // 60 saniye

interface Props {
  voiceNoteUrl: string | null;
  onVoiceNoteUrl: (url: string | null) => void;
}

export function VoiceRecorder({ voiceNoteUrl, onVoiceNoteUrl }: Props) {
  const colors = useColors();
  const { token } = useAuth();

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      sound?.unloadAsync();
    };
  }, [sound]);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("İzin Gerekli", "Ses kaydı için mikrofon iznine ihtiyaç var.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(rec);
      setIsRecording(true);
      setDurationMs(0);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setDurationMs(elapsed);
        if (elapsed >= MAX_DURATION_MS) {
          stopRecording(rec);
        }
      }, 200);
    } catch (err: any) {
      Alert.alert("Hata", "Kayıt başlatılamadı: " + err.message);
    }
  };

  const stopRecording = async (rec?: Audio.Recording) => {
    const activeRec = rec ?? recording;
    if (!activeRec) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    setIsUploading(true);

    try {
      await activeRec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = activeRec.getURI();
      if (!uri) throw new Error("Kayıt URI alınamadı");

      const fileName = `voice_${Date.now()}.m4a`;
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: fileName, size: 0, contentType: "audio/mp4" }),
      });
      if (!urlRes.ok) throw new Error("Yükleme URL alınamadı");
      const { uploadURL, objectPath } = await urlRes.json();

      const blob = await fetch(uri).then((r) => r.blob());
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": "audio/mp4" },
        body: blob,
      });
      if (!uploadRes.ok) throw new Error("Ses dosyası yüklenemedi");

      const finalUrl = `/api/storage${objectPath}`;
      onVoiceNoteUrl(finalUrl);
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Ses kaydı yüklenemedi");
      onVoiceNoteUrl(null);
    } finally {
      setRecording(null);
      setIsUploading(false);
    }
  };

  const deleteRecording = () => {
    sound?.unloadAsync();
    setSound(null);
    setIsPlaying(false);
    onVoiceNoteUrl(null);
    setDurationMs(0);
  };

  const togglePlayback = async () => {
    if (!voiceNoteUrl) return;

    if (sound && isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
      return;
    }

    if (sound) {
      await sound.replayAsync();
      setIsPlaying(true);
      return;
    }

    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: voiceNoteUrl },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch {
      Alert.alert("Hata", "Ses dosyası oynatılamadı");
    }
  };

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  };

  const remaining = Math.max(0, MAX_DURATION_MS - durationMs);
  const progress = Math.min(1, durationMs / MAX_DURATION_MS);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.labelRow}>
        <Feather name="mic" size={15} color={colors.primary} />
        <Text style={[styles.label, { color: colors.foreground }]}>Sesli Not</Text>
        <Text style={[styles.optional, { color: colors.mutedForeground }]}>(opsiyonel)</Text>
      </View>

      {!voiceNoteUrl && !isRecording && !isUploading && (
        <Pressable
          style={[styles.recordBtn, { backgroundColor: "#22C55E" }]}
          onPress={startRecording}
        >
          <Feather name="mic" size={18} color="#fff" />
          <Text style={styles.recordBtnText}>Kayıt Başlat</Text>
          <Text style={[styles.maxNote, { color: "rgba(255,255,255,0.75)" }]}>maks 60 sn</Text>
        </Pressable>
      )}

      {isRecording && (
        <View style={styles.recordingRow}>
          <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: "#EF4444" }]} />
          </View>
          <View style={styles.recordingInfo}>
            <View style={styles.pulseRow}>
              <View style={styles.pulseDot} />
              <Text style={[styles.durationText, { color: "#EF4444" }]}>{formatDuration(durationMs)}</Text>
            </View>
            <Text style={[styles.remainingText, { color: colors.mutedForeground }]}>
              {formatDuration(remaining)} kaldı
            </Text>
          </View>
          <Pressable
            style={[styles.stopBtn, { backgroundColor: "#EF4444" }]}
            onPress={() => stopRecording()}
          >
            <Feather name="square" size={16} color="#fff" />
            <Text style={styles.stopBtnText}>Durdur</Text>
          </Pressable>
        </View>
      )}

      {isUploading && (
        <View style={styles.uploadingRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[styles.uploadingText, { color: colors.mutedForeground }]}>Yükleniyor...</Text>
        </View>
      )}

      {voiceNoteUrl && !isRecording && !isUploading && (
        <View style={styles.playbackRow}>
          <Pressable
            style={[styles.playBtn, { backgroundColor: colors.primary }]}
            onPress={togglePlayback}
          >
            <Feather name={isPlaying ? "pause" : "play"} size={18} color={colors.primaryForeground} />
            <Text style={[styles.playBtnText, { color: colors.primaryForeground }]}>
              {isPlaying ? "Duraklat" : "Dinle"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.deleteBtn, { borderColor: colors.border }]}
            onPress={deleteRecording}
          >
            <Feather name="trash-2" size={16} color="#EF4444" />
            <Text style={[styles.deleteBtnText, { color: "#EF4444" }]}>Sil</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 15, fontWeight: "600" },
  optional: { fontSize: 13 },
  recordBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  recordBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  maxNote: { fontSize: 12 },
  recordingRow: { gap: 10 },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  recordingInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pulseRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  durationText: { fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
  remainingText: { fontSize: 12 },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  stopBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  uploadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  uploadingText: { fontSize: 14 },
  playbackRow: { flexDirection: "row", gap: 10 },
  playBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  playBtnText: { fontWeight: "700", fontSize: 14 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  deleteBtnText: { fontWeight: "600", fontSize: 14 },
});
