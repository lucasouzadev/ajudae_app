import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, Image } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import colors, { fonts, shadows } from "@/constants/colors";
import { useSupport } from "@/contexts/SupportContext";
import { useService } from "@/contexts/ServiceContext";

const PHOTO_MOCKS = [
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=300&q=80",
  "https://images.unsplash.com/photo-1582719188393-bb71ca45dbb9?w=300&q=80",
  "https://images.unsplash.com/photo-1558959356-2f3631030929?w=300&q=80",
];

export default function TicketScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { active, openTicket } = useService();
  const { createTicket } = useSupport();
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const valid = description.trim().length >= 20;

  const togglePhoto = (uri: string) => {
    setPhotos((prev) => (prev.includes(uri) ? prev.filter((p) => p !== uri) : [...prev, uri]));
  };

  const submit = async () => {
    if (!valid) return;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const id = `tk-${Date.now()}`;
    await createTicket(active?.id || "geral", description);
    if (active) await openTicket(id);
    setTimeout(() => {
      setSent(true);
      setSubmitting(false);
    }, 400);
  };

  if (sent) {
    return (
      <View style={[styles.wrap, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <View style={styles.successBox}>
          <View style={[styles.successIcon, { backgroundColor: `${c.success}18` }]}>
            <Ionicons name="checkmark-circle" size={40} color={c.success} />
          </View>
          <Text style={[styles.successTitle, { color: c.text }]}>Ticket enviado</Text>
          <Text style={[styles.successSub, { color: c.softMuted }]}>
            Nossa equipe entrará em contato em até 4 horas. Você pode acompanhar pelo seu pedido.
          </Text>
          <Pressable onPress={() => router.replace("/track")} style={[styles.btn, { backgroundColor: c.primary, marginTop: 24 }]}>
            <Text style={styles.btnTxt}>Voltar ao pedido</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name="close" size={18} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>Abrir ticket</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 130 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {active ? (
          <View style={[styles.refCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="document-text" size={16} color={c.softMuted} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.refLabel, { color: c.softMuted }]}>PEDIDO RELACIONADO</Text>
              <Text style={[styles.refValue, { color: c.text }]}>
                #{active.id.slice(-6).toUpperCase()} · {active.category}
              </Text>
            </View>
          </View>
        ) : null}

        <Text style={[styles.title, { color: c.text }]}>Descreva o problema</Text>
        <Text style={[styles.subtitle, { color: c.softMuted }]}>
          Quanto mais detalhes, mais rápido nossa equipe consegue ajudar.
        </Text>

        <Text style={[styles.label, { color: c.softMuted }]}>O QUE ACONTECEU? <Text style={{ color: c.destructive }}>*</Text></Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: c.card, borderColor: valid || description.length === 0 ? c.border : c.destructive, color: c.text }]}
          placeholder="Ex: O prestador ainda não chegou e já passou do horário combinado…"
          placeholderTextColor={c.softMuted}
          multiline
          numberOfLines={6}
          value={description}
          onChangeText={setDescription}
        />
        <Text style={[styles.helper, { color: description.length >= 20 ? c.softMuted : c.destructive }]}>
          {description.length} caracteres · mínimo 20
        </Text>

        <Text style={[styles.label, { color: c.softMuted, marginTop: 18 }]}>EVIDÊNCIAS (OPCIONAL)</Text>
        <View style={styles.photoGrid}>
          {PHOTO_MOCKS.map((uri) => {
            const sel = photos.includes(uri);
            return (
              <Pressable
                key={uri}
                onPress={() => togglePhoto(uri)}
                style={[styles.photoTile, { borderColor: sel ? c.warning : c.border, borderWidth: sel ? 2 : 1 }]}
              >
                <Image source={{ uri }} style={styles.photoImg} />
                {sel ? (
                  <View style={[styles.photoCheck, { backgroundColor: c.warning }]}>
                    <Ionicons name="checkmark" size={11} color="#fff" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.infoBox, { backgroundColor: c.warningLight, borderColor: `${c.warning}66` }]}>
          <Ionicons name="information-circle" size={16} color={c.warning} />
          <Text style={[styles.infoTxt, { color: c.text }]}>
            Ao enviar, seu pedido entra em <Text style={{ fontFamily: fonts.sans.bold }}>análise</Text>. Nossa equipe responde em até 4h úteis.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: c.card, borderTopColor: c.borderLight, paddingBottom: insets.bottom + 14 }]}>
        <Pressable
          onPress={submit}
          disabled={!valid || submitting}
          style={[styles.btn, { backgroundColor: valid ? c.warning : c.borderLight, opacity: submitting ? 0.7 : 1 }, shadows.md]}
        >
          <Ionicons name="send" size={15} color="#fff" />
          <Text style={styles.btnTxt}>{submitting ? "Enviando..." : "Enviar ticket"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 14, fontFamily: fonts.sans.bold },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  refCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 18 },
  refLabel: { fontSize: 9, fontFamily: fonts.sans.bold, letterSpacing: 0.6 },
  refValue: { fontSize: 12, fontFamily: fonts.sans.bold, marginTop: 2 },

  title: { fontSize: 22, fontFamily: fonts.serif.extra, marginBottom: 4 },
  subtitle: { fontSize: 13, fontFamily: fonts.sans.regular, marginBottom: 18 },
  label: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8, marginBottom: 6 },
  textArea: { minHeight: 130, borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 13, fontFamily: fonts.sans.regular, textAlignVertical: "top" },
  helper: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 6 },

  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoTile: { width: 70, height: 70, borderRadius: 12, overflow: "hidden" },
  photoImg: { width: "100%", height: "100%" },
  photoCheck: { position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },

  infoBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 22 },
  infoTxt: { flex: 1, fontSize: 11, fontFamily: fonts.sans.medium, lineHeight: 15 },

  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, borderTopWidth: 1 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 14 },
  btnTxt: { color: "#fff", fontSize: 14, fontFamily: fonts.sans.bold },

  successBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  successTitle: { fontSize: 22, fontFamily: fonts.serif.extra, marginBottom: 8, textAlign: "center" },
  successSub: { fontSize: 13, fontFamily: fonts.sans.regular, textAlign: "center", lineHeight: 19 },
});
