import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import colors, { fonts, shadows } from "@/constants/colors";
import { useService } from "@/contexts/ServiceContext";

export default function StartPinScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { active } = useService();
  const pulse = useRef(new Animated.Value(1)).current;

  const confirmed = active?.status === "in_progress";
  const accent = active?.category === "Mudança" ? c.primary : active?.category === "Frete" ? c.blue : c.success;

  // Navigate to /job when client confirms
  useEffect(() => {
    if (active?.status === "in_progress") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => router.replace("/job"), 1200);
    }
  }, [active?.status]);

  // Pulse animation on PIN digits
  useEffect(() => {
    if (confirmed) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [confirmed]);

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

  const digits = active.pin_start.split("");

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
        {confirmed ? (
          /* ─── Confirmed ─── */
          <>
            <LinearGradient colors={[c.success, "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.iconCircle, shadows.md]}>
              <Ionicons name="checkmark-circle" size={34} color="#fff" />
            </LinearGradient>
            <Text style={[styles.title, { color: c.text }]}>Serviço iniciado!</Text>
            <Text style={[styles.subtitle, { color: c.softMuted }]}>O cliente confirmou. Voltando para o painel...</Text>
          </>
        ) : (
          /* ─── Waiting for client ─── */
          <>
            <Text style={[styles.instructionLabel, { color: c.softMuted }]}>MOSTRE ESTE CÓDIGO AO CLIENTE</Text>

            <Animated.View style={[styles.pinDisplay, { transform: [{ scale: pulse }] }]}>
              {digits.map((d, i) => (
                <View key={i} style={[styles.pinSlot, { backgroundColor: `${accent}15`, borderColor: accent }]}>
                  <Text style={[styles.pinDigit, { color: accent === c.primary ? "#8B6F00" : accent }]}>{d}</Text>
                </View>
              ))}
            </Animated.View>

            <View style={[styles.waitingCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
              <View style={[styles.waitDot, { backgroundColor: c.success }]} />
              <Text style={[styles.waitTxt, { color: c.text }]}>Aguardando o cliente confirmar o código...</Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
              <View style={styles.infoRow}>
                <Ionicons name="shield-checkmark" size={16} color={c.success} />
                <Text style={[styles.infoTxt, { color: c.text }]}>O cliente precisa confirmar para o serviço iniciar</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: c.borderLight }]} />
              <View style={styles.infoRow}>
                <Ionicons name="wifi-outline" size={16} color={c.blue} />
                <Text style={[styles.infoTxt, { color: c.text }]}>Funciona sem internet — verificação é local</Text>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 14, fontFamily: fonts.sans.bold },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 0 },
  iconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title: { fontSize: 24, fontFamily: fonts.serif.extra, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 13, fontFamily: fonts.sans.regular, textAlign: "center", lineHeight: 19, marginBottom: 24, paddingHorizontal: 8 },
  instructionLabel: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 1.2, marginBottom: 18 },
  pinDisplay: { flexDirection: "row", gap: 10, marginBottom: 24 },
  pinSlot: { width: 60, height: 72, borderRadius: 16, borderWidth: 2.5, alignItems: "center", justifyContent: "center" },
  pinDigit: { fontSize: 34, fontFamily: fonts.serif.extra },
  waitingCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, alignSelf: "stretch", marginBottom: 16 },
  waitDot: { width: 8, height: 8, borderRadius: 4 },
  waitTxt: { flex: 1, fontSize: 13, fontFamily: fonts.sans.medium },
  infoCard: { borderRadius: 16, borderWidth: 1, padding: 16, alignSelf: "stretch" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  infoTxt: { flex: 1, fontSize: 13, fontFamily: fonts.sans.medium },
  divider: { height: 1 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 14, alignSelf: "stretch" },
  btnTxt: { fontSize: 14, fontFamily: fonts.sans.bold, color: "#fff" },
  emptyTitle: { fontSize: 17, fontFamily: fonts.sans.bold, marginBottom: 16 },
});
