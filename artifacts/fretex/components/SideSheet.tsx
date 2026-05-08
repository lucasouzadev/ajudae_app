import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet, Animated, ScrollView, Easing, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors, { fonts, shadows } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_FAQS } from "@/constants/mockData";

interface SideSheetProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = {
  cliente: [
    { step: "1", title: "Abra o mapa", sub: "Veja prestadores perto de você em tempo real" },
    { step: "2", title: "Escolha e solicite", sub: "Compare preços, veículos e avaliações" },
    { step: "3", title: "Acompanhe", sub: "Tracking ao vivo até a conclusão" },
    { step: "4", title: "Confirme e pague", sub: "PIN de segurança + foto do serviço" },
  ],
  prestador: [
    { step: "1", title: "Fique online", sub: "Ative a disponibilidade no app" },
    { step: "2", title: "Receba propostas", sub: "Veja distância, rota e valor líquido" },
    { step: "3", title: "Execute o serviço", sub: "Tracking + mensagens rápidas" },
    { step: "4", title: "Conclua e receba", sub: "Cliente informa PIN, pagamento libera" },
  ],
};

const HELP = {
  cliente: [
    { icon: "ticket" as const, label: "Meus Tickets", sub: "Reclamações abertas", color: "#FF5500" },
    { icon: "chatbubble" as const, label: "Chat de Suporte", sub: "Falar com nossa equipe", color: "#2563EB" },
    { icon: "star" as const, label: "Avaliar o App", sub: "Nos dê seu feedback", color: "#D97706" },
  ],
  prestador: [
    { icon: "ticket" as const, label: "Meus Tickets", sub: "Disputas e no-shows", color: "#FF5500" },
    { icon: "cash" as const, label: "Pagamentos", sub: "Histórico de repasses", color: "#16A34A", lib: "mc" as const },
    { icon: "trending-up" as const, label: "Meu Desempenho", sub: "Métricas e ranking", color: "#2563EB" },
    { icon: "chatbubble" as const, label: "Suporte Prestador", sub: "Canal exclusivo 24/7", color: "#D97706" },
  ],
};

const TAGLINE = {
  cliente: "Precisa de um frete, mudança ou entrega?",
  prestador: "Ganhe dinheiro ajudando na sua região",
};

const HEADER_LABEL = {
  cliente: "Central de Ajuda · Cliente",
  prestador: "Central de Ajuda · Prestador",
};

const SHEET_WIDTH = Math.min(320, Dimensions.get("window").width * 0.82);

