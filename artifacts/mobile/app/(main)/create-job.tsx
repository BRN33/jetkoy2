import React, { useState, useCallback, useRef } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useCreateJob, getListJobsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useQueryClient } from "@tanstack/react-query";
import { AddressInput, type AddressResult } from "@/components/AddressInput";
import { VoiceRecorder } from "@/components/VoiceRecorder";

export default function CreateJobScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const createMutation = useCreateJob();

  const [departure, setDeparture] = useState("");
  const [departureLat, setDepartureLat] = useState<number | null>(null);
  const [departureLng, setDepartureLng] = useState<number | null>(null);
  const [destination, setDestination] = useState("");
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [totalFare, setTotalFare] = useState("");
  const [commission, setCommission] = useState("");
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const [voiceKey, setVoiceKey] = useState(0);

  const resetForm = useCallback(() => {
    setDeparture("");
    setDepartureLat(null);
    setDepartureLng(null);
    setDestination("");
    setPassengerName("");
    setPassengerPhone("");
    setTotalFare("");
    setCommission("");
    setVoiceNoteUrl(null);
    setVoiceKey((k) => k + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetForm();
    }, [resetForm])
  );

  const handleDepartureSelect = (result: AddressResult) => {
    setDepartureLat(result.lat);
    setDepartureLng(result.lng);
  };

  const handleShare = () => {
    if (!departure || !destination || !passengerName || !passengerPhone || !totalFare) {
      Alert.alert("Hata", "Lutfen tum alanlari doldurun.");
      return;
    }

    createMutation.mutate(
      {
        data: {
          departure,
          destination,
          departureLat: departureLat ?? undefined,
          departureLng: departureLng ?? undefined,
          passengerName,
          passengerPhone,
          totalFare: Number(totalFare),
          commission: commission ? Number(commission) : 0,
          voiceNoteUrl: voiceNoteUrl ?? undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
          router.back();
        },
        onError: (err: any) => {
          Alert.alert("Hata", err?.message || "Is paylasilamadi");
        },
      }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Yeni Is Paylas</Text>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={{ color: colors.mutedForeground, fontSize: 16 }}>Kapat</Text>
        </Pressable>
      </View>
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.form}>
        <AddressInput
          placeholder="Kalkis Yeri"
          value={departure}
          onChangeText={(t) => { setDeparture(t); if (!t) { setDepartureLat(null); setDepartureLng(null); } }}
          onSelect={handleDepartureSelect}
        />
        <AddressInput
          placeholder="Varis Yeri"
          value={destination}
          onChangeText={setDestination}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
          placeholder="Yolcu Adi"
          placeholderTextColor={colors.mutedForeground}
          value={passengerName}
          onChangeText={setPassengerName}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
          placeholder="Yolcu Telefonu"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="phone-pad"
          value={passengerPhone}
          onChangeText={setPassengerPhone}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex1, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Toplam Ucret (TL)"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            value={totalFare}
            onChangeText={setTotalFare}
          />
          <TextInput
            style={[styles.input, styles.flex1, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Komisyon (TL) - opsiyonel"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            value={commission}
            onChangeText={setCommission}
          />
        </View>

        <VoiceRecorder key={voiceKey} voiceNoteUrl={voiceNoteUrl} onVoiceNoteUrl={setVoiceNoteUrl} />

        <Pressable
          style={[styles.button, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          onPress={handleShare}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Paylas</Text>
          )}
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700" },
  closeBtn: { padding: 4 },
  form: { padding: 16, gap: 16 },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  row: { flexDirection: "row", gap: 16 },
  flex1: { flex: 1 },
  button: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: { fontSize: 16, fontWeight: "700" },
});
