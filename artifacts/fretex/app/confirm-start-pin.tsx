import React, { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, Keyboard, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import colors, { fonts, shadows } from "@/constants/colors";
import { useService } from "@/contexts/ServiceContext";

export default function ConfirmStartPinScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { active, validateStartPin } = useService();
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const accent = active?.category === "Mudança" ? c.primary : active?.category === "Frete" ? c.blue : c.success;
  const code = digits.join("");
  const complete = code.length === 4;

  const setDigitAt = (i: number, val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(-1);
    setError(null);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = cleaned;
      return next;
    });
    if (cleaned && i < 3) inputs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, key: string) => {
    if (key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const submit = async () => {
    if (!complete || submitting) return;
    setSubmitting(true);
    Keyboard.dismiss();
    const result = await validateStartPin(code);
    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace("/track");
    } else if (result.expired) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError("Este PIN expirou. Peça ao prestador para gerar um novo.");
      setDigits(["", "", "", ""]);
      inputs.current[0]?.focus();
      setSubmitting(false);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setError("Código incorreto. Confirme com o prestador e tente novamente.");
      setDigits(["", "", "", ""]);
      inputs.current[0]?.focus();
      setSubmitting(false);
    }
  };

  if (!active) {
    return (
      <View style={[styles.wrap, { backgroundColor: c.background, paddingTop: insets.top + 60 }]}>
        <Text style={[styles.title, { color: c.text }]}>Nenhum pedido ativo</Text>
        <Pressable onPress={() => router.replace("/")} style={[styles.btn, { backgroundColor: c.primary, marginTop: 20 }]}>
          <Text style={[styles.btnTxt, { color: "#1A1714" }]}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.wrap, { backgroundColor: c.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name="chevron-back" size={18} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>Confirmar início</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[accent, accent + "DD"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.iconBig, shadows.md]}
        >
          <Ionicons name="shield-checkmark" size={32} color={accent === c.primary ? "#1A1714" : "#fff"} />
        </LinearGradient>

        <Text style={[styles.title, { color: c.text }]}>Prestador chegou!</Text>
        <Text style={[styles.subtitle, { color: c.softMuted }]}>
          Digite o código de 4 dígitos que o prestador está mostrando para confirmar o início do serviço.
        </Text>

        {/* 4-digit input */}
        <View style={styles.pinRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              value={d}
              onChangeText={(v) => setDigitAt(i, v)}
              onKeyPress={({ nativeEvent }) => handleKey(i, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={i === 0}
              style={[
                styles.pinSlot,
                {
                  backgroundColor: c.card,
                  borderColor: error ? c.destructive : d ? accent : c.border,
                  color: c.text,
                },
              ]}
            />
          ))}
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" }]}>
            <Ionicons name="alert-circle" size={14} color={c.destructive} />
            <Text style={[styles.errorTxt, { color: c.destructive }]}>{error}</Text>
          </View>
        ) : (
          <View style={[styles.helpBox, { backgroundColor: `${accent}12`, borderColor: `${accent}33` }]}>
            <Ionicons name="information-circle" size={14} color={accent} />
            <Text style={[styles.helpTxt, { color: c.text }]}>
              Ao confirmar, o serviço começa oficialmente. Você não poderá cancelar sem custo após essa etapa.
            </Text>
          </View>
        )}

        <Pressable
          onPress={submit}
          disabled={!complete || submitting}
          style={[
            styles.btn,
            { backgroundColor: complete ? accent : c.borderLight, opacity: submitting ? 0.7 : 1 },
            shadows.md,
          ]}
        >
          <Ionicons name="play-circle" size={16} color={complete && accent === c.primary ? "#1A1714" : "#fff"} />
          <Text style={[styles.btnTxt, { color: complete && accent === c.primary ? "#1A1714" : "#fff" }]}>
            {submitting ? "Confirmando..." : "Confirmar e iniciar serviço"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  content: { flexGrow: 1, padding: 24, alignItems: "center", justifyContent: "center" },
  iconBig: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title: { fontSize: 24, fontFamily: fonts.serif.extra, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 13, fontFamily: fonts.sans.regular, textAlign: "center", marginBottom: 28, lineHeight: 19, paddingHorizontal: 12 },
  pinRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  pinSlot: { width: 56, height: 68, borderRadius: 14, borderWidth: 2, fontSize: 28, fontFamily: fonts.serif.extra, textAlign: "center" },
  errorBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 18, alignSelf: "stretch" },
  errorTxt: { flex: 1, fontSize: 12, fontFamily: fonts.sans.semibold, lineHeight: 17 },
  helpBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 18, alignSelf: "stretch" },
  helpTxt: { flex: 1, fontSize: 11, fontFamily: fonts.sans.medium, lineHeight: 15 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 14, alignSelf: "stretch", marginTop: 4 },
  btnTxt: { fontSize: 14, fontFamily: fonts.sans.bold },
});
