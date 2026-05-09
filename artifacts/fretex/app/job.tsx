import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Linking, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import colors, { fonts, shadows } from "@/constants/colors";
import { TopNav } from "@/components/TopNav";
import { SideSheet } from "@/components/SideSheet";
import { ProfileOverlay } from "@/components/ProfileOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useService } from "@/contexts/ServiceContext";
import type { ServiceStatus } from "@/contexts/ServiceContext";
import { sendQuickMessage } from "@/lib/quickMessages";

const STAGES: {
  id: ServiceStatus;
  label: string;
  cta: string;
  sub: string;
  icon: any;
}[] = [
  { id: "accepted", label: "Aceito", cta: "Estou a caminho", sub: "Confirme que está saindo para o cliente", icon: "checkmark-circle" },
  { id: "en_route", label: "A caminho", sub: "Avise quando chegar para iniciar o serviço", cta: "Cheguei / Iniciar serviço", icon: "navigate" },
  { id: "in_progress", label: "Em execução", cta: "Concluir serviço", sub: "Quando tudo estiver pronto, peça o PIN ao cliente", icon: "construct" },
];

const QUICK_MSGS_PROVIDER = [
  "Estou a caminho, chego em 10 min",
  "Cheguei no local",
  "Vou atrasar 10 minutos, desculpe",
  "Não consigo te encontrar, pode descer?",
];

