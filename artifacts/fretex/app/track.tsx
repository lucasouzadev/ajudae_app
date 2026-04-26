import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, TextInput, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import colors, { fonts, shadows } from "@/constants/colors";
import { TopNav } from "@/components/TopNav";
import { SideSheet } from "@/components/SideSheet";
import { ProfileOverlay } from "@/components/ProfileOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useService } from "@/contexts/ServiceContext";
import type { ServiceStatus } from "@/contexts/ServiceContext";

const STAGES: { id: ServiceStatus; label: string; sub: string; icon: any }[] = [
  { id: "requested", label: "Aguardando aceite", sub: "Procurando o melhor prestador para você", icon: "search" },
  { id: "accepted", label: "Aceito", sub: "Prestador confirmou o pedido", icon: "checkmark-circle" },
  { id: "en_route", label: "A caminho", sub: "Prestador em deslocamento até você", icon: "navigate" },
  { id: "in_progress", label: "Em execução", sub: "Serviço acontecendo agora", icon: "construct" },
  { id: "completed", label: "Concluído", sub: "Tudo certo! Avalie o prestador", icon: "star" },
];

const QUICK_MSGS_CLIENT = [
  "Ainda estou aguardando, tudo bem?",
  "Pode chegar 10 min depois, sem problema",
  "Preciso cancelar o pedido",
];

const CANCEL_REASONS = [
  "Não preciso mais do serviço",
  "Demorou muito para aceitar",
  "Encontrei outra solução",
  "Outro motivo",
];