export function SideSheet({ open, onClose }: SideSheetProps) {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const translateX = useRef(new Animated.Value(-SHEET_WIDTH - 20)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [expanded, setExpanded] = useState<number | null>(null);
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      translateX.stopAnimation();
      fade.stopAnimation();
      translateX.setValue(-SHEET_WIDTH - 20);
      fade.setValue(0);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(translateX, { toValue: 0, duration: 380, easing: Easing.bezier(0.32, 0.72, 0, 1), useNativeDriver: true }),
          Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }),
        ]).start();
      });
      return;
    }

    if (!mounted) return;

    translateX.stopAnimation();
    fade.stopAnimation();
    Animated.parallel([
      Animated.timing(translateX, { toValue: -SHEET_WIDTH - 20, duration: 280, easing: Easing.bezier(0.32, 0.72, 0, 1), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(() => {
      setMounted(false);
      setExpanded(null);
    });
  }, [open, mounted, translateX, fade]);

  const accent = role === "cliente" ? c.primary : c.blue;
  const accentEnd = role === "cliente" ? c.primaryDeep : "#60A5FA";
  const steps = STEPS[role];
  const help = HELP[role];
  const faqs = MOCK_FAQS[role];

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: c.card, width: SHEET_WIDTH, transform: [{ translateX }] },
          shadows.xl,
        ]}
      >
        <LinearGradient
          colors={[accent, accentEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="cube" size={22} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerBrand}>Ajudaê!</Text>
              <Text style={styles.headerLabel}>{HEADER_LABEL[role]}</Text>
            </View>
          </View>
          <Text style={styles.tagline}>{TAGLINE[role]}</Text>
        </LinearGradient>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
          {/* Como funciona */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <Text style={[styles.sectionLabel, { color: c.sub }]}>COMO FUNCIONA</Text>
            <View style={[styles.stepsBox, { backgroundColor: c.background, borderColor: c.border }]}>
              {steps.map((s, i) => (
                <View
                  key={i}
                  style={[
                    styles.stepRow,
                    i < steps.length - 1 && { borderBottomColor: c.borderLight, borderBottomWidth: 1 },
                  ]}
                >
                  <View style={[styles.stepNum, { backgroundColor: accent }]}>
                    <Text style={styles.stepNumText}>{s.step}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stepTitle, { color: c.text }]}>{s.title}</Text>
                    <Text style={[styles.stepSub, { color: c.softMuted }]}>{s.sub}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* FAQs */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <Text style={[styles.sectionLabel, { color: c.sub }]}>PERGUNTAS FREQUENTES</Text>
            {faqs.map((faq, i) => (
              <View key={i} style={[styles.faqItem, { backgroundColor: c.background, borderColor: c.border }]}>
                <Pressable
                  onPress={() => setExpanded(expanded === i ? null : i)}
                  style={styles.faqHead}
                >
                  <Text style={[styles.faqQ, { color: c.text }]}>{faq.q}</Text>
                  <Ionicons
                    name={expanded === i ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={c.softMuted}
                  />
                </Pressable>
                {expanded === i ? (
                  <Text style={[styles.faqA, { color: c.sub }]}>{faq.a}</Text>
                ) : null}
              </View>
            ))}
          </View>

          {/* Help */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <Text style={[styles.sectionLabel, { color: c.sub }]}>SUPORTE</Text>
            {help.map((item, i) => (
              <Pressable key={i} style={[styles.helpItem, { backgroundColor: c.background, borderColor: c.border }]}>
                <View style={[styles.helpIcon, { backgroundColor: `${item.color}22` }]}>
                  <Ionicons name={item.icon} size={16} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helpLabel, { color: c.text }]}>{item.label}</Text>
                  <Text style={[styles.helpSub, { color: c.softMuted }]}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.softMuted} />
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: c.borderLight }]}>
          <View style={[styles.footerIcon, { backgroundColor: accent }]}>
            <Ionicons name="cube" size={13} color="#fff" />
          </View>
          <Text style={[styles.footerText, { color: c.softMuted }]}>Ajudaê! · v0.7 Beta</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
  },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBrand: { color: "#fff", fontSize: 20, fontFamily: fonts.serif.extra },
  headerLabel: { color: "rgba(255,255,255,0.78)", fontSize: 11, fontFamily: fonts.sans.regular },
  tagline: { color: "rgba(255,255,255,0.92)", fontSize: 13, fontFamily: fonts.sans.regular, lineHeight: 19 },
  sectionLabel: {
    fontSize: 10,
    fontFamily: fonts.sans.bold,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  stepsBox: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  stepRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "flex-start",
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumText: { color: "#fff", fontSize: 11, fontFamily: fonts.serif.extra },
  stepTitle: { fontSize: 13, fontFamily: fonts.sans.bold },
  stepSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  faqItem: { borderRadius: 14, borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  faqHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 13,
    paddingHorizontal: 14,
    gap: 8,
  },
  faqQ: { flex: 1, fontSize: 13, fontFamily: fonts.sans.semibold },
  faqA: { fontSize: 12, fontFamily: fonts.sans.regular, lineHeight: 19, paddingHorizontal: 14, paddingBottom: 14 },
  helpItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
  },
  helpIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  helpLabel: { fontSize: 13, fontFamily: fonts.sans.semibold },
  helpSub: { fontSize: 11, fontFamily: fonts.sans.regular },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  footerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: { fontSize: 11, fontFamily: fonts.sans.regular },
});
