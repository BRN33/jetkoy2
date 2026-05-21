import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function TermsScreen() {
  const colors = useColors();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>Kullanım Koşulları</Text>
      <Text style={[styles.updated, { color: colors.mutedForeground }]}>Son güncelleme: Mayıs 2025</Text>

      <Section title="1. Hizmet Tanımı" colors={colors}>
        JetKöy, sürücülerin birbirleriyle iş paylaşmasını ve koordineli şekilde çalışmasını sağlayan bir mobil platformdur. Uygulama, sürücüler arasında iş organizasyonu amacıyla sunulmaktadır.
      </Section>

      <Section title="2. Kullanıcı Sorumluluğu" colors={colors}>
        - Kayıt sırasında doğru ve eksiksiz bilgi vermek zorundasınız.{"\n"}
        - Hesabınızın güvenliği sizin sorumluluğunuzdadır.{"\n"}
        - Platformu yasadışı veya sahte işlemler için kullanamazsınız.{"\n"}
        - Diğer kullanıcılara karşı saygı çerçevesinde davranmak zorundasınız.
      </Section>

      <Section title="3. Kredi Sistemi" colors={colors}>
        Her iş kapma işlemi 10 kredi (TL) düşer. Yetersiz bakiyede iş kaptırılamaz. Krediler iade edilmez; ancak yönetici takdirine göre ayarlama yapılabilir.
      </Section>

      <Section title="4. VIP Üyelik" colors={colors}>
        VIP üyeler yeni işleri 10 saniye önceden görerek avantaj elde eder. VIP statüsü yönetici tarafından verilir ve geri alınabilir.
      </Section>

      <Section title="5. Hesap Askıya Alma ve Silme" colors={colors}>
        Kurallara aykırı davranışın tespit edilmesi halinde hesabınız uyarı verilmeksizin askıya alınabilir ya da silinebilir. Hesabınızı kendiniz de silebilirsiniz; bu durumda tüm verileriniz kalıcı olarak kaldırılır.
      </Section>

      <Section title="6. Koşullarda Değişiklik" colors={colors}>
        Bu koşullar zaman zaman güncellenebilir. Önemli değişiklikler uygulama içinde bildirilecektir. Uygulamayı kullanmaya devam etmeniz güncel koşulları kabul ettiğiniz anlamına gelir.
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
