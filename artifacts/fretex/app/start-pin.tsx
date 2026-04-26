import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import colors, { fonts, shadows } from "@/constants/colors";
import { useService } from "@/contexts/ServiceContext";

const PIN_EXPIRY_MS = 10 * 60 * 1000;

export default function StartPinScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { active, generateStartPin } = useService();

  const [pin, setPin] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [remaining, setRemaining] = useState(PIN_EXPIRY_MS);
  const [generating, setGenerating] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const pulse = useRef(new Animated.Value(1)).current;

  // Watch for client confirmation
  useEffect(() => {
    if (active?.status === "in_progress" && !confirmed) {
      setConfirmed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => router.replace("/job"), 1200);
    }
  }, [active?.status]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const left = expiresAt.getTime() - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Waiting pulse animation
  useEffect(() => {
    if (!pin || confirmed) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pin, confirmed]);

  const accent = active?.category === "Mudança" ? c.primary : active?.category === "Frete" ? c.blue : c.success;
  const accentText = accent === c.primary ? "#8B6F00" : "#fff";

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const expired = remaining === 0 && !!pin;
  const digits = pin ? pin.split("") : [];

  const handleGenerate = async () => {
    if (generating || limitReached) return;
    setGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const result = await generateStartPin();
    if (result.limitReached) {
      setLimitReached(true);
    } else if (result.ok) {
      setPin(result.pin);
      setExpiresAt(new Date(result.expiresAt));
      setRemaining(PIN_EXPIRY_MS);
    }
    setGenerating(false);
  };

  if (!active) {
    return (
      <View style={[styles.wrap, { backgroundColor: c.background, paddingTop: insets.top + 60 }]}>
        <Text style={[styles.emptyTitle, { color: c.text }]}>Sem serviço ativo</Text>
        <Pressable onPress={() => router.replace("/")} style={[styles.btn, { backgroundColor: accent }]}>
          <Text style={styles.btnTxt}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name="chevron-back" size={18} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>PIN de Início</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        {!pin ? (
          /* ─── Phase 1: Generate ─── */
          <>
            <LinearGradient
              colors={[accent, accent + "CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.iconCircle, shadows.md]}
            >
              <Ionicons name="location" size={34} color={accentText === "#fff" ? "#fff" : "#1A1714"} />
            </LinearGradient>

            <Text style={[styles.title, { color: c.text }]}>Você chegou ao local?</Text>
            <Text style={[styles.subtitle, { color: c.softMuted }]}>
              Gere o PIN de Início e mostre ao cliente para confirmar o começo do serviço.
            </Text>

            <View style={[styles.infoCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
              <View style={styles.infoRow}>
                <Ionicons name="shield-checkmark" size={16} color={c.success} />
                <Text style={[styles.infoTxt, { color: c.text }]}>O cliente precisa confirmar para o serviço iniciar</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: c.borderLight }]} />
              <View style={styles.infoRow}>
                <Ionicons name="time" size={16} color={c.blue} />
                <Text style={[styles.infoTxt, { color: c.text }]}>PIN válido por 10 minutos</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: c.borderLight }]} />
              <View style={styles.infoRow}>
                <Ionicons name="refresh" size={16} color={c.softMuted} />
                <Text style={[styles.infoTxt, { color: c.text }]}>Pode regenerar até 3 vezes</Text>
              </View>
            </View>

            {limitReached ? (
              <View style={[styles.errorBox, { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" }]}>
                <Ionicons name="alert-circle" size={16} color={c.destructive} />
                <Text style={[styles.errorTxt, { color: c.destructive }]}>
                  Limite de gerações atingido. Entre em contato com o suporte.
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={handleGenerate}
                disabled={generating}
                style={[styles.btn, { backgroundColor: accent, opacity: generating ? 0.7 : 1 }, shadows.md]}
              >
                <Ionicons name="key" size={16} color={accentText === "#fff" ? "#fff" : "#1A1714"} />
                <Text style={[styles.btnTxt, { color: accentText === "#fff" ? "#fff" : "#1A1714" }]}>
                  {generating ? "Gerando..." : "Gerar PIN de Início"}
                </Text>
              </Pressable>
            )}
          </>
        ) : confirmed ? (
          /* ─── Phase 3: Confirmed ─── */
          <>
            <LinearGradient
              colors={[c.success, "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.iconCircle, shadows.md]}
            >
              <Ionicons name="checkmark-circle" size={34} color="#fff" />
            </LinearGradient>
            <Text style={[styles.title, { color: c.text }]}>Serviço iniciado!</Text>
            <Text style={[styles.subtitle, { color: c.softMuted }]}>
              O cliente confirmou. Voltando para o painel do serviço...
            </Text>
          </>
        ) : (
          /* ─── Phase 2: Waiting ─── */
          <>
            <Text style={[styles.instructionLabel, { color: c.softMuted }]}>MOSTRE ESTE CÓDIGO AO CLIENTE</Text>

            {/* PIN display */}
            <Animated.View style={[styles.pinDisplay, { transform: [{ scale: pulse }] }]}>
              {digits.map((d, i) => (
                <View
                  key={i}
                  style={[
                    styles.pinSlot,
                    {
                      backgroundColor: expired ? "#FEE2E2" : `${accent}15`,
                      borderColor: expired ? c.destructive : accent,
                    },
                  ]}
                >
                  <Text style={[styles.pinDigit, { color: expired ? c.destructive : accent === c.primary ? "#8B6F00" : accent }]}>
                    {d}
                  </Text>
                </View>
              ))}
            </Animated.View>

            {/* Timer */}
            <View style={[styles.timerRow, { backgroundColor: expired ? "#FEE2E2" : c.card, borderColor: expired ? "#FCA5A5" : c.border }]}>
              <Ionicons name={expired ? "alert-circle" : "time"} size={14} color={expired ? c.destructive : c.blue} />
              <Text style={[styles.timerTxt, { color: expired ? c.destructive : c.blue }]}>
                {expired
                  ? "PIN expirado — regenere abaixo"
                  : `Expira em ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
              </Text>
            </View>

            {!expired ? (
              <View style={[styles.waitingCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
                <View style={[styles.waitDot, { backgroundColor: c.success }]} />
                <Text style={[styles.waitTxt, { color: c.text }]}>Aguardando o cliente confirmar o código...</Text>
              </View>
            ) : null}

            {/* Regenerate */}
            {(expired || active.startPinGenCount < 3) ? (
              <Pressable
                onPress={handleGenerate}
                disabled={generating || limitReached}
                style={[styles.regenBtn, { borderColor: c.border, backgroundColor: c.card }]}
              >
                <Ionicons name="refresh" size={14} color={c.sub} />
                <Text style={[styles.regenTxt, { color: c.sub }]}>
                  {generating ? "Gerando..." : `Regenerar PIN (${3 - active.startPinGenCount} restantes)`}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 14, fontFamily: fonts.sans.bold },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 0 },
  iconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title: { fontSize: 24, fontFamily: fonts.serif.extra, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 13, fontFamily: fonts.sans.regular, textAlign: "center", lineHeight: 19, marginBottom: 24, paddingHorizontal: 8 },
  infoCard: { borderRadius: 16, borderWidth: 1, padding: 16, alignSelf: "stretch", marginBottom: 24, gap: 0 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  infoTxt: { flex: 1, fontSize: 13, fontFamily: fonts.sans.medium },
  divider: { height: 1, marginVertical: 0 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    alignSelf: "stretch",
  },
  btnTxt: { fontSize: 14, fontFamily: fonts.sans.bold },
  errorBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "stretch",
  },
  errorTxt: { flex: 1, fontSize: 12, fontFamily: fonts.sans.semibold, lineHeight: 17 },
  instructionLabel: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 1.2, marginBottom: 18 },
  pinDisplay: { flexDirection: "row", gap: 10, marginBottom: 20 },
  pinSlot: { width: 60, height: 72, borderRadius: 16, borderWidth: 2.5, alignItems: "center", justifyContent: "center" },
  pinDigit: { fontSize: 34, fontFamily: fonts.serif.extra },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 18,
  },
  timerTxt: { fontSize: 12, fontFamily: fonts.sans.bold },
  waitingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: "stretch",
    marginBottom: 18,
  },
  waitDot: { width: 8, height: 8, borderRadius: 4 },
  waitTxt: { flex: 1, fontSize: 13, fontFamily: fonts.sans.medium },
  regenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "stretch",
  },
  regenTxt: { fontSize: 12, fontFamily: fonts.sans.semibold },
  emptyTitle: { fontSize: 17, fontFamily: fonts.sans.bold, marginBottom: 16 },
});
