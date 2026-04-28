import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import colors, { fonts, shadows } from "@/constants/colors";
import { useService } from "@/contexts/ServiceContext";

const STAR_LABELS = ["Péssimo", "Ruim", "Regular", "Bom", "Excelente"];

export default function RateScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { active, clear } = useService();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!active) {
    return (
      <View style={[styles.empty, { backgroundColor: c.background, paddingTop: insets.top + 60 }]}>
        <Text style={[styles.title, { color: c.text }]}>Sem pedido para avaliar</Text>
        <Pressable onPress={() => router.replace("/")} style={[styles.btn, { backgroundColor: c.primary, marginTop: 20 }]}>
          <Text style={styles.btnTxt}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const accent = active.category === "Mudança" ? c.primary : active.category === "Frete" ? c.blue : c.success;

  const submit = async () => {
    if (stars === 0) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(async () => {
      await clear();
      router.replace("/");
    }, 600);
  };

  const skip = async () => {
    await clear();
    router.replace("/");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.wrap, { backgroundColor: c.background, paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={[styles.headerTitle, { color: c.text }]}>Avaliar serviço</Text>
        <Pressable onPress={skip} style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name="close" size={18} color={c.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 140 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.providerBox, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <LinearGradient
            colors={[active.providerColor || accent, (active.providerColor || accent) + "AA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarTxt}>{active.providerInitials || "PR"}</Text>
          </LinearGradient>
          <Text style={[styles.providerName, { color: c.text }]}>{active.providerName || "Prestador"}</Text>
          <Text style={[styles.providerSub, { color: c.softMuted }]}>{active.category} · concluído</Text>
        </View>

        <Text style={[styles.question, { color: c.text }]}>Como foi o serviço?</Text>
        <Text style={[styles.questionSub, { color: c.softMuted }]}>Sua nota ajuda outros clientes a escolher.</Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => {
                setStars(n);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }}
              style={styles.star}
            >
              <Ionicons name={n <= stars ? "star" : "star-outline"} size={42} color={n <= stars ? c.warning : c.borderLight} />
            </Pressable>
          ))}
        </View>
        {stars > 0 ? (
          <Text style={[styles.starLabel, { color: accent }]}>{STAR_LABELS[stars - 1]}</Text>
        ) : (
          <Text style={[styles.starLabel, { color: c.softMuted }]}>Toque nas estrelas</Text>
        )}

        <Text style={[styles.label, { color: c.softMuted, marginTop: 28 }]}>COMENTÁRIO (OPCIONAL)</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
          placeholder="Conte como foi a experiência…"
          placeholderTextColor={c.softMuted}
          multiline
          maxLength={300}
          value={comment}
          onChangeText={setComment}
        />
        <Text style={[styles.helper, { color: c.softMuted }]}>{comment.length}/300</Text>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: c.card, borderTopColor: c.borderLight, paddingBottom: insets.bottom + 14 }]}>
        <Pressable onPress={skip} style={[styles.skipBtn, { backgroundColor: c.background, borderColor: c.border }]}>
          <Text style={[styles.skipTxt, { color: c.sub }]}>Pular</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={stars === 0 || submitting}
          style={[styles.btn, { backgroundColor: stars > 0 ? accent : c.borderLight, opacity: submitting ? 0.7 : 1, flex: 1 }, shadows.md]}
        >
          <Ionicons name="send" size={15} color="#fff" />
          <Text style={styles.btnTxt}>{submitting ? "Enviando..." : "Enviar avaliação"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", padding: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 14, fontFamily: fonts.sans.bold },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  providerBox: { padding: 18, borderRadius: 18, borderWidth: 1, alignItems: "center", marginBottom: 28 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarTxt: { color: "#fff", fontSize: 22, fontFamily: fonts.serif.extra },
  providerName: { fontSize: 17, fontFamily: fonts.sans.bold },
  providerSub: { fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 4 },

  title: { fontSize: 20, fontFamily: fonts.serif.extra },
  question: { fontSize: 22, fontFamily: fonts.serif.extra, textAlign: "center" },
  questionSub: { fontSize: 13, fontFamily: fonts.sans.regular, textAlign: "center", marginTop: 4 },

  starsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 22 },
  star: { padding: 4 },
  starLabel: { fontSize: 14, fontFamily: fonts.sans.bold, textAlign: "center", marginTop: 8 },

  label: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8, marginBottom: 6 },
  textArea: { minHeight: 100, borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 13, fontFamily: fonts.sans.regular, textAlignVertical: "top" },
  helper: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 4, textAlign: "right" },

  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, borderTopWidth: 1, flexDirection: "row", gap: 8 },
  skipBtn: { paddingHorizontal: 18, height: 50, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  skipTxt: { fontSize: 13, fontFamily: fonts.sans.bold },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 14, paddingHorizontal: 18 },
  btnTxt: { color: "#fff", fontSize: 14, fontFamily: fonts.sans.bold },
});
