import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput as RNTextInput,
} from "react-native";
import { router } from "expo-router";
import { useSendOtp, useVerifyOtp } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

type Step = "form" | "otp";

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 8) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
}

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>("form");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState(["", "", "", ""]);
  const [devCode, setDevCode] = useState<string | null>(null);
  const inputRefs = useRef<(RNTextInput | null)[]>([]);

  const sendOtpMutation = useSendOtp();
  const verifyOtpMutation = useVerifyOtp();

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhone(text));
  };

  const handleSendOtp = () => {
    const rawPhone = phone.replace(/\s/g, "");
    if (!fullName.trim() || !rawPhone || !plate.trim() || !password.trim()) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Hata", "Şifre en az 6 karakter olmalıdır.");
      return;
    }

    sendOtpMutation.mutate(
      { data: { phone: rawPhone } },
      {
        onSuccess: (data) => {
          setDevCode(data.devCode ?? null);
          setStep("otp");
        },
        onError: (error: any) => {
          Alert.alert("Hata", error?.message || "Kod gönderilemedi.");
        },
      }
    );
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const code = otp.join("");
    const rawPhone = phone.replace(/\s/g, "");
    if (code.length < 4) {
      Alert.alert("Hata", "Lütfen 4 haneli kodu girin.");
      return;
    }

    verifyOtpMutation.mutate(
      {
        data: {
          fullName: fullName.trim(),
          phone: rawPhone,
          plate: plate.trim().toUpperCase(),
          password,
          code,
        },
      },
      {
        onSuccess: async (data) => {
          await login(data.token, data.user);
          router.replace("/(main)");
        },
        onError: (error: any) => {
          Alert.alert("Hata", error?.message || "Kod doğrulanamadı.");
          setOtp(["", "", "", ""]);
          inputRefs.current[0]?.focus();
        },
      }
    );
  };

  if (step === "otp") {
    return (
      <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
          <Pressable style={styles.backBtn} onPress={() => setStep("form")}>
            <Feather name="arrow-left" size={20} color={colors.mutedForeground} />
            <Text style={[styles.backText, { color: colors.mutedForeground }]}>Geri</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.primary }]}>Doğrulama</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {phone} numarasına gönderilen{"\n"}4 haneli kodu girin
            </Text>
          </View>

          {devCode ? (
            <View style={[styles.devBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="info" size={14} color={colors.mutedForeground} />
              <Text style={[styles.devBannerText, { color: colors.mutedForeground }]}>
                Test kodu: <Text style={{ color: colors.primary, fontWeight: "800" }}>{devCode}</Text>
              </Text>
            </View>
          ) : null}

          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.otpBox,
                  {
                    backgroundColor: colors.input,
                    color: colors.foreground,
                    borderColor: digit ? colors.primary : colors.border,
                  },
                ]}
                value={digit}
                onChangeText={(v) => handleOtpChange(v, index)}
                onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
                autoFocus={index === 0}
              />
            ))}
          </View>

          <Pressable
            style={[styles.button, { backgroundColor: colors.primary, borderRadius: colors.radius, marginTop: 16 }]}
            onPress={handleVerify}
            disabled={verifyOtpMutation.isPending || otp.join("").length < 4}
          >
            {verifyOtpMutation.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Onayla ve Kayıt Ol</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.resendBtn}
            onPress={handleSendOtp}
            disabled={sendOtpMutation.isPending}
          >
            <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
              Kod gelmedi mi?{" "}
              {sendOtpMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={{ color: colors.primary }}>Tekrar Gönder</Text>
              )}
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.primary }]}>Kayıt Ol</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>JetKöy'e katıl</Text>
        </View>

        <View style={styles.form}>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Ad Soyad</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Ad Soyad"
              placeholderTextColor={colors.mutedForeground}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Telefon</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              placeholder="5XX XXX XX XX"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={handlePhoneChange}
              maxLength={13}
            />
          </View>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Araç Plakası</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              placeholder="34 ABC 123"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              value={plate}
              onChangeText={setPlate}
            />
          </View>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Şifre</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              placeholder="En az 6 karakter"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Pressable
            style={[styles.button, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={handleSendOtp}
            disabled={sendOtpMutation.isPending}
          >
            {sendOtpMutation.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <View style={styles.btnInner}>
                <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Kod Gönder</Text>
                <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
              </View>
            )}
          </Pressable>

          <Pressable style={styles.linkButton} onPress={() => router.push("/(auth)/login")}>
            <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
              Zaten hesabın var mı? <Text style={{ color: colors.primary }}>Giriş Yap</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 32 },
  backText: { fontSize: 15 },
  header: { marginBottom: 40, alignItems: "center" },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 8, textAlign: "center", lineHeight: 22 },
  form: { gap: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "500", marginBottom: 6 },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  button: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  buttonText: { fontSize: 16, fontWeight: "700" },
  linkButton: { marginTop: 16, alignItems: "center", padding: 8 },
  linkText: { fontSize: 14 },
  otpRow: { flexDirection: "row", gap: 12, justifyContent: "center", marginTop: 16 },
  otpBox: {
    width: 68,
    height: 72,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 28,
    fontWeight: "800",
  },
  devBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  devBannerText: { fontSize: 13 },
  resendBtn: { marginTop: 24, alignItems: "center", padding: 8 },
  resendText: { fontSize: 14 },
});
