import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import colors, { fonts, shadows } from "@/constants/colors";
import { useService } from "@/contexts/ServiceContext";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORY_COLORS } from "@/constants/mockData";

const PHOTOS = [
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=400&q=80",
  "https://images.unsplash.com/photo-1582719188393-bb71ca45dbb9?w=400&q=80",
];

const ACCEPT_WINDOW_S = 30;

export default function RequestDetailsScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { active, assignProvider } = useService();
  const [accepting, setAccepting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(ACCEPT_WINDOW_S);

  useEffect(() => {
    if (!active || active.status !== "requested") return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [active]);

  // Empty / already accepted states
  if (!active) {
    return (
      <View style={[styles.empty, { backgroundColor: c.background, paddingTop: insets.top + 60 }]}>
        <Ionicons name="document-text-outline" size={42} color={c.softMuted} />
        <Text style={[styles.emptyTitle, { color: c.text }]}>Nenhuma solicitação no momento</Text>
        <Text style={[styles.emptySub, { color: c.softMuted }]}>Quando um cliente fizer um pedido, ele aparece aqui.</Text>
        <Pressable onPress={() => router.back()} style={[styles.btn, { backgroundColor: c.primary, marginTop: 20 }]}>
          <Text style={styles.btnTxt}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  if (active.status !== "requested") {
    return (
      <View style={[styles.empty, { backgroundColor: c.background, paddingTop: insets.top + 60 }]}>
        <Ionicons name="checkmark-circle" size={42} color={c.success} />
        <Text style={[styles.emptyTitle, { color: c.text }]}>Este pedido já foi aceito</Text>
        <Text style={[styles.emptySub, { color: c.softMuted }]}>Outro prestador respondeu primeiro ou você já assumiu.</Text>
        <Pressable onPress={() => router.back()} style={[styles.btn, { backgroundColor: c.primary, marginTop: 20 }]}>
          <Text style={styles.btnTxt}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const accent = active.category === "Mudança" ? c.primary : active.category === "Frete" ? c.blue : c.success;
  const expired = secondsLeft === 0;
  const earnings = (active.estimatedPrice * 0.85).toFixed(2);

  const accept = async () => {
    if (expired || accepting) return;
    setAccepting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    // Use the logged-in user's data as the provider (they ARE the provider accepting)
    const providerName = user?.name || "Prestador";
    const initials = providerName.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
    await assignProvider({
      providerId: user?.id || "",
      providerName,
      providerInitials: initials,
      providerColor: CATEGORY_COLORS[active.category],
      providerVehicle: "Veículo",
      providerRating: 0,
      providerKm: 0,
    });
    setTimeout(() => router.replace("/job"), 250);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={styles.handleWrap}>
        <View style={[styles.handle, { backgroundColor: c.borderLight }]} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={styles.headRow}>
          <View>
            <Text style={[styles.eyebrow, { color: accent }]}>NOVA SOLICITAÇÃO</Text>
            <Text style={[styles.title, { color: c.text }]}>{active.category}</Text>
            <Text style={[styles.metaRow, { color: c.softMuted }]}>
              #{active.id.slice(-6).toUpperCase()} · {active.scheduled ? "Agendado" : "Imediato"}
            </Text>
          </View>
          <Pressable onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="close" size={18} color={c.text} />
          </Pressable>
        </View>

        {/* Timer */}
        <View
          style={[
            styles.timerBox,
            {
              backgroundColor: expired ? "#FEE2E2" : `${accent}15`,
              borderColor: expired ? "#FCA5A5" : `${accent}33`,
            },
          ]}
        >
          <Ionicons name={expired ? "alert-circle" : "timer"} size={16} color={expired ? c.destructive : accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.timerLabel, { color: c.softMuted }]}>
              {expired ? "TEMPO ESGOTADO" : "TEMPO PARA ACEITAR"}
            </Text>
            <Text style={[styles.timerValue, { color: expired ? c.destructive : accent }]}>
              {expired ? "Este pedido expirou" : `${String(secondsLeft).padStart(2, "0")}s`}
            </Text>
          </View>
        </View>

        {/* Earnings */}
        <LinearGradient colors={[accent, accent + "DD"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.earnCard, shadows.md]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.earnLabel}>VOCÊ RECEBE</Text>
            <Text style={styles.earnValue}>R$ {earnings}</Text>
            <Text style={styles.earnSub}>R$ {active.estimatedPrice.toFixed(2)} bruto · taxa Ajudaê 15%</Text>
          </View>
          <View style={styles.earnBadge}>
            <Ionicons name="flash" size={14} color="#fff" />
            <Text style={styles.earnBadgeText}>Pague na hora</Text>
          </View>
        </LinearGradient>

        {/* Client */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <View style={styles.clientRow}>
            <LinearGradient colors={[active.customerColor, active.customerColor + "AA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
              <Text style={styles.avatarIni}>{active.customerInitials}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.clientName, { color: c.text }]}>{active.customerName}</Text>
              <View style={styles.clientStats}>
                <Ionicons name="star" size={11} color={c.warning} />
                <Text style={[styles.clientStatTxt, { color: c.softMuted }]}>{active.customerRating} · cliente</Text>
                <View style={[styles.dot, { backgroundColor: c.softMuted }]} />
                <Text style={[styles.clientStatTxt, { color: c.success }]}>Verificado</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Route */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Text style={[styles.sectionLabel, { color: c.softMuted }]}>ENDEREÇOS</Text>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.routeAddr, { color: c.text }]}>Origem</Text>
              <Text style={[styles.routeSub, { color: c.softMuted }]}>{active.origin}</Text>
            </View>
          </View>
          {active.destination ? (
            <>
              <View style={[styles.routeLine, { backgroundColor: c.borderLight }]} />
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: c.success }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.routeAddr, { color: c.text }]}>Destino</Text>
                  <Text style={[styles.routeSub, { color: c.softMuted }]}>{active.destination}</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* Description */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Text style={[styles.sectionLabel, { color: c.softMuted }]}>O QUE TRANSPORTAR</Text>
          <View style={styles.itemRow}>
            <View style={[styles.itemIcon, { backgroundColor: `${accent}18` }]}>
              {active.category === "Mudança" ? (
                <MaterialCommunityIcons name="sofa" size={20} color={accent} />
              ) : active.category === "Frete" ? (
                <MaterialCommunityIcons name="truck" size={20} color={accent} />
              ) : (
                <Ionicons name="cube" size={18} color={accent} />
              )}
            </View>
            <Text style={[styles.itemTitle, { color: c.text, flex: 1 }]}>{active.description}</Text>
          </View>

          {(active.photos.length > 0 ? active.photos : PHOTOS.slice(0, 0)).length > 0 ? (
            <View style={styles.photosRow}>
              {(active.photos.length > 0 ? active.photos : PHOTOS).slice(0, 3).map((uri, i) => (
                <Image key={i} source={{ uri }} style={[styles.photo, { borderColor: c.borderLight }]} />
              ))}
              {active.photos.length > 3 ? (
                <View style={[styles.photo, styles.photoMore, { backgroundColor: c.background, borderColor: c.borderLight }]}>
                  <Text style={[styles.photoMoreTxt, { color: c.softMuted }]}>+{active.photos.length - 3}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Schedule + helper */}
        <View style={styles.gridRow}>
          <View style={[styles.gridCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
            <Ionicons name="calendar" size={18} color={accent} />
            <Text style={[styles.gridLabel, { color: c.softMuted }]}>QUANDO</Text>
            <Text style={[styles.gridValue, { color: c.text }]}>
              {active.scheduled && active.scheduledFor ? new Date(active.scheduledFor).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "Agora"}
            </Text>
          </View>
          <View style={[styles.gridCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
            <Ionicons name={active.needsHelper ? "people" : "person"} size={18} color={c.success} />
            <Text style={[styles.gridLabel, { color: c.softMuted }]}>AJUDANTE</Text>
            <Text style={[styles.gridValue, { color: c.text }]}>{active.needsHelper ? "Sim (+R$35)" : "Não"}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.ctaWrap, { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: 16 + insets.bottom }]}>
        <Pressable onPress={() => router.back()} style={[styles.refuseBtn, { backgroundColor: c.background, borderColor: c.border }]}>
          <Text style={[styles.refuseTxt, { color: c.sub }]}>Recusar</Text>
        </Pressable>
        <Pressable
          onPress={accept}
          disabled={accepting || expired}
          style={[
            styles.acceptBtn,
            {
              backgroundColor: expired ? c.borderLight : accent,
              opacity: accepting ? 0.7 : 1,
            },
            shadows.md,
          ]}
        >
          <Ionicons name="checkmark-circle" size={16} color="#fff" />
          <Text style={styles.acceptTxt}>
            {expired ? "Expirado" : accepting ? "Aceitando..." : "Aceitar serviço"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  handleWrap: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  handle: { width: 44, height: 5, borderRadius: 3 },
  empty: { flex: 1, alignItems: "center", padding: 24 },
  emptyTitle: { fontSize: 17, fontFamily: fonts.sans.bold, marginTop: 12, textAlign: "center" },
  emptySub: { fontSize: 13, fontFamily: fonts.sans.regular, marginTop: 6, textAlign: "center" },
  btn: { paddingHorizontal: 22, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnTxt: { color: "#fff", fontSize: 13, fontFamily: fonts.sans.bold },

  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  eyebrow: { fontSize: 10, letterSpacing: 1, fontFamily: fonts.sans.bold },
  title: { fontSize: 22, fontFamily: fonts.serif.extra, marginTop: 4 },
  metaRow: { fontSize: 11, fontFamily: fonts.sans.medium, marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  timerBox: { flexDirection: "row", gap: 12, alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  timerLabel: { fontSize: 9, fontFamily: fonts.sans.bold, letterSpacing: 0.6 },
  timerValue: { fontSize: 18, fontFamily: fonts.serif.extra, marginTop: 2 },

  earnCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: 18, marginBottom: 14 },
  earnLabel: { color: "rgba(255,255,255,0.78)", fontSize: 10, letterSpacing: 1, fontFamily: fonts.sans.bold },
  earnValue: { color: "#fff", fontSize: 28, fontFamily: fonts.serif.extra, marginTop: 4 },
  earnSub: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontFamily: fonts.sans.medium, marginTop: 2 },
  earnBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
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
  routeAddr: { fontSize: 12, fontFamily: fonts.sans.bold },
  routeSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  routeLine: { width: 2, height: 18, marginLeft: 5, marginVertical: 4 },

  itemRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  itemIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  itemTitle: { fontSize: 12, fontFamily: fonts.sans.semibold, lineHeight: 17 },
  photosRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  photo: { width: 64, height: 64, borderRadius: 12, borderWidth: 1 },
  photoMore: { alignItems: "center", justifyContent: "center" },
  photoMoreTxt: { fontSize: 13, fontFamily: fonts.sans.bold },

  gridRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  gridCard: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 1, gap: 4 },
  gridLabel: { fontSize: 9, fontFamily: fonts.sans.bold, letterSpacing: 0.6, marginTop: 6 },
  gridValue: { fontSize: 12, fontFamily: fonts.sans.bold },

  ctaWrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, flexDirection: "row", gap: 8 },
  refuseBtn: { paddingHorizontal: 18, height: 50, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  refuseTxt: { fontSize: 13, fontFamily: fonts.sans.bold },
  acceptBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 14 },
  acceptTxt: { color: "#fff", fontSize: 14, fontFamily: fonts.sans.bold },
});
