import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors, { fonts, shadows } from "@/constants/colors";

const PHOTOS = [
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=400&q=80",
  "https://images.unsplash.com/photo-1582719188393-bb71ca45dbb9?w=400&q=80",
];

export default function RequestDetailsScreen() {
  const c = colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [accepting, setAccepting] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* Sheet handle */}
      <View style={styles.handleWrap}>
        <View style={[styles.handle, { backgroundColor: c.borderLight }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headRow}>
          <View>
            <Text style={[styles.eyebrow, { color: c.primary }]}>NOVA SOLICITAÇÃO</Text>
            <Text style={[styles.title, { color: c.text }]}>Mudança média</Text>
            <Text style={[styles.metaRow, { color: c.softMuted }]}>Recebida há 2 min · expira em 4:32</Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            style={[styles.closeBtn, { backgroundColor: c.card, borderColor: c.border }]}
          >
            <Ionicons name="close" size={18} color={c.text} />
          </Pressable>
        </View>

        {/* Earnings card */}
        <LinearGradient
          colors={[c.primary, c.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.earnCard, shadows.md]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.earnLabel}>VOCÊ RECEBE</Text>
            <Text style={styles.earnValue}>R$ 75,65</Text>
            <Text style={styles.earnSub}>R$ 89,00 bruto · taxa Ajudaê 15%</Text>
          </View>
          <View style={styles.earnBadge}>
            <Ionicons name="flash" size={16} color="#fff" />
            <Text style={styles.earnBadgeText}>Pague na hora</Text>
          </View>
        </LinearGradient>

        {/* Client */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <View style={styles.clientRow}>
            <LinearGradient colors={["#2563EB", "#60A5FA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
              <Text style={styles.avatarIni}>RA</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.clientName, { color: c.text }]}>Ricardo A.</Text>
              <View style={styles.clientStats}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={[styles.clientStatTxt, { color: c.softMuted }]}>4,9 · 18 serviços</Text>
                <View style={[styles.dot, { backgroundColor: c.softMuted }]} />
                <Text style={[styles.clientStatTxt, { color: c.success }]}>Verificado</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Route */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Text style={[styles.sectionLabel, { color: c.softMuted }]}>ROTA · 12,4 KM · ~38 MIN</Text>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: c.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.routeAddr, { color: c.text }]}>Rua Conde de Bonfim, 410</Text>
              <Text style={[styles.routeSub, { color: c.softMuted }]}>Tijuca · 3º andar (sem elevador)</Text>
            </View>
          </View>
          <View style={[styles.routeLine, { backgroundColor: c.borderLight }]} />
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: c.success }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.routeAddr, { color: c.text }]}>Av. das Américas, 5500</Text>
              <Text style={[styles.routeSub, { color: c.softMuted }]}>Barra · Bloco 3 · Apto 1204 (com elevador)</Text>
            </View>
          </View>
        </View>

        {/* Item details */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Text style={[styles.sectionLabel, { color: c.softMuted }]}>O QUE TRANSPORTAR</Text>
          <View style={styles.itemRow}>
            <View style={[styles.itemIcon, { backgroundColor: `${c.primary}18` }]}>
              <MaterialCommunityIcons name="sofa" size={22} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: c.text }]}>Sofá 3 lugares + 4 caixas + cama box + mesa</Text>
              <Text style={[styles.itemSub, { color: c.softMuted }]}>Volume estimado: ~3 m³ · ajudante incluso</Text>
            </View>
          </View>

          <View style={styles.photosRow}>
            {PHOTOS.map((uri) => (
              <Image key={uri} source={{ uri }} style={[styles.photo, { borderColor: c.borderLight }]} />
            ))}
            <View style={[styles.photo, styles.photoMore, { backgroundColor: c.background, borderColor: c.borderLight }]}>
              <Text style={[styles.photoMoreTxt, { color: c.softMuted }]}>+3</Text>
            </View>
          </View>

          <View style={[styles.notes, { backgroundColor: c.background, borderColor: c.borderLight }]}>
            <Ionicons name="chatbox-ellipses" size={14} color={c.softMuted} />
            <Text style={[styles.notesText, { color: c.text }]}>
              "Sofá precisa subir pelo elevador de serviço. Combinei com o porteiro às 15h."
            </Text>
          </View>
        </View>

        {/* Schedule + payment */}
        <View style={styles.gridRow}>
          <View style={[styles.gridCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
            <Ionicons name="calendar" size={18} color={c.primary} />
            <Text style={[styles.gridLabel, { color: c.softMuted }]}>QUANDO</Text>
            <Text style={[styles.gridValue, { color: c.text }]}>Hoje · 15h00</Text>
          </View>
          <View style={[styles.gridCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
            <MaterialCommunityIcons name="cash" size={20} color={c.success} />
            <Text style={[styles.gridLabel, { color: c.softMuted }]}>PAGAMENTO</Text>
            <Text style={[styles.gridValue, { color: c.text }]}>Pix · garantido</Text>
          </View>
        </View>

        {/* Why we matched */}
        <View style={[styles.matchCard, { backgroundColor: c.successLight, borderColor: `${c.success}55` }]}>
          <Ionicons name="sparkles" size={16} color={c.success} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.matchTitle, { color: c.text }]}>Combina com você</Text>
            <Text style={[styles.matchSub, { color: c.softMuted }]}>
              Você está a 3,2 km · faz mudanças nessa região · disponível agora
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky CTAs */}
      <View style={[styles.ctaWrap, { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: 16 + insets.bottom }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.refuseBtn, { backgroundColor: c.background, borderColor: c.border }]}
        >
          <Text style={[styles.refuseTxt, { color: c.sub }]}>Recusar</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setAccepting(true);
            setTimeout(() => {
              router.replace("/job");
            }, 200);
          }}
          disabled={accepting}
          style={[styles.acceptBtn, { backgroundColor: c.primary, opacity: accepting ? 0.7 : 1 }, shadows.md]}
        >
          <Ionicons name="checkmark-circle" size={16} color="#fff" />
          <Text style={styles.acceptTxt}>{accepting ? "Aceitando..." : "Aceitar serviço"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  handleWrap: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  handle: { width: 44, height: 5, borderRadius: 3 },

  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  eyebrow: { fontSize: 10, letterSpacing: 1, fontFamily: fonts.sans.bold },
  title: { fontSize: 22, fontFamily: fonts.serif.extra, marginTop: 4, lineHeight: 26 },
  metaRow: { fontSize: 11, fontFamily: fonts.sans.medium, marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  earnCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
    borderRadius: 18,
    marginBottom: 14,
  },
  earnLabel: { color: "rgba(255,255,255,0.78)", fontSize: 10, letterSpacing: 1, fontFamily: fonts.sans.bold },
  earnValue: { color: "#fff", fontSize: 28, fontFamily: fonts.serif.extra, marginTop: 4 },
  earnSub: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontFamily: fonts.sans.medium, marginTop: 2 },
  earnBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },
  earnBadgeText: { color: "#fff", fontSize: 10, fontFamily: fonts.sans.bold },

  card: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  sectionLabel: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8, marginBottom: 10 },

  clientRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarIni: { color: "#fff", fontSize: 14, fontFamily: fonts.serif.extra },
  clientName: { fontSize: 14, fontFamily: fonts.sans.bold },
  clientStats: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  clientStatTxt: { fontSize: 11, fontFamily: fonts.sans.medium },
  dot: { width: 3, height: 3, borderRadius: 2 },

  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  routeDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  routeAddr: { fontSize: 13, fontFamily: fonts.sans.bold },
  routeSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  routeLine: { width: 2, height: 22, marginLeft: 5, marginVertical: 4 },

  itemRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  itemIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  itemTitle: { fontSize: 13, fontFamily: fonts.sans.bold, lineHeight: 18 },
  itemSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  photosRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  photo: { width: 64, height: 64, borderRadius: 12, borderWidth: 1 },
  photoMore: { alignItems: "center", justifyContent: "center" },
  photoMoreTxt: { fontSize: 13, fontFamily: fonts.sans.bold },
  notes: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    alignItems: "flex-start",
  },
  notesText: { flex: 1, fontSize: 12, fontFamily: fonts.sans.medium, lineHeight: 17 },

  gridRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  gridCard: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 1, gap: 4 },
  gridLabel: { fontSize: 9, fontFamily: fonts.sans.bold, letterSpacing: 0.6, marginTop: 6 },
  gridValue: { fontSize: 13, fontFamily: fonts.sans.bold },

  matchCard: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  matchTitle: { fontSize: 13, fontFamily: fonts.sans.bold },
  matchSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2, lineHeight: 15 },

  ctaWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
  },
  refuseBtn: {
    paddingHorizontal: 18,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  refuseTxt: { fontSize: 13, fontFamily: fonts.sans.bold },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  acceptTxt: { color: "#fff", fontSize: 14, fontFamily: fonts.sans.bold },
});
