import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function PrivacyScreen() {
  const colors = useColors();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>Gizlilik Politikası</Text>
      <Text style={[styles.updated, { color: colors.mutedForeground }]}>Son güncelleme: Mayıs 2025</Text>

      <Section title="1. Toplanan Veriler" colors={colors}>
        JetKöy uygulaması aşağıdaki bilgileri toplar:{"\n\n"}
        - Ad soyad, telefon numarası ve araç plakası (kayıt sırasında){"\n"}
        - Paylaştığınız ve Kaptığınız iş bilgileri{"\n"}
        - Uygulama kullanım istatistikleri{"\n"}
        - Push bildirim tokeni (bildirim izni verildiyse)
      </Section>

      <Section title="2. Verilerin Kullanımı" colors={colors}>
        Toplanan veriler yalnızca uygulamanın çalıştırılması, kullanıcıların birbirini tanıması ve iş paylaşımının sağlanması amacıyla kullanılır. Verileriniz üçüncü taraflarla paylaşılmaz veya satılmaz.
      </Section>

      <Section title="3. Veri Güvenliği" colors={colors}>
        Şifreler bcrypt ile şifrelenerek saklanır. Tüm API bağlantıları HTTPS üzerinden gerçekleşir. Yolcu telefon numaraları iş kapatılana kadar diğer kullanıcılara gizlenir.
      </Section>

      <Section title="4. Veri Saklama" colors={colors}>
        Hesabınızı sildiğinizde, kişisel verileriniz kalıcı olarak silinir. Admin mesajları 12 saat sonra otomatik silinir.
      </Section>

      <Section title="5. İletişim" colors={colors}>
        Gizlilik ile ilgili sorularınız için uygulama içindeki mesajlaşma özelliği veya yetkili yöneticiniz aracılığıyla bize ulaşabilirsiniz.
      </Section>
    </ScrollView>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 6 },
  updated: { fontSize: 13, marginBottom: 28 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 24 },
});