export default function JobScreen() {
  const c = colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { active, advanceStatus } = useService();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  // If we landed on /job without an active accepted service, bounce back
  useEffect(() => {
    if (!active) return;
    if (active.status === "completed" || active.status === "cancelled") {
      router.replace("/");
    }
  }, [active, router]);

  if (!active) {
    return (
      <View style={[styles.empty, { backgroundColor: c.background, paddingTop: insets.top + 60 }]}>
        <Ionicons name="briefcase-outline" size={48} color={c.softMuted} />
        <Text style={[styles.emptyTitle, { color: c.text }]}>Sem serviço ativo</Text>
        <Pressable onPress={() => router.replace("/")} style={[styles.btn, { backgroundColor: c.primary, marginTop: 20 }]}>
          <Text style={styles.btnTxt}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const initials = (user?.name || "PR").split(" ").map((p) => p[0]).slice(0, 2).join("");
  const accent = active.category === "Mudança" ? c.primary : active.category === "Frete" ? c.blue : c.success;
  const stageIndex = STAGES.findIndex((s) => s.id === active.status);
  const safeIndex = stageIndex === -1 ? 0 : stageIndex;
  const current = STAGES[safeIndex];
  const progress = ((safeIndex + 1) / STAGES.length) * 100;

  const advance = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (active.status === "accepted") {
      await advanceStatus("en_route", "Prestador saiu");
    } else if (active.status === "en_route") {
      router.push("/start-pin");
    } else if (active.status === "in_progress") {
      router.push("/job-otp");
    }
  };

  const openServiceChat = () => {
    router.push({
      pathname: "/chat",
      params: {
        id: active.id,
        requestId: active.id,
        name: active.customerName,
        ini: active.customerInitials,
        color: active.customerColor,
        type: "dm",
      },
    } as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <TopNav
        title="Serviço em andamento"
        subtitle={`Etapa ${safeIndex + 1} de ${STAGES.length} · ${current.label}`}
        initials={initials}
        accentColor={accent}
        onMenuOpen={() => setMenuOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
        onBack={() => router.replace("/")}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={[accent, accent + "DD"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>AO VIVO · {active.category.toUpperCase()}</Text>
          </View>
          <Text style={styles.heroTitle}>{current.label}</Text>
          <Text style={styles.heroSub}>{current.sub}</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{Math.round(progress)}% do serviço concluído</Text>
        </LinearGradient>

        {/* Client */}
        <View style={[styles.clientCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <LinearGradient colors={[active.customerColor, active.customerColor + "AA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.clientAvatar}>
            <Text style={styles.clientIni}>{active.customerInitials}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.clientName, { color: c.text }]}>{active.customerName}</Text>
            <Text style={[styles.clientMeta, { color: c.softMuted }]}>Cliente Ajudaê! · {active.customerRating} ★</Text>
          </View>
          <Pressable onPress={openServiceChat} style={[styles.iconBtn, { backgroundColor: c.background, borderColor: c.border }]}>
            <Ionicons name="chatbubble-ellipses" size={15} color={c.text} />
          </Pressable>
          <Pressable onPress={() => Linking.openURL("tel:+5521999998888").catch(() => {})} style={[styles.iconBtn, { backgroundColor: accent, borderColor: accent }]}>
            <Ionicons name="call" size={15} color="#fff" />
          </Pressable>
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
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, marginTop: 12 }, shadows.sm]}>
          <Text style={[styles.sectionLabel, { color: c.softMuted }]}>DETALHES</Text>
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
          <View style={[styles.itemKpis, { borderTopColor: c.border }]}>
            <View style={styles.kpi}>
              <Text style={[styles.kpiLabel, { color: c.softMuted }]}>AJUDANTE</Text>
              <Text style={[styles.kpiValue, { color: c.text }]}>{active.needsHelper ? "Sim" : "Não"}</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={[styles.kpiLabel, { color: c.softMuted }]}>FOTOS</Text>
              <Text style={[styles.kpiValue, { color: c.text }]}>{active.photos.length}</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={[styles.kpiLabel, { color: c.softMuted }]}>VOCÊ RECEBE</Text>
              <Text style={[styles.kpiValue, { color: c.success }]}>R${(active.estimatedPrice * 0.85).toFixed(0)}</Text>
            </View>
          </View>
        </View>

        {/* Stage timeline */}
        <Text style={[styles.sectionLabel, { color: c.softMuted, marginTop: 18, marginLeft: 4 }]}>ETAPAS</Text>
        <View style={[styles.timeline, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          {STAGES.map((s, idx) => {
            const done = idx < safeIndex;
            const activeS = idx === safeIndex;
            const tone = done ? c.success : activeS ? accent : c.borderLight;
            return (
              <View key={s.id} style={styles.tlRow}>
                <View style={styles.tlLeft}>
                  <View style={[styles.tlNode, { backgroundColor: tone, borderColor: tone }]}>
                    <Ionicons name={done ? "checkmark" : (s.icon as any)} size={done ? 12 : 11} color={done || activeS ? "#fff" : c.softMuted} />
                  </View>
                  {idx < STAGES.length - 1 ? <View style={[styles.tlBar, { backgroundColor: idx < safeIndex ? c.success : c.borderLight }]} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: 14 }}>
                  <Text style={{ fontSize: 13, fontFamily: activeS ? fonts.sans.bold : fonts.sans.semibold, color: activeS || done ? c.text : c.softMuted }}>
                    {s.label}
                  </Text>
                  {activeS ? <Text style={[styles.tlSub, { color: c.softMuted }]}>{s.sub}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.ctaWrap, { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: 16 + insets.bottom }]}>
        <Pressable onPress={openServiceChat} style={[styles.ctaSecondary, { backgroundColor: c.background, borderColor: c.border }]}>
          <Ionicons name="chatbubbles" size={15} color={c.text} />
          <Text style={[styles.ctaSecondaryText, { color: c.text }]}>Mensagem</Text>
        </Pressable>
        <Pressable onPress={advance} style={[styles.ctaPrimary, { backgroundColor: accent }, shadows.md]}>
          <Text style={styles.ctaPrimaryText}>{current.cta}</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>
      </View>

      {/* Quick messages */}
      <Modal visible={quickOpen} transparent animationType="fade" onRequestClose={() => setQuickOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setQuickOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.card, paddingBottom: 16 + insets.bottom }]} onPress={() => {}}>
            <View style={[styles.sheetHandle, { backgroundColor: c.borderLight }]} />
            <Text style={[styles.sheetTitle, { color: c.text }]}>Mensagem rápida</Text>
            <Text style={[styles.sheetSub, { color: c.softMuted }]}>Escolha o que enviar ao cliente</Text>
            {QUICK_MSGS_PROVIDER.map((m) => (
              <Pressable
                key={m}
                onPress={async () => {
                  setQuickOpen(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  if (!user?.id) return;
                  try {
                    await sendQuickMessage(active.id, user.id, m);
                  } catch {
                    openServiceChat();
                  }
                }}
                style={[styles.quickItem, { backgroundColor: c.background, borderColor: c.border }]}
              >
                <Text style={[styles.quickTxt, { color: c.text }]}>{m}</Text>
                <Ionicons name="arrow-forward" size={14} color={c.softMuted} />
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                setQuickOpen(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }}
              style={[styles.cancelBtn, { backgroundColor: c.background, borderColor: c.border }]}
            >
              <Ionicons name="close" size={14} color={c.softMuted} />
              <Text style={[styles.cancelTxt, { color: c.softMuted }]}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <SideSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} name={user?.name || ""} initials={initials} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: "center", padding: 24 },
  emptyTitle: { fontSize: 17, fontFamily: fonts.sans.bold, marginTop: 12 },
  btn: { paddingHorizontal: 22, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnTxt: { color: "#fff", fontSize: 13, fontFamily: fonts.sans.bold },

  hero: { borderRadius: 22, padding: 18 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 1 },
  heroTitle: { color: "#fff", fontSize: 22, fontFamily: fonts.serif.extra, marginTop: 8, lineHeight: 26 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: fonts.sans.medium, marginTop: 4 },
  progressTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 6, marginTop: 14, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: "#fff", borderRadius: 6 },
  progressLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontFamily: fonts.sans.semibold, marginTop: 6 },

  clientCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, marginTop: 14 },
  clientAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  clientIni: { color: "#fff", fontSize: 14, fontFamily: fonts.serif.extra },
  clientName: { fontSize: 14, fontFamily: fonts.sans.bold },
  clientMeta: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  sectionLabel: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8, marginBottom: 10 },
  card: { padding: 14, borderRadius: 16, borderWidth: 1, marginTop: 14 },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  routeDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  routeAddr: { fontSize: 12, fontFamily: fonts.sans.bold },
  routeSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  routeLine: { width: 2, height: 18, marginLeft: 5, marginVertical: 4 },

  itemRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  itemIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  itemTitle: { fontSize: 13, fontFamily: fonts.sans.semibold, lineHeight: 17 },
  itemKpis: { flexDirection: "row", gap: 12, borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  kpi: { flex: 1 },
  kpiLabel: { fontSize: 9, fontFamily: fonts.sans.bold, letterSpacing: 0.6 },
  kpiValue: { fontSize: 13, fontFamily: fonts.sans.bold, marginTop: 4 },

  timeline: { padding: 16, borderRadius: 16, borderWidth: 1 },
  tlRow: { flexDirection: "row", gap: 12 },
  tlLeft: { alignItems: "center", width: 22 },
  tlNode: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  tlBar: { width: 2, flex: 1, marginTop: 2 },
  tlSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2, lineHeight: 15 },

  ctaWrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, flexDirection: "row", gap: 8 },
  ctaSecondary: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 50, borderRadius: 14, borderWidth: 1 },
  ctaSecondaryText: { fontSize: 12, fontFamily: fonts.sans.bold },
  ctaPrimary: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 14 },
  ctaPrimaryText: { color: "#fff", fontSize: 14, fontFamily: fonts.sans.bold },

  backdrop: { flex: 1, backgroundColor: "rgba(28,25,23,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontFamily: fonts.serif.extra },
  sheetSub: { fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 4, marginBottom: 8 },
  quickItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  quickTxt: { fontSize: 13, fontFamily: fonts.sans.semibold, flex: 1 },
  cancelBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44, borderRadius: 12, borderWidth: 1, marginTop: 14 },
  cancelTxt: { fontSize: 13, fontFamily: fonts.sans.semibold },
});
