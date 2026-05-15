import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Link, router } from "expo-router";
import { useLoginUser } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const loginMutation = useLoginUser();

  const handleLogin = () => {
    if (!phone || !password) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }
    loginMutation.mutate(
      { data: { phone, password } },
      {
        onSuccess: async (data) => {
          await login(data.token, data.user);
          router.replace("/(main)");
        },
        onError: (error: any) => {
          Alert.alert("Hata", error?.message || "Giriş yapılamadı.");
        },
      }
    );
  };

  return (
    <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.primary }]}>JetKöy</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Sürücü Girişi</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Telefon Numarası"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Şifre"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            style={[styles.button, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={handleLogin}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Giriş Yap</Text>
            )}
          </Pressable>

          <Link href="/(auth)/register" asChild>
            <Pressable style={styles.linkButton}>
              <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
                Hesabın yok mu? <Text style={{ color: colors.primary }}>Kayıt Ol</Text>
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  header: { marginBottom: 48, alignItems: "center" },
  title: { fontSize: 48, fontWeight: "900", letterSpacing: -1 },
  subtitle: { fontSize: 16, marginTop: 8 },
  form: { gap: 16 },
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
  buttonText: { fontSize: 16, fontWeight: "700" },
  linkButton: { marginTop: 16, alignItems: "center", padding: 8 },
  linkText: { fontSize: 14 },
});