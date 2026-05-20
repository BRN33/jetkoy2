import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function TermsScreen() {
  const colors = useColors();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>Kullanim Kosullari</Text>
      <Text style={[styles.updated, { color: colors.mutedForeground }]}>Son guncelleme: Mayis 2025</Text>

      <Section title="1. Hizmet Tanimi" colors={colors}>
        JetKoy, suruculerin birbirleriyle is paylasmasini ve koordineli sekilde calismasini saglayan bir mobil platformdur. Uygulama, suruculer arasinda is organizasyonu amaciyla sunulmaktadir.
      </Section>

      <Section title="2. Kullanici Sorumlulugu" colors={colors}>
        - Kayit sirasinda dogru ve eksiksiz bilgi vermek zorundasiniz.{"\n"}
        - Hesabinizin guvenligi sizin sorumlulugundadir.{"\n"}
        - Platformu yasadisi veya sahte islemler icin kullanamazsiniz.{"\n"}
        - Diger kullanicilara karsi saygi cercevesinde davranmak zorundasiniz.
      </Section>

      <Section title="3. Kredi Sistemi" colors={colors}>
        Her is kapma islemi 10 kredi (TL) duser. Yetersiz bakiyede is kaptirilamaz. Krediler iade edilmez; ancak yonetici takdirine gore ayarlama yapilabilir.
      </Section>

      <Section title="4. VIP Uyelik" colors={colors}>
        VIP uyeler yeni isleri 10 saniye onceden gorerek avantaj elde eder. VIP statüsü yonetici tarafindan verilir ve geri alinabilir.
      </Section>

      <Section title="5. Hesap Askiya Alma ve Silme" colors={colors}>
        Kurallara aykiri davranisin tespit edilmesi halinde hesabiniz uyari verilmeksizin askiya alinabilir ya da silinebilir. Hesabinizi kendiniz de silebilirsiniz; bu durumda tum verileriniz kalici olarak kaldirilir.
      </Section>

      <Section title="6. Kosullarda Degisiklik" colors={colors}>
        Bu kosullar zaman zaman guncellenebilir. Onemli degisiklikler uygulama icinde bildirilecektir. Uygulamayi kullanmaya devam etmeniz guncel kosullari kabul ettiginiz anlamina gelir.
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