export default function TrackScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { active, cancelService } = useService();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [otherReason, setOtherReason] = useState("");
  const [now, setNow] = useState(Date.now());

  // 1-second tick for the expiration timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-navigate to rating when completed
  useEffect(() => {
    if (active?.status === "completed") {
      const t = setTimeout(() => router.replace("/rate"), 600);
      return () => clearTimeout(t);
    }
  }, [active?.status]);

  if (!active) {
    return (
      <View style={[styles.empty, { backgroundColor: c.background, paddingTop: insets.top + 60 }]}>
        <Ionicons name="document-text-outline" size={48} color={c.softMuted} />
        <Text style={[styles.emptyTitle, { color: c.text }]}>Nenhum pedido ativo</Text>
        <Pressable onPress={() => router.replace("/")} style={[styles.cta, { backgroundColor: c.primary, marginTop: 20 }]}>
          <Text style={styles.ctaTxt}>Voltar para Home</Text>
        </Pressable>
      </View>
    );
  }

  const initials = (user?.name || "CL").split(" ").map((p) => p[0]).slice(0, 2).join("");
  const accent = active.category === "Mudança" ? c.primary : active.category === "Frete" ? c.blue : c.success;
  const stageIndex = STAGES.findIndex((s) => s.id === active.status);
  const safeIndex = stageIndex === -1 ? 0 : stageIndex;
  const progress = ((safeIndex + 1) / STAGES.length) * 100;
  const isDisputed = active.status === "disputed";
  const isCancelled = active.status === "cancelled";

  // Expiration timer (only in `requested`) — 5 minutes from createdAt
  const createdMs = new Date(active.createdAt).getTime();
  const expiresAt = createdMs + 5 * 60 * 1000;
  const remainingMs = Math.max(0, expiresAt - now);
  const remMin = Math.floor(remainingMs / 60000);
  const remSec = Math.floor((remainingMs % 60000) / 1000);

  const sendMsg = (msg: string) => {
    setQuickOpen(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (msg.toLowerCase().includes("cancelar")) setCancelOpen(true);
  };

  const confirmCancel = async () => {
    const reason = cancelReason === "Outro motivo" ? `Outro motivo: ${otherReason || "—"}` : cancelReason || "Não informado";
    await cancelService(reason);
    setCancelOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <TopNav
        title="Acompanhar pedido"
        subtitle={`#${active.id.slice(-6).toUpperCase()} · ${active.category}`}
        initials={initials}
        accentColor={c.blue}
        onMenuOpen={() => setMenuOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
        onBack={() => router.replace("/")}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Hero with status */}
        <LinearGradient
          colors={isDisputed ? [c.warning, "#B45309"] : isCancelled ? ["#71717A", "#52525B"] : [accent, accent + "DD"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>
              {isDisputed ? "EM ANÁLISE" : isCancelled ? "CANCELADO" : `${active.category.toUpperCase()} · AO VIVO`}
            </Text>
          </View>
          <Text style={styles.heroTitle}>{STAGES[safeIndex].label}</Text>
          <Text style={styles.heroSub}>{STAGES[safeIndex].sub}</Text>

          {!isDisputed && !isCancelled ? (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              {active.status === "requested" ? (
                <Text style={styles.progressLabel}>
                  Expira em {String(remMin).padStart(2, "0")}:{String(remSec).padStart(2, "0")}
                </Text>
              ) : (
                <Text style={styles.progressLabel}>{Math.round(progress)}% completo</Text>
              )}
            </>
          ) : null}
        </LinearGradient>

        {/* Disputed banner */}
        {isDisputed ? (
          <Pressable
            onPress={() => router.push("/ticket")}
            style={[styles.disputedBanner, { backgroundColor: c.warningLight, borderColor: `${c.warning}66` }]}
          >
            <Ionicons name="alert-circle" size={18} color={c.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.disputedTitle, { color: c.text }]}>Seu pedido está em análise</Text>
              <Text style={[styles.disputedSub, { color: c.sub }]}>Toque para ver o ticket e adicionar informações</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.sub} />
          </Pressable>
        ) : null}

        {/* Provider card (after accepted) */}
        {active.providerName && !isCancelled ? (
          <View style={[styles.providerCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
            <LinearGradient
              colors={[active.providerColor || accent, (active.providerColor || accent) + "AA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.providerAvatar}
            >
              <Text style={styles.providerIni}>{active.providerInitials}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.providerName, { color: c.text }]}>{active.providerName}</Text>
              <View style={styles.providerStats}>
                <Ionicons name="star" size={11} color={c.warning} />
                <Text style={[styles.providerStat, { color: c.sub }]}>{active.providerRating}</Text>
                <Text style={[styles.providerStat, { color: c.softMuted }]}>·</Text>
                <Text style={[styles.providerStat, { color: c.sub }]}>{active.providerVehicle}</Text>
                <Text style={[styles.providerStat, { color: c.softMuted }]}>·</Text>
                <Text style={[styles.providerStat, { color: c.sub }]}>{active.providerKm} km</Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push("/inbox")}
              style={[styles.iconBtn, { backgroundColor: c.background, borderColor: c.border }]}
            >
              <Ionicons name="chatbubble-ellipses" size={15} color={c.text} />
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL("tel:+5521999998888").catch(() => {})}
              style={[styles.iconBtn, { backgroundColor: accent, borderColor: accent }]}
            >
              <Ionicons name="call" size={15} color="#fff" />
            </Pressable>
          </View>
        ) : null}

        {/* PIN de Início banner — shown when provider has arrived and generated the start PIN */}
        {active.status === "en_route" && active.startPin ? (
          <Pressable
            onPress={() => router.push("/confirm-start-pin")}
            style={[styles.startPinBanner, { backgroundColor: c.primary, borderColor: "#E8B400" }, shadows.md]}
          >
            <View style={styles.startPinLeft}>
              <View style={styles.startPinDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.startPinTitle}>Prestador chegou!</Text>
                <Text style={styles.startPinSub}>Confirme o PIN de Início para começar o serviço</Text>
              </View>
            </View>
            <View style={styles.startPinArrow}>
              <Ionicons name="arrow-forward" size={16} color="#1A1714" />
            </View>
          </Pressable>
        ) : null}

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
          <Text style={[styles.sectionLabel, { color: c.softMuted }]}>DESCRIÇÃO</Text>
          <Text style={[styles.descText, { color: c.text }]}>{active.description}</Text>
          {active.needsHelper ? (
            <View style={[styles.tag, { backgroundColor: `${accent}15`, marginTop: 10 }]}>
              <Ionicons name="people" size={11} color={accent} />
              <Text style={[styles.tagTxt, { color: accent }]}>Com ajudante</Text>
            </View>
          ) : null}
        </View>

        {/* Status timeline */}
        <Text style={[styles.sectionLabel, { color: c.softMuted, marginTop: 18, marginLeft: 4 }]}>HISTÓRICO</Text>
        <View style={[styles.timeline, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          {STAGES.map((s, idx) => {
            const done = idx < safeIndex;
            const activeS = idx === safeIndex && !isDisputed && !isCancelled;
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

        {/* Demo hint */}
        {active.status !== "completed" && active.status !== "cancelled" && active.status !== "disputed" ? (
          <View style={[styles.hintBox, { backgroundColor: c.primaryLight, borderColor: `${c.primary}33` }]}>
            <Ionicons name="information-circle" size={14} color={accent} />
            <Text style={[styles.hintTxt, { color: c.text }]}>
              Para simular, troque para o perfil de Prestador no menu lateral.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky actions */}
      {!isCancelled && active.status !== "completed" ? (
        <View style={[styles.ctaWrap, { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: 14 + insets.bottom }]}>
          <Pressable onPress={() => setQuickOpen(true)} style={[styles.actionBtn, { backgroundColor: c.background, borderColor: c.border }]}>
            <Ionicons name="chatbubbles" size={15} color={c.text} />
            <Text style={[styles.actionTxt, { color: c.text }]}>Mensagem</Text>
          </Pressable>
          {active.status !== "requested" && !isDisputed ? (
            <Pressable onPress={() => router.push("/ticket")} style={[styles.actionBtn, { backgroundColor: c.warningLight, borderColor: `${c.warning}55` }]}>
              <Ionicons name="alert-circle" size={15} color={c.warning} />
              <Text style={[styles.actionTxt, { color: c.text }]}>Problema?</Text>
            </Pressable>
          ) : null}
          {active.status === "requested" ? (
            <Pressable onPress={() => setCancelOpen(true)} style={[styles.actionBtn, { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5", flex: 1 }]}>
              <Ionicons name="close-circle" size={15} color={c.destructive} />
              <Text style={[styles.actionTxt, { color: c.destructive }]}>Cancelar</Text>
            </Pressable>
          ) : null}
        </View>
      ) : isCancelled ? (
        <View style={[styles.ctaWrap, { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: 14 + insets.bottom }]}>
          <Pressable onPress={() => router.replace("/request")} style={[styles.cta, { backgroundColor: c.primary, flex: 1 }]}>
            <Text style={styles.ctaTxt}>Criar novo pedido</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Quick messages modal */}
      <Modal visible={quickOpen} transparent animationType="fade" onRequestClose={() => setQuickOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setQuickOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.card, paddingBottom: 16 + insets.bottom }]} onPress={() => {}}>
            <View style={[styles.handle, { backgroundColor: c.borderLight }]} />
            <Text style={[styles.sheetTitle, { color: c.text }]}>Mensagem rápida</Text>
            <Text style={[styles.sheetSub, { color: c.softMuted }]}>Escolha uma das opções abaixo</Text>
            {QUICK_MSGS_CLIENT.map((m) => (
              <Pressable
                key={m}
                onPress={() => sendMsg(m)}
                style={[styles.quickItem, { backgroundColor: c.background, borderColor: c.border }]}
              >
                <Text style={[styles.quickTxt, { color: c.text }]}>{m}</Text>
                <Ionicons name="arrow-forward" size={14} color={c.softMuted} />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Cancel modal */}
      <Modal visible={cancelOpen} transparent animationType="fade" onRequestClose={() => setCancelOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: c.card, paddingBottom: 16 + insets.bottom }]}>
            <View style={[styles.handle, { backgroundColor: c.borderLight }]} />
            <Text style={[styles.sheetTitle, { color: c.text }]}>Por que deseja cancelar?</Text>
            {active.status === "accepted" ? (
              <View style={[styles.warnBox, { backgroundColor: c.warningLight, borderColor: `${c.warning}66` }]}>
                <Ionicons name="alert-circle" size={14} color={c.warning} />
                <Text style={[styles.warnText, { color: c.text }]}>
                  Cancelar agora pode gerar cobrança de taxa.
                </Text>
              </View>
            ) : null}
            <View style={{ marginTop: 14, gap: 8 }}>
              {CANCEL_REASONS.map((r) => {
                const sel = cancelReason === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setCancelReason(r)}
                    style={[styles.radio, { backgroundColor: c.background, borderColor: sel ? c.destructive : c.border, borderWidth: sel ? 2 : 1 }]}
                  >
                    <View style={[styles.radioDot, { borderColor: sel ? c.destructive : c.border }]}>
                      {sel ? <View style={[styles.radioFill, { backgroundColor: c.destructive }]} /> : null}
                    </View>
                    <Text style={[styles.radioTxt, { color: c.text }]}>{r}</Text>
                  </Pressable>
                );
              })}
              {cancelReason === "Outro motivo" ? (
                <TextInput
                  value={otherReason}
                  onChangeText={setOtherReason}
                  placeholder="Conte mais (opcional)"
                  placeholderTextColor={c.softMuted}
                  style={[styles.otherInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                  multiline
                />
              ) : null}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              <Pressable onPress={() => setCancelOpen(false)} style={[styles.actionBtn, { backgroundColor: c.background, borderColor: c.border, flex: 1 }]}>
                <Text style={[styles.actionTxt, { color: c.text }]}>Voltar</Text>
              </Pressable>
              <Pressable
                onPress={confirmCancel}
                disabled={!cancelReason}
                style={[styles.actionBtn, { backgroundColor: c.destructive, borderColor: c.destructive, flex: 2, opacity: cancelReason ? 1 : 0.5 }]}
              >
                <Text style={[styles.actionTxt, { color: "#fff" }]}>Confirmar cancelamento</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <SideSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} name={user?.name || ""} initials={initials} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: "center", padding: 24 },
  emptyTitle: { fontSize: 17, fontFamily: fonts.sans.bold, marginTop: 12 },

  hero: { borderRadius: 22, padding: 18 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 1 },
  heroTitle: { color: "#fff", fontSize: 22, fontFamily: fonts.serif.extra, marginTop: 8 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: fonts.sans.medium, marginTop: 4 },
  progressTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 6, marginTop: 14, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: "#fff", borderRadius: 6 },
  progressLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontFamily: fonts.sans.semibold, marginTop: 6 },

  disputedBanner: { flexDirection: "row", gap: 10, alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1, marginTop: 12 },
  disputedTitle: { fontSize: 13, fontFamily: fonts.sans.bold },
  disputedSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },

  providerCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, borderWidth: 1, marginTop: 12 },
  providerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  providerIni: { color: "#fff", fontSize: 13, fontFamily: fonts.serif.extra },
  providerName: { fontSize: 13, fontFamily: fonts.sans.bold },
  providerStats: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  providerStat: { fontSize: 10, fontFamily: fonts.sans.semibold },
  iconBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  card: { padding: 14, borderRadius: 16, borderWidth: 1, marginTop: 12 },
  sectionLabel: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8, marginBottom: 10 },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  routeDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  routeAddr: { fontSize: 12, fontFamily: fonts.sans.bold },
  routeSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  routeLine: { width: 2, height: 18, marginLeft: 5, marginVertical: 4 },
  descText: { fontSize: 12, fontFamily: fonts.sans.regular, lineHeight: 17 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
  tagTxt: { fontSize: 10, fontFamily: fonts.sans.bold },

  timeline: { padding: 16, borderRadius: 16, borderWidth: 1 },
  tlRow: { flexDirection: "row", gap: 12 },
  tlLeft: { alignItems: "center", width: 22 },
  tlNode: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  tlBar: { width: 2, flex: 1, marginTop: 2 },
  tlSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2, lineHeight: 15 },

  startPinBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 12,
    gap: 0,
  },
  startPinLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  startPinDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#1A1714", opacity: 0.6 },
  startPinTitle: { fontSize: 14, fontFamily: fonts.sans.bold, color: "#1A1714" },
  startPinSub: { fontSize: 11, fontFamily: fonts.sans.medium, color: "#1A1714", opacity: 0.7, marginTop: 1 },
  startPinArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.1)", alignItems: "center", justifyContent: "center" },
  hintBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 10, borderRadius: 12, borderWidth: 1, marginTop: 14 },
  hintTxt: { flex: 1, fontSize: 11, fontFamily: fonts.sans.medium },

  ctaWrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingTop: 12, borderTopWidth: 1, flexDirection: "row", gap: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12, height: 46, borderRadius: 13, borderWidth: 1 },
  actionTxt: { fontSize: 12, fontFamily: fonts.sans.bold },
  cta: { height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  ctaTxt: { color: "#fff", fontSize: 14, fontFamily: fonts.sans.bold },

  backdrop: { flex: 1, backgroundColor: "rgba(28,25,23,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16 },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontFamily: fonts.serif.extra },
  sheetSub: { fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 4, marginBottom: 8 },
  quickItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  quickTxt: { fontSize: 13, fontFamily: fonts.sans.semibold, flex: 1 },

  warnBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 10 },
  warnText: { flex: 1, fontSize: 11, fontFamily: fonts.sans.medium, lineHeight: 15 },

  radio: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12 },
  radioDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioFill: { width: 8, height: 8, borderRadius: 4 },
  radioTxt: { fontSize: 13, fontFamily: fonts.sans.semibold },
  otherInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 13, minHeight: 70, fontFamily: fonts.sans.regular, textAlignVertical: "top" },
});
