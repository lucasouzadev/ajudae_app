import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import colors, { fonts, shadows } from "@/constants/colors";
import { useService } from "@/contexts/ServiceContext";

export default function OtpModalScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { active } = useService();

  if (!active) {
    return (
      <View style={[styles.wrap, { backgroundColor: c.background, paddingTop: insets.top + 24 }]}>
        <Text style={[styles.title, { color: c.text }]}>Sem pedido ativo</Text>
        <Pressable onPress={() => router.replace("/")} style={[styles.button, { backgroundColor: c.primary }]}>
          <Text style={styles.buttonTxt}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const accent = active.category === "Mudança" ? c.primary : active.category === "Frete" ? c.blue : c.success;
  const digits = active.otp.split("");

  const acknowledge = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace("/track");
  };

  return (
    <View style={[styles.wrap, { backgroundColor: c.overlay }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.modal, { backgroundColor: c.card }, shadows.xl]}>
          <View style={[styles.iconBig, { backgroundColor: `${accent}18` }]}>
            <Ionicons name="key" size={32} color={accent} />
          </View>

          <Text style={[styles.title, { color: c.text }]}>Guarde este código!</Text>
          <Text style={[styles.subtitle, { color: c.softMuted }]}>
            O prestador vai pedir este PIN no final do serviço para confirmar a conclusão.
          </Text>

          <LinearGradient
            colors={[`${accent}10`, `${accent}05`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.pinBox, { borderColor: `${accent}55` }]}
          >
            <Text style={[styles.pinLabel, { color: accent }]}>SEU PIN DE CONCLUSÃO</Text>
            <View style={styles.pinDigits}>
              {digits.map((d, i) => (
                <View key={i} style={[styles.pinSlot, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[styles.pinDigit, { color: c.text }]}>{d}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          <View style={[styles.warnBox, { backgroundColor: c.warningLight, borderColor: `${c.warning}66` }]}>
            <Ionicons name="alert-circle" size={16} color={c.warning} />
            <Text style={[styles.warnText, { color: c.text }]}>
              Este PIN aparece <Text style={{ fontFamily: fonts.sans.bold }}>uma única vez</Text>. Se perder, peça à equipe Ajudaê para gerar outro.
            </Text>
          </View>

          <View style={styles.bullets}>
            <Bullet icon="lock-closed" text="Não compartilhe com ninguém antes da entrega" c={c} />
            <Bullet icon="phone-portrait" text="Anote no celular ou tire um print desta tela" c={c} />
            <Bullet icon="shield-checkmark" text="Só informe quando o serviço estiver realmente concluído" c={c} />
          </View>

          <Pressable
            onPress={acknowledge}
            style={[styles.button, { backgroundColor: accent }, shadows.md]}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.buttonTxt}>Entendi, vou guardar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Bullet({ icon, text, c }: { icon: any; text: string; c: any }) {
  return (
    <View style={styles.bullet}>
      <Ionicons name={icon} size={14} color={c.softMuted} />
      <Text style={[styles.bulletTxt, { color: c.sub }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  scroll: { paddingHorizontal: 16, flexGrow: 1, justifyContent: "center" },
  modal: { borderRadius: 24, padding: 24, alignItems: "center" },
  iconBig: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  title: { fontSize: 24, fontFamily: fonts.serif.extra, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 13, fontFamily: fonts.sans.regular, textAlign: "center", marginBottom: 22, lineHeight: 19, paddingHorizontal: 8 },
  pinBox: { width: "100%", padding: 18, borderRadius: 18, borderWidth: 1.5, alignItems: "center", marginBottom: 18 },
  pinLabel: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 1.4, marginBottom: 12 },
  pinDigits: { flexDirection: "row", gap: 8 },
  pinSlot: { width: 38, height: 50, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  pinDigit: { fontSize: 22, fontFamily: fonts.serif.extra },
  warnBox: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 12, borderRadius: 12, borderWidth: 1, width: "100%", marginBottom: 18 },
  warnText: { flex: 1, fontSize: 11, fontFamily: fonts.sans.medium, lineHeight: 15 },
  bullets: { width: "100%", gap: 8, marginBottom: 22 },
  bullet: { flexDirection: "row", gap: 8, alignItems: "center" },
  bulletTxt: { fontSize: 12, fontFamily: fonts.sans.medium, flex: 1 },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 14, width: "100%" },
  buttonTxt: { color: "#fff", fontSize: 14, fontFamily: fonts.sans.bold },
});
