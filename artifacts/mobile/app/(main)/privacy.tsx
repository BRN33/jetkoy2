import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function PrivacyScreen() {
  const colors = useColors();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>Gizlilik Politikasi</Text>
      <Text style={[styles.updated, { color: colors.mutedForeground }]}>Son guncelleme: Mayis 2025</Text>

      <Section title="1. Toplanan Veriler" colors={colors}>
        JetKoy uygulamasi asagidaki bilgileri toplar:{"\n\n"}
        - Ad soyad, telefon numarasi ve arac plakasi (kayit sirasinda){"\n"}
        - Paylasilan ve kaptaniniz is bilgileri{"\n"}
        - Uygulama kullanim istatistikleri{"\n"}
        - Push bildirim tokeni (bildirim izni verildiyse)
      </Section>

      <Section title="2. Verilerin Kullanimi" colors={colors}>
        Toplanan veriler yalnizca uygulamanin calistirilmasi, kullanicilarin birbirini tanimasi ve is paylasiminin saglanmasi amacli kullanilir. Verileriniz ucuncu taraflarla paylasilmaz veya satilmaz.
      </Section>

      <Section title="3. Veri Guvenligi" colors={colors}>
        Sifreler bcrypt ile sifrelenerek saklanir. Tum API baglantilari HTTPS uzerinden gerceklesir. Yolcu telefon numaralari is kapatilana kadar diger kullanicilara gizlenir.
      </Section>

      <Section title="4. Veri Saklama" colors={colors}>
        Hesabinizi sildiginizde, kisisel verileriniz kalici olarak silinir. Admin mesajlari 12 saat sonra otomatik silinir.
      </Section>

      <Section title="5. Iletisim" colors={colors}>
        Gizlilik ile ilgili sorulariniz icin uygulama icindeki mesajlasma ozelligi veya yetkili yoneticiniz araciligiyla bize ulasabilirsiniz.
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
