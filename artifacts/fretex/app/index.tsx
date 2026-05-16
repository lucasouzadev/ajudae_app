import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { View, Text, ScrollView, Pressable, StyleSheet, Animated, Easing, PanResponder, Dimensions, RefreshControl, Modal, TextInput, Alert, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { supabase } from "@/lib/supabase";
import { useService } from "@/contexts/ServiceContext";
import { useRequests, type ServiceRequest } from "@/contexts/RequestsContext";
import { FILTERS, CATEGORY_COLORS, type Category, type Provider } from "@/constants/mockData";
import { fetchOnlineProviders } from "@/lib/providers";
import { toggleProviderActive } from "@/lib/providerAvailability";
import colors, { fonts, shadows } from "@/constants/colors";
import { TopNav } from "@/components/TopNav";
import { SideSheet } from "@/components/SideSheet";
import { ProfileOverlay } from "@/components/ProfileOverlay";
import { MapReal, type MapRealRef } from "@/components/MapReal";
import { Chip } from "@/components/Chip";
import { ProviderModal } from "@/components/ProviderModal";
import { Skeleton } from "@/components/Skeleton";
import { InfoSheet, type InfoItem } from "@/components/InfoSheet";

/* ─── Activity Heatmap ───────────────────────────────────────────────── */
const WEEKS = 12;
const DAYS = 7;
const CELL = 14;
const CELL_GAP = 3;

function buildHeatmapCells(requests: ServiceRequest[]): { count: number; day: Date }[] {
  const countMap: Record<string, number> = {};
  for (const req of requests) {
    if (req.status === "completed") {
      const d = new Date(req.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      countMap[key] = (countMap[key] ?? 0) + 1;
    }
  }
  const today = new Date();
  const cells: { count: number; day: Date }[] = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (w * DAYS + (DAYS - 1 - d)));
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      cells.push({ count: countMap[key] ?? 0, day: date });
    }
  }
  return cells;
}

function ActivityHeatmap() {
  const c = colors.light;
  const { requests } = useRequests();
  const { user } = useAuth();
  const providerRequests = requests.filter((r) => r.providerId === user?.id);
  const activityData = buildHeatmapCells(providerRequests);
  const cellColor = (count: number) => count > 0 ? c.primary : c.bgDeep;

  const totalServices = activityData.reduce((s, d) => s + (d.count > 0 ? d.count : 0), 0);
  const activeDays = activityData.filter((d) => d.count > 0).length;
  const streak = (() => {
    let s = 0;
    for (let i = activityData.length - 1; i >= 0; i--) {
      if (activityData[i].count > 0) s++;
      else break;
    }
    return s;
  })();

  return (
    <View style={[heatStyles.card, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
      <View style={heatStyles.head}>
        <Text style={[heatStyles.title, { color: c.text }]}>Atividade</Text>
        <Text style={[heatStyles.sub, { color: c.sub }]}>últimas {WEEKS} semanas</Text>
      </View>

      {/* Stats row */}
      <View style={heatStyles.statsRow}>
        <View style={[heatStyles.statPill, { backgroundColor: c.bgDeep }]}>
          <Text style={[heatStyles.statVal, { color: c.text }]}>{totalServices}</Text>
          <Text style={[heatStyles.statLbl, { color: c.sub }]}>serviços</Text>
        </View>
        <View style={[heatStyles.statPill, { backgroundColor: c.bgDeep }]}>
          <Text style={[heatStyles.statVal, { color: c.text }]}>{activeDays}</Text>
          <Text style={[heatStyles.statLbl, { color: c.sub }]}>dias ativos</Text>
        </View>
        <View style={[heatStyles.statPill, { backgroundColor: c.bgDeep }]}>
          <Text style={[heatStyles.statVal, { color: c.text }]}>{streak}</Text>
          <Text style={[heatStyles.statLbl, { color: c.sub }]}>sequência</Text>
        </View>
      </View>

      {/* Grid with day labels */}
      {(() => {
        const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
        return (
          <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 10 }}>
            {/* Day labels */}
            <View style={{ flexDirection: "column", gap: CELL_GAP, paddingTop: 18, marginRight: 4 }}>
              {DAY_LABELS.map((d, i) => (
                <Text key={i} style={{ fontSize: 11, fontFamily: fonts.sans.regular, color: c.softMuted, width: 28, textAlign: "right", height: CELL, lineHeight: CELL }}>{d}</Text>
              ))}
            </View>
            {/* Grid with month labels */}
            <View style={{ flex: 1 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: CELL_GAP }}>
                  {Array.from({ length: WEEKS }).map((_, w) => {
                    const firstDay = activityData[w * DAYS];
                    const prevFirstDay = w > 0 ? activityData[(w - 1) * DAYS] : null;
                    const showMonth = !prevFirstDay || firstDay?.day.getMonth() !== prevFirstDay?.day.getMonth();
                    return (
                      <View key={w} style={{ flexDirection: "column", gap: CELL_GAP }}>
                        <Text style={{ width: CELL, fontSize: 11, fontFamily: fonts.sans.regular, color: showMonth ? c.softMuted : "transparent", textAlign: "center", height: 14 }}>
                          {showMonth ? monthNames[firstDay?.day.getMonth() ?? 0] : ""}
                        </Text>
                        {Array.from({ length: DAYS }).map((_, d) => {
                          const cell = activityData[w * DAYS + d];
                          return (
                            <View
                              key={d}
                              style={[
                                heatStyles.cell,
                                { backgroundColor: cellColor(cell?.count ?? 0), width: CELL, height: CELL },
                              ]}
                            />
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
        );
      })()}

      {/* Legend */}
      <View style={heatStyles.legend}>
        <View style={[heatStyles.legendCell, { backgroundColor: c.bgDeep }]} />
        <Text style={[heatStyles.legendText, { color: c.softMuted }]}>Inativo</Text>
        <View style={[heatStyles.legendCell, { backgroundColor: c.primary }]} />
        <Text style={[heatStyles.legendText, { color: c.softMuted }]}>Ativo</Text>
      </View>

      {totalServices === 0 && (
        <View style={{ alignItems: "center", paddingVertical: 8 }}>
          <Text style={{ fontSize: 12, fontFamily: fonts.sans.regular, color: c.softMuted, textAlign: "center" }}>
            Complete seus primeiros serviços para ver análises de atividade.
          </Text>
        </View>
      )}
    </View>
  );
}

const heatStyles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title: { fontSize: 14, fontFamily: fonts.serif.extra },
  sub: { fontSize: 11, fontFamily: fonts.sans.regular },
  statsRow: { flexDirection: "row", gap: 8 },
  statPill: { flex: 1, borderRadius: 12, padding: 8, alignItems: "center" },
  statVal: { fontSize: 15, fontFamily: fonts.serif.extra },
  statLbl: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  cell: { borderRadius: 3 },
  legend: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  legendText: { fontSize: 11, fontFamily: fonts.sans.regular },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
  divider: { height: 1, marginVertical: 14 },
  reportTitle: { fontSize: 12, fontFamily: fonts.sans.bold, marginBottom: 10 },
  hourRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  hourLabel: { width: 72, fontSize: 11, fontFamily: fonts.sans.semibold },
  hourBar: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  hourFill: { height: 6, borderRadius: 3 },
  hourScore: { width: 34, fontSize: 11, fontFamily: fonts.sans.bold, textAlign: "right" },
  hourCat: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  hourCatText: { fontSize: 11, fontFamily: fonts.sans.bold },
});

/* ─── Provider home widgets ─────────────────────────────────────────── */

/* 1. Hot area banner */
const HOT_AREAS = [
  { area: "Méier", count: 4, cat: "Frete" },
  { area: "Tijuca", count: 3, cat: "Mudança" },
];
function HotAreaBanner({ onPress }: { onPress: () => void }) {
  const c = colors.light;
  const spot = HOT_AREAS[0];
  return (
    <Pressable
      onPress={onPress}
      style={[pStyles.hotBanner, { backgroundColor: `${c.primary}18`, borderColor: `${c.primary}55` }]}
    >
      <View style={[pStyles.hotDot, { backgroundColor: c.primary }]} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="flame" size={13} color={c.warning} />
          <Text style={[pStyles.hotTitle, { color: c.text }]}>
            {spot.count} pedidos abertos em {spot.area} agora
          </Text>
        </View>
        <Text style={[pStyles.hotSub, { color: c.sub }]}>
          Categoria {spot.cat} · aceite médio 4 min
        </Text>
      </View>
      <Ionicons name="arrow-forward" size={15} color="#8B6F00" />
    </Pressable>
  );
}

/* 2. Price suggestion */
function PriceSuggestion() {
  const c = colors.light;
  return (
    <View style={[pStyles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={pStyles.cardHead}>
        <Ionicons name="trending-up" size={15} color={c.blue} />
        <Text style={[pStyles.cardTitle, { color: c.text }]}>Sugestão de preço</Text>
        <Text style={[pStyles.cardBadge, { backgroundColor: c.blueLight, color: c.blue }]}>Em breve</Text>
      </View>
      <View style={{ alignItems: "center", paddingVertical: 16 }}>
        <Ionicons name="analytics-outline" size={28} color={c.softMuted} />
        <Text style={{ fontSize: 13, fontFamily: fonts.sans.regular, color: c.softMuted, textAlign: "center", marginTop: 8 }}>
          Análise de mercado disponível em breve.
        </Text>
      </View>
    </View>
  );
}

function DemandForecast() {
  const c = colors.light;
  return (
    <View style={[pStyles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={pStyles.cardHead}>
        <Ionicons name="pulse" size={15} color={c.blue} />
        <Text style={[pStyles.cardTitle, { color: c.text }]}>Previsão de demanda</Text>
        <Text style={[pStyles.cardBadge, { backgroundColor: c.blueLight, color: c.blue }]}>Em breve</Text>
      </View>
      <View style={{ alignItems: "center", paddingVertical: 16 }}>
        <Ionicons name="bar-chart-outline" size={28} color={c.softMuted} />
        <Text style={{ fontSize: 13, fontFamily: fonts.sans.regular, color: c.softMuted, textAlign: "center", marginTop: 8 }}>
          Previsão de demanda disponível em breve.
        </Text>
      </View>
    </View>
  );
}

function MonthlyGoals() {
  const c = colors.light;
  const { requests } = useRequests();
  const { user } = useAuth();
  const month = new Date().toLocaleDateString("pt-BR", { month: "long" });
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const providerCompleted = requests.filter(
    (r) => r.providerId === user?.id && r.status === "completed" && new Date(r.createdAt) >= monthStart
  );
  const monthEarned = providerCompleted.reduce((s, r) => s + r.price * 0.85, 0);
  const monthServices = providerCompleted.length;

  const goals = [
    { label: "Renda do mês", current: monthEarned, target: 3000, unit: "R$", color: "#16A34A", isFloat: true },
    { label: "Serviços", current: monthServices, target: 20, unit: "", color: "#2563EB", isFloat: false },
  ];

  return (
    <View style={[pStyles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={pStyles.cardHead}>
        <Ionicons name="flag" size={15} color={c.warning} />
        <Text style={[pStyles.cardTitle, { color: c.text }]}>Progresso de {month}</Text>
      </View>
      {goals.map((g) => {
        const pct = Math.min(g.current / g.target, 1);
        const display = g.isFloat
          ? g.current.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : String(g.current);
        const targetDisplay = g.isFloat
          ? g.target.toLocaleString("pt-BR")
          : String(g.target);
        return (
          <View key={g.label} style={pStyles.goalRow}>
            <View style={pStyles.goalLabelRow}>
              <Text style={[pStyles.goalLabel, { color: c.text }]}>{g.label}</Text>
              <Text style={[pStyles.goalValue, { color: g.color }]}>
                {g.unit}{display}
                <Text style={[pStyles.goalTarget, { color: c.softMuted }]}>
                  {" "}/ {g.unit}{targetDisplay}
                </Text>
              </Text>
            </View>
            <View style={[pStyles.goalTrack, { backgroundColor: c.background }]}>
              <View style={[pStyles.goalFill, { width: `${pct * 100}%` as any, backgroundColor: g.color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function BadgeRow() {
  const c = colors.light;
  const { requests } = useRequests();
  const { user } = useAuth();
  const providerCompleted = requests.filter((r) => r.providerId === user?.id && r.status === "completed");
  const totalCompleted = providerCompleted.length;
  const freightCompleted = providerCompleted.filter((r) => r.serviceType === "Frete").length;
  const activityData = buildHeatmapCells(providerCompleted);
  const streak = (() => {
    let s = 0;
    for (let i = activityData.length - 1; i >= 0; i--) {
      if (activityData[i].count > 0) s++;
      else break;
    }
    return s;
  })();

  const badges: { icon: "trophy" | "flash" | "flame" | "shield-checkmark"; label: string; unlocked: boolean; target: number; current: number }[] = [
    { icon: "trophy", label: "100 serviços", unlocked: totalCompleted >= 100, target: 100, current: Math.min(totalCompleted, 100) },
    { icon: "flash", label: "50 fretes", unlocked: freightCompleted >= 50, target: 50, current: Math.min(freightCompleted, 50) },
    { icon: "flame", label: "7 dias seguidos", unlocked: streak >= 7, target: 7, current: Math.min(streak, 7) },
    { icon: "shield-checkmark", label: "Verificado", unlocked: Boolean(user?.verified), target: 1, current: user?.verified ? 1 : 0 },
  ];

  return (
    <View style={[pStyles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[pStyles.cardHead, { marginBottom: 14 }]}>
        <Ionicons name="ribbon" size={15} color={c.warning} />
        <Text style={[pStyles.cardTitle, { color: c.text }]}>Conquistas</Text>
        <Text style={[pStyles.cardBadge, { backgroundColor: c.successLight, color: c.success }]}>
          {badges.filter((b) => b.unlocked).length}/{badges.length}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {badges.map((b) => (
          <View
            key={b.label}
            style={[
              pStyles.badge,
              {
                backgroundColor: b.unlocked ? `${c.primary}18` : c.background,
                borderColor: b.unlocked ? c.primary : c.border,
                opacity: b.unlocked ? 1 : 0.6,
              },
            ]}
          >
            <View style={[pStyles.badgeIconWrap, { backgroundColor: b.unlocked ? `${c.primary}22` : c.muted }]}>
              <Ionicons name={b.icon} size={18} color={b.unlocked ? c.primaryDeep : c.softMuted} />
            </View>
            <Text style={[pStyles.badgeLabel, { color: b.unlocked ? c.text : c.softMuted }]}>{b.label}</Text>
            {!b.unlocked ? (
              <Text style={[pStyles.badgeProgress, { color: c.softMuted }]}>
                {b.current}/{b.target}
              </Text>
            ) : (
              <View style={[pStyles.badgeCheck, { backgroundColor: c.success }]}>
                <Ionicons name="checkmark" size={9} color="#fff" />
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/* 6. Recent reviews carousel */
function RecentReviews() {
  const c = colors.light;
  return (
    <View style={[pStyles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[pStyles.cardHead, { marginBottom: 12 }]}>
        <Ionicons name="star" size={15} color={c.warning} />
        <Text style={[pStyles.cardTitle, { color: c.text }]}>Avaliações recentes</Text>
      </View>
      <View style={{ alignItems: "center", paddingVertical: 16 }}>
        <Ionicons name="star-outline" size={28} color={c.softMuted} />
        <Text style={{ fontSize: 13, fontFamily: fonts.sans.regular, color: c.softMuted, textAlign: "center", marginTop: 8 }}>
          Sem avaliações ainda.{"\n"}Complete serviços para receber avaliações.
        </Text>
      </View>
    </View>
  );
}

const pStyles = StyleSheet.create({
  hotBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  hotDot: { width: 8, height: 8, borderRadius: 4 },
  hotTitle: { fontSize: 13, fontFamily: fonts.sans.bold },
  hotSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 1 },
});



type TabKey = "inicio" | "pedidos" | "marketplace" | "inbox" | "portfolio" | "proposals";

export default function HomeScreen() {
  const { user, role } = useAuth();
  if (!user) return null;
  return role === "cliente" ? <ClienteTabsWrapper /> : <PrestadorTabsWrapper />;
}

/* ─── Tab Wrappers ──────────────────────────────────────────────────────── */
function ClienteTabsWrapper() {
  const [tab, setTab] = useState<"inicio" | "pedidos">("inicio");
  const { active } = useService();
  const router = useRouter();
  const hasBadge = !!(active && active.status !== "completed" && active.status !== "cancelled");
  const handleTabPress = (key: string) => {
    if (key === "marketplace") { router.push("/marketplace"); return; }
    if (key === "proposals") { router.push("/proposals" as any); return; }
    setTab(key as "inicio" | "pedidos");
  };
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, display: tab === "inicio" ? "flex" : "none" }}><ClienteHome /></View>
        <View style={{ flex: 1, display: tab === "pedidos" ? "flex" : "none" }}><PedidosTab onGoHome={() => setTab("inicio")} /></View>
      </View>
      <BottomTabBar active={tab} role="cliente" hasBadge={hasBadge} onPress={handleTabPress} />
    </View>
  );
}

function PrestadorTabsWrapper() {
  const [tab] = useState<"inicio">("inicio");
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const { active } = useService();
  const router = useRouter();
  const hasBadge = !!(active && ["requested", "accepted", "en_route", "in_progress"].includes(active.status ?? ""));
  const handleTabPress = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (key === "inbox") { router.push("/inbox"); return; }
    if (key === "proposals") { router.push("/proposals" as any); return; }
    if (key === "marketplace") { router.push("/marketplace"); return; }
    if (key === "portfolio") { setPortfolioOpen(true); return; }
  };
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }}><PrestadorHome /></View>
      </View>
      <BottomTabBar active={tab} role="prestador" hasBadge={hasBadge} onPress={handleTabPress} />
      {/* Portfólio — modal pageSheet */}
      <Modal visible={portfolioOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPortfolioOpen(false)}>
        <PortfolioSheet onClose={() => setPortfolioOpen(false)} />
      </Modal>
    </View>
  );
}

/* ─── BottomTabBar ──────────────────────────────────────────────────────── */
function BottomTabBar({
  active,
  role,
  hasBadge,
  onPress,
}: {
  active: TabKey;
  role: "cliente" | "prestador";
  hasBadge?: boolean;
  onPress: (tab: TabKey) => void;
}) {
  const c = colors.light;
  const insets = useSafeAreaInsets();

  const tabs =
    role === "cliente"
      ? [
          { key: "inicio" as TabKey, label: "Início", icon: "home" as const, lib: "ion" as const },
          { key: "pedidos" as TabKey, label: "Pedidos", icon: "truck" as const, lib: "mc" as const, badge: hasBadge },
          { key: "proposals" as TabKey, label: "Propostas", icon: "file-tray-full" as const, lib: "ion" as const },
          { key: "marketplace" as TabKey, label: "Explorar", icon: "storefront" as const, lib: "ion" as const },
        ]
      : [
          { key: "inicio" as TabKey, label: "Home", icon: "home" as const, lib: "ion" as const, badge: hasBadge },
          { key: "proposals" as TabKey, label: "Propostas", icon: "file-tray-full" as const, lib: "ion" as const },
          { key: "inbox" as TabKey, label: "Mensagens", icon: "chatbubbles" as const, lib: "ion" as const },
          { key: "marketplace" as TabKey, label: "Mercado", icon: "storefront" as const, lib: "ion" as const },
          { key: "portfolio" as TabKey, label: "Portfólio", icon: "briefcase" as const, lib: "ion" as const },
        ];

  return (
    <View
      style={[
        tabBarStyles.bar,
        { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: insets.bottom || 8 },
        shadows.sm,
      ]}
    >
      {tabs.map((t) => {
        const on = active === t.key;
        return (
          <Pressable key={t.key} onPress={() => onPress(t.key)} style={tabBarStyles.item}>
            {on && <View style={[tabBarStyles.indicator, { backgroundColor: c.primary }]} />}
            <View style={{ position: "relative" }}>
              {t.lib === "mc" ? (
                <MaterialCommunityIcons name={t.icon as any} size={22} color={on ? c.text : c.softMuted} />
              ) : (
                <Ionicons name={t.icon as any} size={22} color={on ? c.text : c.softMuted} />
              )}
              {t.badge && (
                <View style={[tabBarStyles.dot, { backgroundColor: c.primary, borderColor: c.card }]} />
              )}
            </View>
            <Text style={[tabBarStyles.label, { color: on ? c.text : c.softMuted }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 4,
    gap: 3,
    position: "relative",
  },
  indicator: {
    position: "absolute",
    top: -8,
    width: 24,
    height: 3,
    borderRadius: 1.5,
  },
  label: { fontSize: 11, fontFamily: fonts.sans.bold },
  dot: {
    position: "absolute",
    top: -1,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});

/* ─── PedidosTab (Cliente) ──────────────────────────────────────────────── */

function deriveTimeline(status: string): { label: string; done: boolean }[] {
  const steps = [
    { label: "Solicitado", keys: ["requested", "matching", "accepted", "provider_en_route", "provider_arrived", "in_progress", "completed_pending_confirmation", "completed", "cancelled", "disputed"] },
    { label: "Aceito", keys: ["accepted", "provider_en_route", "provider_arrived", "in_progress", "completed_pending_confirmation", "completed"] },
    { label: "A caminho", keys: ["provider_en_route", "provider_arrived", "in_progress", "completed_pending_confirmation", "completed"] },
    { label: "Em andamento", keys: ["in_progress", "completed_pending_confirmation", "completed"] },
    { label: "Concluído", keys: ["completed"] },
  ];
  if (status === "cancelled") {
    return [
      { label: "Solicitado", done: true },
      { label: "Cancelado", done: true },
    ];
  }
  if (status === "disputed") {
    return [
      { label: "Solicitado", done: true },
      { label: "Em disputa", done: true },
    ];
  }
  return steps.map((s) => ({ label: s.label, done: s.keys.includes(status) }));
}

function formatRequestDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function catColor(serviceType: string): string {
  if (serviceType === "Mudança") return "#FF5500";
  if (serviceType === "Frete") return "#2563EB";
  if (serviceType === "Entrega") return "#16A34A";
  return "#FF5500";
}

const STATUS_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  in_progress: { label: "Em andamento", bg: "#FEF3C7", fg: "#D97706" },
  completed: { label: "Concluído", bg: "#DCFCE7", fg: "#16A34A" },
  cancelled: { label: "Cancelado", bg: "#FEE2E2", fg: "#DC2626" },
  requested: { label: "Aguardando", bg: "#DBEAFE", fg: "#2563EB" },
  matching: { label: "Buscando", bg: "#DBEAFE", fg: "#2563EB" },
  accepted: { label: "Aceito", bg: "#DCFCE7", fg: "#16A34A" },
  provider_en_route: { label: "A caminho", bg: "#FEF3C7", fg: "#D97706" },
  provider_arrived: { label: "Chegou", bg: "#FEF3C7", fg: "#D97706" },
  completed_pending_confirmation: { label: "Aguardando PIN", bg: "#EDE9FE", fg: "#7C3AED" },
  disputed: { label: "Em disputa", bg: "#FEE2E2", fg: "#DC2626" },
};

function PedidoDetailModal({ pedido, onClose }: { pedido: ServiceRequest; onClose: () => void }) {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const color = catColor(pedido.serviceType);
  const st = STATUS_LABEL[pedido.status] || STATUS_LABEL.requested;
  const isCompleted = pedido.status === "completed";
  const isCancelled = pedido.status === "cancelled";
  const providerName = pedido.providerName ?? "Prestador";
  const providerIni = providerName.split(" ").map((p) => p[0]).slice(0, 2).join("");
  const priceBase = pedido.price > 0 ? pedido.price * 0.85 : 0;
  const priceTaxa = pedido.price > 0 ? pedido.price * 0.15 : 0;
  const timeline = deriveTimeline(pedido.status);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.background }}>
        {/* Header */}
        <View style={[{ paddingTop: insets.top + 12, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border, flexDirection: "row", alignItems: "center", gap: 10 }]}>
          <Pressable onPress={onClose} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.background, borderWidth: 1, borderColor: c.borderLight, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="close" size={18} color={c.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: fonts.sans.bold, color: c.text }}>{pedido.serviceType} · #{pedido.id.slice(0, 8)}</Text>
            <Text style={{ fontSize: 11, fontFamily: fonts.sans.regular, color: c.softMuted, marginTop: 1 }}>{formatRequestDate(pedido.createdAt)}</Text>
          </View>
          <View style={[{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: st.bg }]}>
            <Text style={{ fontSize: 11, fontFamily: fonts.sans.bold, color: st.fg }}>{st.label}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
          {/* Provider */}
          <View style={[{ backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 }, shadows.sm]}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: color === "#FFCC00" ? "#1A1714" : "#fff", fontSize: 15, fontFamily: fonts.serif.extra }}>{providerIni}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: fonts.sans.bold, color: c.text }}>{providerName}</Text>
              <Text style={{ fontSize: 11, fontFamily: fonts.sans.regular, color: c.softMuted, marginTop: 2 }}>{pedido.serviceType}</Text>
            </View>
            {!isCancelled && pedido.providerId && (
              <Pressable
                onPress={() => { onClose(); router.push({ pathname: "/chat", params: { id: pedido.id, name: providerName, ini: providerIni, color, type: "dm", requestId: pedido.id } } as any); }}
                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${color}18`, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="chatbubble-ellipses" size={16} color={color} />
              </Pressable>
            )}
          </View>

          {/* Addresses */}
          <View style={[{ backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 12 }, shadows.sm]}>
            <Text style={{ fontSize: 10, fontFamily: fonts.sans.bold, color: c.softMuted, letterSpacing: 0.6, marginBottom: 10 }}>ENDEREÇOS</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="radio-button-on" size={13} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontFamily: fonts.sans.bold, color: c.softMuted, letterSpacing: 0.4 }}>ORIGEM</Text>
                <Text style={{ fontSize: 13, fontFamily: fonts.sans.semibold, color: c.text, marginTop: 2 }}>{pedido.origin || "—"}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="location" size={13} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontFamily: fonts.sans.bold, color: c.softMuted, letterSpacing: 0.4 }}>DESTINO</Text>
                <Text style={{ fontSize: 13, fontFamily: fonts.sans.semibold, color: c.text, marginTop: 2 }}>{pedido.destination || "—"}</Text>
              </View>
            </View>
          </View>

          {/* Price */}
          <View style={[{ backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 12 }, shadows.sm]}>
            <Text style={{ fontSize: 10, fontFamily: fonts.sans.bold, color: c.softMuted, letterSpacing: 0.6, marginBottom: 10 }}>PAGAMENTO</Text>
            {pedido.price > 0 ? (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, fontFamily: fonts.sans.regular, color: c.sub }}>Serviço</Text>
                  <Text style={{ fontSize: 13, fontFamily: fonts.sans.semibold, color: c.text }}>
                    {priceBase.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                  <Text style={{ fontSize: 13, fontFamily: fonts.sans.regular, color: c.sub }}>Taxa da plataforma</Text>
                  <Text style={{ fontSize: 13, fontFamily: fonts.sans.semibold, color: c.text }}>
                    {priceTaxa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </Text>
                </View>
                <View style={{ height: 1, backgroundColor: c.borderLight, marginBottom: 10 }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 14, fontFamily: fonts.sans.bold, color: c.text }}>Total</Text>
                  <Text style={{ fontSize: 16, fontFamily: fonts.serif.extra, color }}>
                    {pedido.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={{ fontSize: 13, fontFamily: fonts.sans.regular, color: c.softMuted }}>Valor a confirmar</Text>
            )}
          </View>

          {/* Timeline */}
          <View style={[{ backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 16 }, shadows.sm]}>
            <Text style={{ fontSize: 10, fontFamily: fonts.sans.bold, color: c.softMuted, letterSpacing: 0.6, marginBottom: 12 }}>LINHA DO TEMPO</Text>
            {timeline.map((t, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: i < timeline.length - 1 ? 12 : 0 }}>
                <View style={{ alignItems: "center", width: 22 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.done ? (isCancelled && i === timeline.length - 1 ? "#FEE2E2" : "#DCFCE7") : c.borderLight, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={t.done ? (isCancelled && i === timeline.length - 1 ? "close" : "checkmark") : "ellipse-outline"} size={12} color={t.done ? (isCancelled && i === timeline.length - 1 ? "#DC2626" : "#16A34A") : c.softMuted} />
                  </View>
                  {i < timeline.length - 1 && <View style={{ width: 1, height: 14, backgroundColor: t.done ? c.success : c.borderLight, marginTop: 3 }} />}
                </View>
                <View style={{ flex: 1, paddingTop: 2 }}>
                  <Text style={{ fontSize: 13, fontFamily: t.done ? fonts.sans.semibold : fonts.sans.regular, color: t.done ? c.text : c.softMuted }}>{t.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Actions */}
          {isCompleted && pedido.providerId && (
            <Pressable
              onPress={() => { onClose(); router.push({ pathname: "/chat", params: { id: pedido.id, name: providerName, ini: providerIni, color, type: "dm", requestId: pedido.id } } as any); }}
              style={[{ height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: color }, shadows.sm]}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color={color === "#FFCC00" ? "#1A1714" : "#fff"} />
              <Text style={{ fontSize: 14, fontFamily: fonts.sans.bold, color: color === "#FFCC00" ? "#1A1714" : "#fff" }}>Mensagem ao prestador</Text>
            </Pressable>
          )}
          {!isCompleted && !isCancelled && (
            <Pressable
              onPress={() => { onClose(); router.push("/track"); }}
              style={[{ height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: c.primary }, shadows.sm]}
            >
              <Ionicons name="navigate" size={16} color="#1A1714" />
              <Text style={{ fontSize: 14, fontFamily: fonts.sans.bold, color: "#1A1714" }}>Acompanhar serviço</Text>
            </Pressable>
          )}
          {(isCompleted || isCancelled) && (
            <Pressable
              onPress={() => { onClose(); router.push("/ticket"); }}
              style={[{ height: 44, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, marginTop: 8 }]}
            >
              <Ionicons name="warning-outline" size={15} color={c.softMuted} />
              <Text style={{ fontSize: 13, fontFamily: fonts.sans.semibold, color: c.sub }}>Reportar problema</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function PedidosTab({ onGoHome }: { onGoHome: () => void }) {
  const c = colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { active } = useService();
  const { requests } = useRequests();
  const initials = (user?.name || "RA").split(" ").map((p) => p[0]).slice(0, 2).join("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<ServiceRequest | null>(null);
  const hasActive = !!(active && active.status !== "completed" && active.status !== "cancelled");
  const clientRequests = requests.filter((r) => r.customerId === user?.id);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <TopNav
        title="Meus Pedidos"
        subtitle="Solicitações e histórico"
        initials={initials}
        badge={hasActive}
        accentColor={c.primary}
        onMenuOpen={() => setMenuOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 24 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {hasActive && active ? (
          <Pressable
            onPress={() => router.push("/track")}
            style={[pedidosStyles.activeBanner, { backgroundColor: c.primary }, shadows.md]}
          >
            <View style={[pedidosStyles.pulseDot, { backgroundColor: "#1A1714" }]} />
            <View style={{ flex: 1 }}>
              <Text style={pedidosStyles.activeBannerEye}>EM ANDAMENTO</Text>
              <Text style={pedidosStyles.activeBannerTitle}>{active.category} · Acompanhar →</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#1A1714" />
          </Pressable>
        ) : null}

        <View style={[pedidosStyles.quickRow]}>
          <Pressable
            onPress={() => router.push("/marketplace")}
            style={[pedidosStyles.quickBtn, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}
          >
            <Ionicons name="add-circle" size={18} color={c.primary} />
            <Text style={[pedidosStyles.quickLabel, { color: c.text }]}>Nova solicitação</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/inbox")}
            style={[pedidosStyles.quickBtn, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}
          >
            <Ionicons name="chatbubbles" size={18} color={c.blue} />
            <Text style={[pedidosStyles.quickLabel, { color: c.text }]}>Mensagens</Text>
          </Pressable>
        </View>

        <Text style={[pedidosStyles.sectionTitle, { color: c.text }]}>Histórico</Text>
        {clientRequests.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <Ionicons name="receipt-outline" size={32} color={c.softMuted} />
            <Text style={{ fontSize: 13, fontFamily: fonts.sans.regular, color: c.softMuted, marginTop: 10, textAlign: "center" }}>
              Nenhum pedido realizado ainda.{"\n"}Solicite seu primeiro serviço!
            </Text>
          </View>
        ) : (
          clientRequests.map((p) => {
            const st = STATUS_LABEL[p.status] || STATUS_LABEL.requested;
            const color = catColor(p.serviceType);
            return (
              <Pressable
                key={p.id}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setSelectedPedido(p); }}
                style={[pedidosStyles.card, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}
              >
                <View style={[pedidosStyles.catDot, { backgroundColor: `${color}22` }]}>
                  {p.serviceType === "Mudança" ? (
                    <Ionicons name="home" size={16} color={color} />
                  ) : p.serviceType === "Frete" ? (
                    <MaterialCommunityIcons name="truck" size={16} color={color} />
                  ) : (
                    <Ionicons name="cube" size={16} color={color} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[pedidosStyles.cardTitle, { color: c.text }]}>{p.serviceType} · {p.providerName ?? "Aguardando"}</Text>
                  <Text style={[pedidosStyles.cardSub, { color: c.softMuted }]}>{formatRequestDate(p.createdAt)} · #{p.id.slice(0, 8)}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  {p.price > 0 ? (
                    <Text style={[pedidosStyles.cardPrice, { color: c.text }]}>{p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text>
                  ) : (
                    <Text style={[pedidosStyles.cardPrice, { color: c.softMuted }]}>A confirmar</Text>
                  )}
                  <View style={[pedidosStyles.statusBadge, { backgroundColor: st.bg }]}>
                    <Text style={[pedidosStyles.statusText, { color: st.fg }]}>{st.label}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={14} color={c.softMuted} />
              </Pressable>
            );
          })
        )}
      </ScrollView>
      {selectedPedido && <PedidoDetailModal pedido={selectedPedido} onClose={() => setSelectedPedido(null)} />}
      <SideSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} name={user?.name || "Cliente"} initials={initials} />
    </View>
  );
}

const pedidosStyles = StyleSheet.create({
  activeBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, padding: 14, marginBottom: 14 },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  activeBannerEye: { fontSize: 10, fontFamily: fonts.sans.bold, color: "#1A1714", opacity: 0.7, letterSpacing: 0.5 },
  activeBannerTitle: { fontSize: 14, fontFamily: fonts.sans.bold, color: "#1A1714" },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  quickBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, borderWidth: 1, padding: 14 },
  quickLabel: { fontSize: 13, fontFamily: fonts.sans.bold },
  sectionTitle: { fontSize: 14, fontFamily: fonts.serif.extra, marginBottom: 10 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  catDot: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 13, fontFamily: fonts.sans.bold },
  cardSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  cardPrice: { fontSize: 14, fontFamily: fonts.serif.extra },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, fontFamily: fonts.sans.bold },
});

/* ─── HistoricoTab (Prestador) ──────────────────────────────────────────── */
function HistoricoTab() {
  const c = colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { requests } = useRequests();
  const initials = (user?.name || "CO").split(" ").map((p) => p[0]).slice(0, 2).join("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const providerRequests = requests.filter((r) => r.providerId === user?.id);
  const completedRequests = providerRequests.filter((r) => r.status === "completed");
  const totalEarned = completedRequests.reduce((s, r) => s + r.price * 0.85, 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <TopNav
        title="Histórico"
        subtitle="Serviços realizados"
        initials={initials}
        accentColor={c.blue}
        onMenuOpen={() => setMenuOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 24 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[histStyles.summaryRow]}>
          <View style={[histStyles.summaryCard, { backgroundColor: c.successLight, borderColor: `${c.success}33` }, shadows.sm]}>
            <Text style={[histStyles.summaryVal, { color: c.success }]}>{totalEarned.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text>
            <Text style={[histStyles.summaryLbl, { color: c.sub }]}>Total recebido</Text>
          </View>
          <View style={[histStyles.summaryCard, { backgroundColor: c.blueLight, borderColor: `${c.blue}33` }, shadows.sm]}>
            <Text style={[histStyles.summaryVal, { color: c.blue }]}>{completedRequests.length}</Text>
            <Text style={[histStyles.summaryLbl, { color: c.sub }]}>Concluídos</Text>
          </View>
        </View>

        <View style={[histStyles.quickRow]}>
          <Pressable
            onPress={() => router.push("/inbox")}
            style={[histStyles.quickBtn, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}
          >
            <Ionicons name="chatbubbles" size={18} color={c.blue} />
            <Text style={[histStyles.quickLabel, { color: c.text }]}>Mensagens</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/support")}
            style={[histStyles.quickBtn, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}
          >
            <Ionicons name="help-circle" size={18} color={c.softMuted} />
            <Text style={[histStyles.quickLabel, { color: c.text }]}>Suporte</Text>
          </Pressable>
        </View>

        <Text style={[histStyles.sectionTitle, { color: c.text }]}>Serviços recentes</Text>
        {providerRequests.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <Ionicons name="briefcase-outline" size={32} color={c.softMuted} />
            <Text style={{ fontSize: 13, fontFamily: fonts.sans.regular, color: c.softMuted, marginTop: 10, textAlign: "center" }}>
              Nenhum serviço realizado ainda.{"\n"}Fique online para receber pedidos!
            </Text>
          </View>
        ) : (
          providerRequests.map((h) => {
            const st = STATUS_LABEL[h.status] || STATUS_LABEL.requested;
            const color = catColor(h.serviceType);
            const earned = h.status === "completed" && h.price > 0
              ? (h.price * 0.85).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
              : "—";
            return (
              <View key={h.id} style={[histStyles.card, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
                <View style={[histStyles.catDot, { backgroundColor: `${color}22` }]}>
                  {h.serviceType === "Mudança" ? (
                    <Ionicons name="home" size={16} color={color} />
                  ) : h.serviceType === "Frete" ? (
                    <MaterialCommunityIcons name="truck" size={16} color={color} />
                  ) : (
                    <Ionicons name="cube" size={16} color={color} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[histStyles.cardTitle, { color: c.text }]}>{h.serviceType} · {h.clientName ?? "Cliente"}</Text>
                  <Text style={[histStyles.cardSub, { color: c.softMuted }]}>{formatRequestDate(h.createdAt)} · #{h.id.slice(0, 8)}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={[histStyles.cardEarned, { color: h.status === "completed" ? c.success : c.softMuted }]}>{earned}</Text>
                  <View style={[histStyles.statusBadge, { backgroundColor: st.bg }]}>
                    <Text style={[histStyles.statusText, { color: st.fg }]}>{st.label}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      <SideSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} name={user?.name || "Prestador"} initials={initials} />
    </View>
  );
}

const histStyles = StyleSheet.create({
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center" },
  summaryVal: { fontSize: 18, fontFamily: fonts.serif.extra },
  summaryLbl: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 3 },
  quickRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  quickBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, borderWidth: 1, padding: 14 },
  quickLabel: { fontSize: 13, fontFamily: fonts.sans.bold },
  sectionTitle: { fontSize: 14, fontFamily: fonts.serif.extra, marginBottom: 10 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  catDot: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 13, fontFamily: fonts.sans.bold },
  cardSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  cardEarned: { fontSize: 14, fontFamily: fonts.serif.extra },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, fontFamily: fonts.sans.bold },
});

/* ─── PerfilTab (Both roles) ────────────────────────────────────────────── */
const PERFIL_ITEMS = [
  { icon: "card" as const, label: "Métodos de Pagamento", sub: "Gerenciar formas de pagamento", color: "#16A34A" },
  { icon: "location" as const, label: "Meus Endereços", sub: "Gerenciar endereços salvos", color: "#FF5500" },
  { icon: "list" as const, label: "Histórico de Pedidos", sub: "Ver todos os pedidos", color: "#2563EB" },
  { icon: "star" as const, label: "Avaliações", sub: "Ver avaliações recebidas", color: "#F59E0B" },
  { icon: "lock-closed" as const, label: "Segurança", sub: "PIN e documentos", color: "#9333EA" },
  { icon: "settings" as const, label: "Configurações", sub: "Notificações, privacidade", color: "#6B7280" },
];

function PerfilTab() {
  const c = colors.light;
  const { user, role, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const initials = (user?.name || "RA").split(" ").map((p) => p[0]).slice(0, 2).join("");
  const accent = role === "cliente" ? c.primary : c.blue;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <TopNav
        title="Perfil"
        subtitle={role === "cliente" ? "Conta de cliente" : "Conta de prestador"}
        initials={initials}
        accentColor={accent}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 24 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <View style={[perfilStyles.headerCard, { backgroundColor: c.card, borderColor: c.border }, shadows.md]}>
          <LinearGradient
            colors={[accent, role === "cliente" ? "#FF8C5A" : "#60A5FA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={perfilStyles.avatar}
          >
            <Text style={perfilStyles.avatarText}>{initials}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[perfilStyles.name, { color: c.text }]}>{user?.name || "Usuário"}</Text>
            <Text style={[perfilStyles.role, { color: c.softMuted }]}>
              {role === "cliente" ? "Cliente · Ajudaê" : "Prestador · Ajudaê"}
            </Text>
          </View>
          {role === "prestador" && !user?.verified && (
            <View style={[perfilStyles.verifyBadge, { backgroundColor: "#FEF3C7" }]}>
              <Text style={[perfilStyles.verifyText, { color: "#D97706" }]}>Aguardando aprovação</Text>
            </View>
          )}
        </View>

        {/* Menu items */}
        {PERFIL_ITEMS.map((item) => (
          <Pressable
            key={item.label}
            style={[perfilStyles.menuRow, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}
          >
            <View style={[perfilStyles.iconBox, { backgroundColor: `${item.color}18` }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[perfilStyles.menuLabel, { color: c.text }]}>{item.label}</Text>
              <Text style={[perfilStyles.menuSub, { color: c.softMuted }]}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.softMuted} />
          </Pressable>
        ))}

        {/* Sign out */}
        <Pressable
          onPress={() => {
            logout();
          }}
          style={[perfilStyles.menuRow, { backgroundColor: "#FFF5F5", borderColor: "#FEE2E2", marginTop: 8 }, shadows.sm]}
        >
          <View style={[perfilStyles.iconBox, { backgroundColor: "#FEE2E2" }]}>
            <Ionicons name="log-out" size={18} color="#DC2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[perfilStyles.menuLabel, { color: "#DC2626" }]}>Sair da conta</Text>
            <Text style={[perfilStyles.menuSub, { color: "#EF444488" }]}>Encerrar sessão</Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const perfilStyles = StyleSheet.create({
  headerCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontFamily: fonts.serif.extra },
  name: { fontSize: 16, fontFamily: fonts.serif.extra },
  role: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  verifyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  verifyText: { fontSize: 11, fontFamily: fonts.sans.bold },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 13, fontFamily: fonts.sans.bold },
  menuSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
});

/* ─── ClienteHome ─────────────────────────────────────────────────────── */
function ClienteHome() {
  const c = colors.light;
  const router = useRouter();
  const { user } = useAuth();
  const { active: activeService } = useService();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapRealRef>(null);
  const isMountedRef = useRef(true);
  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Todos");
  const [active, setActive] = useState<Provider | null>(null);   // pin focado (1º toque)
  const sheetHeightAnim = useRef(new Animated.Value(COLLAPSED_H)).current;
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [modalProvider, setModalProvider] = useState<Provider | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [locating, setLocating] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoadingProviders(true);
    fetchOnlineProviders().then((data) => {
      if (mounted) {
        setProviders(data);
        setLoadingProviders(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOnlineProviders().then((data) => {
      if (isMountedRef.current) {
        setProviders(data);
        setRefreshing(false);
      }
    });
  };

  const handleLocate = () => {
    if (locating) return;
    setLocating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    spinAnim.setValue(0);
    spinLoop.current = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 700, useNativeDriver: true })
    );
    spinLoop.current.start();
    // ?? Promise.resolve() garante que .finally() nunca recebe undefined
    (mapRef.current?.recenter() ?? Promise.resolve()).finally(() => {
      spinLoop.current?.stop();
      spinAnim.setValue(0);
      setLocating(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    });
  };

  const locateSpin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const filtered = useMemo(
    () => (filter === "Todos" ? providers : providers.filter((p) => p.cat === filter)),
    [filter, providers]
  );

  const counts = useMemo(() => {
    const result: Record<string, number> = { Todos: providers.length };
    (["Mudança", "Frete", "Entrega"] as Category[]).forEach((k) => {
      result[k] = providers.filter((p) => p.cat === k).length;
    });
    return result;
  }, [providers]);

  useEffect(() => {
    const target = providers.length === 0 ? EMPTY_H : COLLAPSED_H;
    sheetHeightAnim.stopAnimation();
    sheetHeightAnim.setValue(target);
    if (providers.length === 0) {
      setActive(null);
    }
  }, [providers.length, sheetHeightAnim]);

  const initials = (user?.name || "RA").split(" ").map((p) => p[0]).slice(0, 2).join("");

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* Map area — encolhe à medida que o sheet sobe */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: sheetHeightAnim,   // map height = screen - sheet height
          overflow: "hidden",
        }}
      >
        <MapReal
          ref={mapRef}
          pins={filtered.map((p) => ({ id: p.id, cat: p.cat, color: p.color, label: p.price, lat: p.lat, lng: p.lng }))}
          activeId={active?.id ?? null}
          onPinPress={(id) => {
            const p = filtered.find((x) => x.id === id);
            if (!p) return;
            if (active?.id === id) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              setModalProvider(p);
              setActive(null);
            } else {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setActive(p);
            }
          }}
        />
      </Animated.View>

      {/* Botão de localização — acima dos chips de filtro, animado com o sheet */}
      <Animated.View
        style={{
          position: "absolute",
          right: 16,
          bottom: sheetHeightAnim.interpolate({
            inputRange: [EMPTY_H, COLLAPSED_H],
            outputRange: [EMPTY_H + CHIP_ROW_H + 12, COLLAPSED_H + CHIP_ROW_H + 12],
            extrapolate: "clamp",
          }),
          zIndex: 40,
        }}
      >
        <Pressable
          style={({ pressed }) => [
            styles.locateBtn,
            {
              backgroundColor: locating ? c.blue : c.card,
              borderWidth: 1.5,
              borderColor: locating ? c.blue : c.blue,
              opacity: pressed ? 0.75 : 1,
            },
            shadows.md,
          ]}
          onPress={handleLocate}
          hitSlop={8}
        >
          <Animated.View style={{ transform: [{ rotate: locateSpin }] }}>
            <Ionicons name="locate" size={20} color={locating ? "#fff" : c.blue} />
          </Animated.View>
        </Pressable>
      </Animated.View>

      <TopNav
        title="Ajudaê!"
        subtitle="Tijuca, Rio de Janeiro"
        initials={initials}
        badge
        onMenuOpen={() => setMenuOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
        onInfo={() => setInfoOpen(true)}
      />


      {/* Active service tracking banner */}
      {activeService && activeService.status !== "completed" && activeService.status !== "cancelled" ? (
        <Pressable
          onPress={() => router.push(activeService.status === "en_route" && activeService.pin_start ? "/confirm-start-pin" : "/track")}
          style={[
            styles.trackBanner,
            {
              top: insets.top + 70,
              backgroundColor:
                activeService.status === "en_route" && activeService.pin_start
                  ? c.primary
                  : activeService.category === "Mudança"
                  ? c.primary
                  : activeService.category === "Frete"
                  ? c.blue
                  : c.success,
            },
            shadows.md,
          ]}
        >
          <View style={styles.trackPulse} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.trackEyebrow, { color: activeService.status === "en_route" && activeService.pin_start ? "#1A1714" : "#fff", opacity: 0.75 }]}>
              {activeService.status === "en_route" && activeService.pin_start
                ? "AÇÃO NECESSÁRIA"
                : `ACOMPANHAR · #${activeService.id.slice(-6).toUpperCase()}`}
            </Text>
            <Text style={[styles.trackTitle, { color: activeService.status === "en_route" && activeService.pin_start ? "#1A1714" : "#fff" }]}>
              {activeService.status === "en_route" && activeService.pin_start
                ? "Prestador chegou! Confirme o PIN →"
                : activeService.status === "requested"
                ? "Aguardando prestador aceitar"
                : activeService.status === "accepted"
                ? `${activeService.providerName || "Prestador"} aceitou`
                : activeService.status === "en_route"
                ? `${activeService.providerName || "Prestador"} a caminho`
                : activeService.status === "in_progress"
                ? "Serviço em execução"
                : activeService.status === "disputed"
                ? "Em análise pela equipe"
                : activeService.category}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={activeService.status === "en_route" && activeService.pin_start ? "#1A1714" : "#fff"} />
        </Pressable>
      ) : null}

      {/* Floating filter chips — visible only when sheet is at COLLAPSED_H (providers present) */}
      <Animated.View
        pointerEvents={loadingProviders || providers.length === 0 ? "none" : "box-none"}
        style={{
          position: "absolute",
          bottom: COLLAPSED_H + 8,
          left: 0,
          right: 0,
          zIndex: 32,
          height: CHIP_ROW_H,
          opacity: sheetHeightAnim.interpolate({
            inputRange: [EMPTY_H, COLLAPSED_H, COLLAPSED_H + 60],
            outputRange: [0, 1, 0],
            extrapolate: "clamp",
          }),
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        >
          {FILTERS.map((f) => (
            <Chip
              key={f}
              label={f}
              active={filter === f}
              count={counts[f]}
              category={f === "Todos" ? null : (f as Category)}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setFilter(f as typeof filter); }}
            />
          ))}
        </ScrollView>
      </Animated.View>

      {/* Active provider card — persists above sheet regardless of sheet height */}
      {active ? (
        <Animated.View
          style={{
            position: "absolute",
            bottom: sheetHeightAnim.interpolate({
              inputRange: [COLLAPSED_H, EXPANDED_H],
              outputRange: [COLLAPSED_H + CHIP_ROW_H + 8, EXPANDED_H + 8],
              extrapolate: "clamp",
            }),
            left: 0,
            right: 0,
            zIndex: 50,
          }}
        >
        <View
          style={[
            styles.activeCard,
            { backgroundColor: active.color },
            shadows.lg,
          ]}
        >
          <View style={styles.activeRow}>
            <LinearGradient
              colors={[active.color, `${active.color}CC`]}
              style={styles.activeIcon}
            >
              {active.cat === "Mudança" ? (
                <Ionicons name="home" size={16} color="#fff" />
              ) : active.cat === "Frete" ? (
                <MaterialCommunityIcons name="truck" size={18} color="#fff" />
              ) : (
                <Ionicons name="cube" size={16} color="#fff" />
              )}
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[styles.activeName, { color: "#fff" }]} numberOfLines={1}>{active.name}</Text>
              <Text style={[styles.activeSub, { color: "rgba(255,255,255,0.8)" }]}>★ {active.rating} · {active.km} km · {active.area}</Text>
            </View>
            <Pressable onPress={() => setActive(null)} style={[styles.activeClose, { backgroundColor: "rgba(0,0,0,0.15)" }]}>
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.activeBtns}>
            <View style={[styles.activePrice, { backgroundColor: "rgba(0,0,0,0.15)" }]}>
              <Text style={[styles.activePriceText, { color: "#fff" }]}>{active.price}</Text>
              <Text style={[styles.activePriceSub, { color: "rgba(255,255,255,0.7)" }]}>desde</Text>
            </View>
            {/* 2º toque no pin abre o modal; botão rápido também abre */}
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); setModalProvider(active); setActive(null); }}
              style={[styles.activeRequestBtn, { backgroundColor: "#fff" }]}
            >
              <Ionicons name="person-outline" size={14} color={active.color} />
              <Text style={[styles.activeRequestText, { color: active.color }]}>Ver perfil</Text>
            </Pressable>
          </View>
          {/* Hint de segundo toque */}
          <View style={styles.pinCardHint}>
            <Ionicons name="location" size={10} color="rgba(255,255,255,0.7)" />
            <Text style={[styles.pinCardHintText, { color: "rgba(255,255,255,0.7)" }]}>
              Toque no pin novamente para ver o perfil completo
            </Text>
          </View>
        </View>
        </Animated.View>
      ) : null}

      {/* Bottom draggable sheet */}
      <ProvidersSheet
        providers={filtered}
        loading={loadingProviders}
        active={active}
        onSelect={(p) => {
          if (active?.id === p.id) {
            setModalProvider(p);
            setActive(null);
          } else {
            setActive(p);
          }
        }}
        onOpenProfile={(p) => router.push(`/provider/${p.id}`)}
        onSeeAll={() => router.push("/marketplace")}
        insetsBottom={insets.bottom}
        heightAnim={sheetHeightAnim}
      />

      <SideSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} name={user?.name || "Cliente"} initials={initials} />
      <ProviderModal
        open={!!modalProvider}
        provider={modalProvider}
        onClose={() => setModalProvider(null)}
        onRequest={(p) => {
          setModalProvider(null);
          router.push("/marketplace");
        }}
        onProfile={(p) => {
          setModalProvider(null);
          router.push(`/provider/${p.id}`);
        }}
      />
      <InfoSheet
        storageKey="ajudae_info_home_cliente"
        title="Como funciona o Ajudaê"
        subtitle="Tudo que você precisa para contratar um serviço"
        items={CLIENTE_HOME_INFO}
        forceOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
    </View>
  );
}

/* ─── PrestadorHome ──────────────────────────────────────────────────── */
function PrestadorHome() {
  const c = colors.light;
  const router = useRouter();
  const { user } = useAuth();
  const { location: locationPerm } = usePermissions();
  const { active: activeService } = useService();
  const insets = useSafeAreaInsets();
  const [online, setOnline] = useState(false);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hourglassAnim = useRef(new Animated.Value(0)).current;
  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1200); };

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    const hg = Animated.loop(
      Animated.sequence([
        Animated.timing(hourglassAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.delay(600),
        Animated.timing(hourglassAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    pulse.start();
    hg.start();
    return () => { pulse.stop(); hg.stop(); };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDataLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  // Load real online state from Supabase on mount
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("providers")
      .select("active")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          if (__DEV__) console.warn("[PrestadorHome] Erro ao carregar status online:", error.message);
          return;
        }
        if (data) setOnline(data.active ?? false);
      });
  }, [user?.id]);

  const handleToggleOnline = async () => {
    if (!user?.id || !user?.verified) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const next = !online;
    setOnlineLoading(true);
    try {
      let lat = -22.9068;
      let lng = -43.1729;
      if (next) {
        try {
          if (locationPerm.granted) {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          } else {
            const last = await Location.getLastKnownPositionAsync();
            if (last) {
              lat = last.coords.latitude;
              lng = last.coords.longitude;
            }
          }
        } catch {
        }
      }
      const updated = await toggleProviderActive(next, next ? { lat, lng } : undefined);
      setOnline(Boolean(updated.active));
    } catch (err: unknown) {
      console.warn("[PrestadorHome] Erro inesperado no toggle online:", err);
      Alert.alert("Erro", err instanceof Error ? err.message : "Não foi possível atualizar seu status. Tente novamente.");
    } finally {
      setOnlineLoading(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const initials = (user?.name || "CO").split(" ").map((p) => p[0]).slice(0, 2).join("");
  const firstName = (user?.name || "Carlos").split(" ")[0];
  const providerNeedsValidation = user?.accountStatus === "provider_needs_validation";
  const providerPendingReview = user?.accountStatus === "provider_pending_review";
  const providerRejected = user?.provider?.onboarding_status === "rejected";

  const incoming = activeService && activeService.status === "requested" ? activeService : null;
  const inProgress = activeService && ["accepted", "en_route", "in_progress"].includes(activeService.status) ? activeService : null;
  const incomingAccent = incoming
    ? incoming.category === "Mudança"
      ? c.primary
      : incoming.category === "Frete"
      ? c.blue
      : c.success
    : c.primary;
  const progressAccent = inProgress
    ? inProgress.category === "Mudança"
      ? c.primary
      : inProgress.category === "Frete"
      ? c.blue
      : c.success
    : c.primary;

  const stats = [
    { v: "R$247", l: "Hoje", color: c.text, bg: c.card },
    { v: "4.9", l: "Avaliação", color: c.text, bg: c.card },
    { v: "3", l: "Serviços", color: c.text, bg: c.card },
  ];
  const market = [
    { label: "Frete", value: "R$120", trend: "+8%" },
    { label: "Mudança", value: "R$214", trend: "+4%" },
    { label: "Entrega", value: "R$52", trend: "-2%" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <TopNav
        title={`${greeting}, ${firstName}`}
        subtitle="Van · ★ 4.9 · Prestador"
        initials={initials}
        badge={online}
        accentColor={c.blue}
        onMenuOpen={() => setMenuOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
        onInfo={() => setInfoOpen(true)}
      />

      {providerNeedsValidation || providerPendingReview ? (
        <>
          <View style={styles.providerGateShell}>
            <View style={[styles.providerGateCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
              <View style={[styles.providerGateIcon, { backgroundColor: `${c.blue}14` }]}>
                <Ionicons
                  name={providerPendingReview ? "hourglass-outline" : "shield-checkmark-outline"}
                  size={28}
                  color={c.blue}
                />
              </View>
              <Text style={[styles.providerGateTitle, { color: c.text }]}>
                {providerPendingReview ? "Validação em análise" : providerRejected ? "Validação recusada" : "Conta não verificada"}
              </Text>
              <Text style={[styles.providerGateSub, { color: c.sub }]}>
                {providerPendingReview
                  ? "Recebemos seus documentos. Sua conta será liberada assim que a análise terminar."
                  : providerRejected
                    ? (user?.provider?.rejection_reason || "Revise seus dados e envie uma nova validação para seguir com a conta.")
                    : "Você pode acessar o app e revisar seu perfil, mas ainda precisa validar sua conta para criar e publicar serviços."}
              </Text>

              {providerNeedsValidation ? (
                <Pressable
                  onPress={() => router.push("/provider-validation" as never)}
                  style={[styles.providerGateButton, { backgroundColor: c.blue }, shadows.md]}
                >
                  <Text style={styles.providerGateButtonText}>{providerRejected ? "Atualizar validação" : "Validar conta"}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => router.push("/provider-validation" as never)}
                  style={[styles.providerGateButton, { backgroundColor: c.blue }, shadows.md]}
                >
                  <Text style={styles.providerGateButtonText}>Visualizar envio</Text>
                  <Ionicons name="document-text-outline" size={16} color="#fff" />
                </Pressable>
              )}
            </View>
          </View>

          <SideSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
          <ProfileOverlay
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            name={user?.name || "Prestador"}
            initials={initials}
          />
          <InfoSheet
            storageKey="ajudae_info_home_prestador"
            title="Sua central de serviços"
            subtitle="Entenda como maximizar seus ganhos no Ajudaê"
            accentColor={colors.light.blue}
            items={PRESTADOR_HOME_INFO}
            forceOpen={infoOpen}
            onClose={() => setInfoOpen(false)}
          />
        </>
      ) : (
        <>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
      >
        {/* 1. Online toggle — forte e com cor */}
        <Pressable
          onPress={handleToggleOnline}
          disabled={!user?.verified || onlineLoading}
          style={[
            styles.onlineRow,
            online && user?.verified
              ? { backgroundColor: c.success, borderColor: "#15803D" }
              : { backgroundColor: c.card, borderColor: c.border },
            { opacity: user?.verified && !onlineLoading ? 1 : 0.6 },
          ]}
        >
          <View style={[styles.onlineDot, {
            backgroundColor: user?.verified ? (online ? "#fff" : c.softMuted) : c.warning,
            shadowColor: online ? "#fff" : "transparent",
            shadowOpacity: 0.8,
            shadowRadius: 6,
          }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.onlineTitle, { color: online && user?.verified ? "#fff" : c.text }]}>
              {user?.verified ? (online ? "Você está disponível" : "Você está offline") : "Aguardando aprovação"}
            </Text>
            <Text style={[styles.onlineSub, { color: online && user?.verified ? "#D1FAE5" : (user?.verified ? c.softMuted : c.warning) }]}>
              {user?.verified ? (online ? "Visível no mapa · recebendo pedidos" : "Toque para ativar") : "Seu cadastro está em análise"}
            </Text>
          </View>
          <View style={[styles.toggle, { backgroundColor: user?.verified ? (online ? "#fff" : "#D4D0CB") : "#FCD34D" }]}>
            <View style={[styles.toggleDot, {
              left: user?.verified ? (online ? 23 : 3) : 3,
              backgroundColor: online && user?.verified ? c.success : "#888",
            }]} />
          </View>
        </Pressable>

        {/* 2. Solicitação recebida / Aguardando (logo abaixo do toggle) */}
        {incoming ? (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient
              colors={[incomingAccent, incomingAccent + "DD"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.requestCard, { borderColor: "transparent" }]}
            >
              <View style={styles.requestHead}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff" }} />
                    <Text style={{ fontSize: 9, fontFamily: fonts.sans.bold, color: "rgba(255,255,255,0.85)", letterSpacing: 0.8 }}>NOVA SOLICITAÇÃO</Text>
                  </View>
                  <Text style={[styles.requestName, { color: "#fff" }]}>{incoming.customerName}</Text>
                  <Text style={[styles.requestMeta, { color: "rgba(255,255,255,0.75)" }]}>
                    {incoming.category} · {incoming.scheduled ? "Agendado" : "Imediato"}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.requestPrice, { color: "#fff" }]}>R$ {(incoming.estimatedPrice * 0.85).toFixed(2)}</Text>
                  <Text style={[styles.requestSub, { color: "rgba(255,255,255,0.7)" }]}>líquido · Agora</Text>
                </View>
              </View>
              <View style={styles.requestBtns}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    router.push("/request-details");
                  }}
                  style={[styles.requestRefuse, { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)" }]}
                >
                  <Text style={[styles.requestRefuseText, { color: "#fff" }]}>Recusar</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    router.push("/request-details");
                  }}
                  style={[styles.requestAccept, { backgroundColor: "rgba(255,255,255,0.2)", flex: 1 }]}
                >
                  <Text style={[styles.requestAcceptText, { color: "#fff" }]}>Ver detalhes →</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </Animated.View>
        ) : !inProgress ? (
          <Animated.View style={[styles.waitingCard, { backgroundColor: c.card, borderColor: `${c.primary}44`, borderLeftColor: c.primary, borderLeftWidth: 3 }, shadows.sm]}>
            <Animated.View style={[styles.waitingPulseRing, { borderColor: c.primary + "22", transform: [{ scale: pulseAnim }] }]} />
            <View style={[styles.emptyIconWrap, { backgroundColor: `${c.primary}15` }]}>
              <Animated.View style={{ transform: [{ rotate: hourglassAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] }}>
                <Ionicons name="hourglass" size={20} color={c.primary} />
              </Animated.View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.requestName, { color: c.text }]}>Aguardando solicitações</Text>
              <Text style={[styles.requestSub, { color: c.softMuted, marginTop: 2 }]}>
                Fique online para aparecer no mapa dos clientes.
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {/* 3. Serviço ativo em andamento */}
        {inProgress ? (
          <Pressable onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            router.push("/job");
          }}>
            <LinearGradient
              colors={[progressAccent, progressAccent + "DD"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.jobCard}
            >
              <View style={styles.jobBadgeRow}>
                <View style={styles.jobLiveDot} />
                <Text style={styles.jobLiveText}>SERVIÇO EM ANDAMENTO — AO VIVO</Text>
              </View>
              <Text style={styles.jobTitle}>{inProgress.category} · {inProgress.customerName}</Text>
              <Text style={styles.jobSub}>
                {inProgress.status === "accepted" ? "Confirme que está saindo →"
                  : inProgress.status === "en_route" ? "Você está a caminho →"
                  : "Concluir e cobrar PIN →"}
              </Text>
            </LinearGradient>
          </Pressable>
        ) : null}

        {/* 4. Hot area banner */}
        <HotAreaBanner onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          router.push("/marketplace");
        }} />

        {/* 5. Stats rápidos */}
        {dataLoading ? (
          <View style={styles.statsGrid}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: c.border }]}>
                <Skeleton width="60%" height={20} borderRadius={6} style={{ marginBottom: 6 }} />
                <Skeleton width="40%" height={11} borderRadius={4} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {stats.map((s) => (
              <View key={s.l} style={[styles.statCard, { backgroundColor: s.bg }]}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.v}</Text>
                <Text style={[styles.statLabel, { color: c.sub }]}>{s.l}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 6. Dicas para aumentar ganhos */}
        <View style={[styles.tipsCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <View style={[styles.tipsIconWrap, { backgroundColor: `${c.primary}18` }]}>
              <Ionicons name="bulb-outline" size={16} color={c.primary} />
            </View>
            <Text style={[styles.tipsTitle, { color: c.text }]}>Como ganhar mais</Text>
          </View>
          {PROVIDER_TIPS.map((tip, i) => (
            <View key={i} style={[styles.tipRow, { borderTopColor: c.borderLight }]}>
              <View style={[styles.tipIconWrap, { backgroundColor: `${tip.color}18` }]}>
                <Ionicons name={tip.icon as any} size={15} color={tip.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tipLabel, { color: c.text }]}>{tip.label}</Text>
                <Text style={[styles.tipDesc, { color: c.sub }]}>{tip.desc}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>

      <SideSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProfileOverlay
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        name={user?.name || "Prestador"}
        initials={initials}
      />
      <InfoSheet
        storageKey="ajudae_info_home_prestador"
        title="Sua central de serviços"
        subtitle="Entenda como maximizar seus ganhos no Ajudaê"
        accentColor={colors.light.blue}
        items={PRESTADOR_HOME_INFO}
        forceOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
        </>
      )}
    </View>
  );
}

/* ─── PortfolioSheet (Modal pageSheet) ──────────────────────────────────── */
const PIN_COLORS = ["#FF5500", "#2563EB", "#16A34A", "#9333EA", "#D97706", "#0EA5E9"];
const PIN_ICONS = [
  { key: "home-outline", label: "Casa" },
  { key: "car-outline", label: "Van" },
  { key: "cube-outline", label: "Caixa" },
  { key: "flash-outline", label: "Rápido" },
  { key: "star-outline", label: "Top" },
];

function PortfolioSheet({ onClose }: { onClose: () => void }) {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const initials = (user?.name || "CO").split(" ").map((p) => p[0]).slice(0, 2).join("");
  const [tab, setTab] = useState<"preview" | "edit">("preview");
  const [editSection, setEditSection] = useState<"bio" | "services" | "promo" | "pin" | null>("bio");

  // Bio
  const [bio, setBio] = useState("Especialista em mudanças residenciais e comerciais na Zona Norte. Mais de 5 anos de experiência, equipe treinada e veículo segurado.");

  // Services
  const [services, setServices] = useState([
    { title: "Mudança Residencial", price: "89", desc: "Apartamento ou casa, com 2 ajudantes incluídos" },
    { title: "Frete Rápido", price: "49", desc: "Itens avulsos, entrega em até 2h na região" },
  ]);
  const addService = () => {
    if (services.length >= 3) return;
    setServices((s) => [...s, { title: "", price: "", desc: "" }]);
  };
  const removeService = (i: number) => setServices((s) => s.filter((_, idx) => idx !== i));
  const updateService = (i: number, field: "title" | "price" | "desc", val: string) => {
    setServices((s) => s.map((svc, idx) => idx === i ? { ...svc, [field]: val } : svc));
  };

  // Promo
  const [promoText, setPromoText] = useState("Mudança completa com 10% OFF");
  const [promoDue, setPromoDue] = useState("30/05");

  // Pin card
  const [pinColor, setPinColor] = useState("#FF5500");
  const [pinIcon, setPinIcon] = useState("home-outline");
  const [pinMessage, setPinMessage] = useState("Disponível agora!");

  const Section = ({ sectionKey, label, icon }: { sectionKey: typeof editSection; label: string; icon: string }) => {
    const open = editSection === sectionKey;
    return (
      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setEditSection(open ? null : sectionKey); }}
        style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: open ? c.primary : c.border, padding: 14, marginBottom: open ? 0 : 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: open ? `${c.primary}18` : c.background, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon as any} size={16} color={open ? c.primary : c.softMuted} />
        </View>
        <Text style={{ flex: 1, fontSize: 13, fontFamily: fonts.sans.bold, color: c.text }}>{label}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={c.softMuted} />
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 12, backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <View style={{ width: 40 }} />
        <Text style={{ flex: 1, textAlign: "center", fontSize: 14, fontFamily: fonts.sans.bold, color: c.text }}>Meu Portfólio</Text>
        <Pressable onPress={onClose} style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", backgroundColor: c.background }}>
          <Ionicons name="close" size={18} color={c.text} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card }}>
        {(["preview", "edit"] as const).map((t) => (
          <Pressable key={t} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setTab(t); }}
            style={{ flex: 1, paddingVertical: 11, alignItems: "center", borderBottomWidth: 2, borderBottomColor: tab === t ? c.primary : "transparent" }}>
            <Text style={{ fontSize: 13, fontFamily: fonts.sans.bold, color: tab === t ? c.primary : c.softMuted }}>
              {t === "preview" ? "Visualização" : "Editar"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 + insets.bottom }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {tab === "preview" ? (
          <>
            {/* Hero */}
            <LinearGradient colors={[c.primary, c.primary + "BB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 18, padding: 20, marginBottom: 14, alignItems: "center" }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <Text style={{ color: "#fff", fontSize: 20, fontFamily: fonts.serif.extra }}>{initials}</Text>
              </View>
              <Text style={{ color: "#fff", fontSize: 17, fontFamily: fonts.sans.bold }}>{user?.name || "Carlos Oliveira"}</Text>
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 2 }}>Van · ★ 4.9 · Prestador Verificado</Text>
            </LinearGradient>

            {/* Bio */}
            <View style={{ backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 10 }}>
              <Text style={{ fontSize: 10, fontFamily: fonts.sans.bold, color: c.softMuted, letterSpacing: 0.6, marginBottom: 6 }}>BIO</Text>
              <Text style={{ fontSize: 13, fontFamily: fonts.sans.regular, color: c.text, lineHeight: 20 }}>{bio || "Nenhuma bio adicionada."}</Text>
            </View>

            {/* Promo */}
            {promoText ? (
              <LinearGradient colors={["#D97706", "#F59E0B"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="pricetag" size={16} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: fonts.sans.bold, color: "#fff" }}>{promoText}</Text>
                  {promoDue ? <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontFamily: fonts.sans.regular, marginTop: 2 }}>Válido até {promoDue}</Text> : null}
                </View>
              </LinearGradient>
            ) : null}

            {/* Serviços */}
            <View style={{ backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 10 }}>
              <Text style={{ fontSize: 10, fontFamily: fonts.sans.bold, color: c.softMuted, letterSpacing: 0.6, marginBottom: 10 }}>SERVIÇOS</Text>
              {services.filter(s => s.title).map((s, i) => (
                <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 8, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: c.borderLight }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontFamily: fonts.sans.bold, color: c.text }}>{s.title}</Text>
                    {s.desc ? <Text style={{ fontSize: 11, fontFamily: fonts.sans.regular, color: c.softMuted, marginTop: 2 }}>{s.desc}</Text> : null}
                  </View>
                  {s.price ? <Text style={{ fontSize: 14, fontFamily: fonts.serif.extra, color: c.success, marginLeft: 8 }}>R${s.price}</Text> : null}
                </View>
              ))}
              {services.filter(s => s.title).length === 0 ? <Text style={{ fontSize: 12, color: c.softMuted, fontFamily: fonts.sans.regular }}>Nenhum serviço adicionado.</Text> : null}
            </View>

            {/* Pin Card Preview */}
            <Text style={{ fontSize: 10, fontFamily: fonts.sans.bold, color: c.softMuted, letterSpacing: 0.6, marginBottom: 8 }}>SEU PIN NO MAPA</Text>
            <View style={{ backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 10, alignItems: "center" }}>
              <View style={{ backgroundColor: pinColor, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", gap: 6, alignItems: "center", shadowColor: pinColor, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }}>
                <Ionicons name={pinIcon as any} size={14} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 13, fontFamily: fonts.sans.bold }}>R$89</Text>
              </View>
              {pinMessage ? (
                <View style={{ marginTop: 10, backgroundColor: `${pinColor}15`, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: `${pinColor}33` }}>
                  <Text style={{ fontSize: 11, fontFamily: fonts.sans.medium, color: pinColor }}>{pinMessage}</Text>
                </View>
              ) : null}
              <Text style={{ fontSize: 10, color: c.softMuted, fontFamily: fonts.sans.regular, marginTop: 8 }}>Assim os clientes veem você no mapa</Text>
            </View>

            {/* Depoimento */}
            <View style={{ backgroundColor: c.warningLight, borderRadius: 14, borderWidth: 1, borderColor: `${c.warning}44`, padding: 16 }}>
              <View style={{ flexDirection: "row", gap: 4, marginBottom: 8 }}>
                {[1,2,3,4,5].map((n) => <Ionicons key={n} name="star" size={12} color={c.warning} />)}
              </View>
              <Text style={{ fontSize: 13, fontFamily: fonts.sans.regular, color: c.text, lineHeight: 19, fontStyle: "italic" }}>
                "Excelente profissional! Cuidou de tudo com muito cuidado e chegou no horário marcado. Super recomendo!"
              </Text>
              <Text style={{ fontSize: 11, fontFamily: fonts.sans.bold, color: c.softMuted, marginTop: 8 }}>— Maria S.</Text>
            </View>
          </>
        ) : (
          <>
            {/* ── Bio ── */}
            <Section sectionKey="bio" label="Bio / Apresentação" icon="person-outline" />
            {editSection === "bio" && (
              <View style={{ backgroundColor: c.background, borderRadius: 14, borderWidth: 1, borderColor: c.primary, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 14, marginBottom: 10 }}>
                <TextInput style={{ backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 12, fontSize: 13, fontFamily: fonts.sans.regular, color: c.text, minHeight: 90, textAlignVertical: "top" }}
                  placeholder="Fale sobre você e seu trabalho…" placeholderTextColor={c.softMuted} multiline maxLength={280} value={bio} onChangeText={setBio} />
                <Text style={{ fontSize: 11, color: c.softMuted, fontFamily: fonts.sans.regular, textAlign: "right", marginTop: 4 }}>{bio.length}/280</Text>
              </View>
            )}

            {/* ── Serviços ── */}
            <Section sectionKey="services" label="Serviços em destaque" icon="list-outline" />
            {editSection === "services" && (
              <View style={{ backgroundColor: c.background, borderRadius: 14, borderWidth: 1, borderColor: c.primary, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 14, marginBottom: 10, gap: 10 }}>
                {services.map((svc, i) => (
                  <View key={i} style={{ backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, fontFamily: fonts.sans.bold, color: c.softMuted }}>SERVIÇO {i + 1}</Text>
                      <Pressable onPress={() => removeService(i)}><Ionicons name="close-circle" size={18} color={c.destructive} /></Pressable>
                    </View>
                    <TextInput style={{ backgroundColor: c.background, borderRadius: 8, borderWidth: 1, borderColor: c.border, padding: 10, fontSize: 13, fontFamily: fonts.sans.regular, color: c.text, marginBottom: 6 }}
                      placeholder="Título do serviço" placeholderTextColor={c.softMuted} value={svc.title} onChangeText={(v) => updateService(i, "title", v)} />
                    <TextInput style={{ backgroundColor: c.background, borderRadius: 8, borderWidth: 1, borderColor: c.border, padding: 10, fontSize: 13, fontFamily: fonts.sans.regular, color: c.text, marginBottom: 6 }}
                      placeholder="Preço (ex: 89)" placeholderTextColor={c.softMuted} keyboardType="numeric" value={svc.price} onChangeText={(v) => updateService(i, "price", v.replace(/[^0-9]/g, ""))} />
                    <TextInput style={{ backgroundColor: c.background, borderRadius: 8, borderWidth: 1, borderColor: c.border, padding: 10, fontSize: 13, fontFamily: fonts.sans.regular, color: c.text }}
                      placeholder="Descrição curta (opcional)" placeholderTextColor={c.softMuted} value={svc.desc} onChangeText={(v) => updateService(i, "desc", v)} />
                  </View>
                ))}
                {services.length < 3 ? (
                  <Pressable onPress={addService} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, borderWidth: 1.5, borderColor: c.primary, borderStyle: "dashed", paddingVertical: 12 }}>
                    <Ionicons name="add-circle-outline" size={16} color={c.primary} />
                    <Text style={{ fontSize: 13, fontFamily: fonts.sans.bold, color: c.primary }}>Adicionar serviço</Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            {/* ── Promoção ── */}
            <Section sectionKey="promo" label="Promoção ativa" icon="pricetag-outline" />
            {editSection === "promo" && (
              <View style={{ backgroundColor: c.background, borderRadius: 14, borderWidth: 1, borderColor: c.primary, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 14, marginBottom: 10, gap: 8 }}>
                <TextInput style={{ backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 12, fontSize: 13, fontFamily: fonts.sans.regular, color: c.text }}
                  placeholder="Ex: 10% OFF em mudanças" placeholderTextColor={c.softMuted} maxLength={50} value={promoText} onChangeText={setPromoText} />
                <TextInput style={{ backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 12, fontSize: 13, fontFamily: fonts.sans.regular, color: c.text }}
                  placeholder="Válido até (ex: 30/06)" placeholderTextColor={c.softMuted} value={promoDue} onChangeText={setPromoDue} />
              </View>
            )}

            {/* ── Pin Card ── */}
            <Section sectionKey="pin" label="Personalizar Pin no mapa" icon="location-outline" />
            {editSection === "pin" && (
              <View style={{ backgroundColor: c.background, borderRadius: 14, borderWidth: 1, borderColor: c.primary, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 14, marginBottom: 10 }}>
                {/* Color picker */}
                <Text style={{ fontSize: 10, fontFamily: fonts.sans.bold, color: c.softMuted, letterSpacing: 0.6, marginBottom: 8 }}>COR DO PIN</Text>
                <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
                  {PIN_COLORS.map((col) => (
                    <Pressable key={col} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setPinColor(col); }}
                      style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: col, borderWidth: pinColor === col ? 3 : 0, borderColor: "#fff", shadowColor: col, shadowOpacity: 0.5, shadowRadius: 4, elevation: 3 }}>
                      {pinColor === col ? <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Ionicons name="checkmark" size={14} color="#fff" /></View> : null}
                    </Pressable>
                  ))}
                </View>

                {/* Icon picker */}
                <Text style={{ fontSize: 10, fontFamily: fonts.sans.bold, color: c.softMuted, letterSpacing: 0.6, marginBottom: 8 }}>ÍCONE</Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                  {PIN_ICONS.map((ic) => (
                    <Pressable key={ic.key} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setPinIcon(ic.key); }}
                      style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: pinIcon === ic.key ? pinColor : c.border, backgroundColor: pinIcon === ic.key ? `${pinColor}15` : c.card }}>
                      <Ionicons name={ic.key as any} size={16} color={pinIcon === ic.key ? pinColor : c.softMuted} />
                      <Text style={{ fontSize: 9, fontFamily: fonts.sans.regular, color: pinIcon === ic.key ? pinColor : c.softMuted, marginTop: 3 }}>{ic.label}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Message */}
                <Text style={{ fontSize: 10, fontFamily: fonts.sans.bold, color: c.softMuted, letterSpacing: 0.6, marginBottom: 6 }}>MENSAGEM NO CARD (MAX 25 CHARS)</Text>
                <TextInput style={{ backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 12, fontSize: 13, fontFamily: fonts.sans.regular, color: c.text, marginBottom: 4 }}
                  placeholder="Ex: Disponível agora!" placeholderTextColor={c.softMuted} maxLength={25} value={pinMessage} onChangeText={setPinMessage} />
                <Text style={{ fontSize: 11, color: c.softMuted, fontFamily: fonts.sans.regular, textAlign: "right", marginBottom: 12 }}>{pinMessage.length}/25</Text>

                {/* Preview */}
                <Text style={{ fontSize: 10, fontFamily: fonts.sans.bold, color: c.softMuted, letterSpacing: 0.6, marginBottom: 8 }}>PREVIEW</Text>
                <View style={{ backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 14, alignItems: "center" }}>
                  <View style={{ backgroundColor: pinColor, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", gap: 6, alignItems: "center", shadowColor: pinColor, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 }}>
                    <Ionicons name={pinIcon as any} size={13} color="#fff" />
                    <Text style={{ color: "#fff", fontSize: 13, fontFamily: fonts.sans.bold }}>R$89</Text>
                  </View>
                  {pinMessage ? (
                    <View style={{ marginTop: 8, backgroundColor: `${pinColor}15`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: `${pinColor}33` }}>
                      <Text style={{ fontSize: 10, fontFamily: fonts.sans.medium, color: pinColor }}>{pinMessage}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const PROVIDER_TIPS = [
  { icon: "time-outline", color: "#2563EB", label: "Responda rápido", desc: "Prestadores que aceitam em menos de 2 min têm 3× mais pedidos." },
  { icon: "star-outline", color: "#D97706", label: "Mantenha a nota acima de 4.7", desc: "Avaliações altas aparecem primeiro para clientes próximos." },
  { icon: "location-outline", color: "#16A34A", label: "Expanda sua área de atuação", desc: "Atender mais bairros aumenta sua visibilidade no mapa." },
];

const CLIENTE_HOME_INFO: InfoItem[] = [
  { icon: "map-outline", color: "#2563EB", title: "Mapa ao vivo", description: "Veja os prestadores disponíveis no mapa. Toque em um pin para ver detalhes e solicitar o serviço." },
  { icon: "filter-outline", color: "#D97706", title: "Filtros rápidos", description: "Use as pills abaixo do mapa para filtrar por Frete, Mudança ou Entrega." },
  { icon: "car-outline", color: "#16A34A", title: "Solicite um serviço", description: "Selecione um prestador e toque em 'Solicitar' para iniciar o atendimento." },
  { icon: "location-outline", color: "#9333EA", title: "Sua localização", description: "O mapa mostra prestadores próximos a você. Mantenha a localização ativada para melhores resultados." },
];

const PRESTADOR_HOME_INFO: InfoItem[] = [
  { icon: "power-outline", color: "#2563EB", title: "Fique online", description: "Ative o toggle para ficar visível no mapa e receber solicitações de clientes." },
  { icon: "notifications-outline", color: "#16A34A", title: "Solicitações", description: "Quando um cliente solicitar seu serviço, você verá o card aqui para aceitar ou recusar." },
  { icon: "trending-up-outline", color: "#D97706", title: "Acompanhe seus ganhos", description: "Use o hub de Análise e Performance acima do menu para ver suas métricas." },
  { icon: "ribbon-outline", color: "#9333EA", title: "Conquistas", description: "Complete serviços para desbloquear conquistas e aumentar sua visibilidade no marketplace." },
];

const styles = StyleSheet.create({
  /* Cliente */
  userLocWrap: { position: "absolute", left: "50%", marginLeft: -14, alignItems: "center", justifyContent: "center", zIndex: 20 },
  userPulse: { position: "absolute", width: 28, height: 28, borderRadius: 14 },
  userDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  activeCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 14,
  },
  locateBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  activeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  activeIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  activeName: { fontSize: 14, fontFamily: fonts.sans.bold },
  activeSub: { fontSize: 11, fontFamily: fonts.sans.regular },
  activeClose: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  activeBtns: { flexDirection: "row", gap: 8 },
  activePrice: { flex: 1, borderRadius: 10, padding: 6, alignItems: "center" },
  activePriceText: { fontSize: 15, fontFamily: fonts.serif.extra },
  activePriceSub: { fontSize: 10, fontFamily: fonts.sans.regular },
  activeRequestBtn: {
    flex: 2,
    height: 42,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  activeRequestText: { color: "#fff", fontSize: 13, fontFamily: fonts.sans.bold },

  filtersWrap: { position: "absolute", left: 0, right: 0, zIndex: 30, maxHeight: 40 },
  providerMiniCard: {
    width: 150,
    height: 82,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    justifyContent: "space-between",
  },
  providerMiniHead: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 6 },
  providerMiniIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  providerMiniPrice: { fontSize: 13, fontFamily: fonts.serif.extra },
  providerMiniName: { fontSize: 12, fontFamily: fonts.sans.bold, lineHeight: 14 },
  providerMiniMeta: { fontSize: 10, fontFamily: fonts.sans.regular, marginTop: 2 },

  /* Prestador */
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  onlineTitle: { fontSize: 14, fontFamily: fonts.sans.bold },
  onlineSub: { fontSize: 11, fontFamily: fonts.sans.regular },
  providerGateShell: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  providerGateCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  providerGateIcon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  providerGateTitle: {
    fontSize: 24,
    fontFamily: fonts.serif.extra,
    textAlign: "center",
    marginBottom: 10,
  },
  providerGateSub: {
    fontSize: 13,
    fontFamily: fonts.sans.regular,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  providerGateButton: {
    width: "100%",
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  providerGateButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: fonts.sans.bold,
  },
  providerGateStatus: {
    width: "100%",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  providerGateStatusText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.sans.medium,
    lineHeight: 18,
  },
  toggle: { width: 46, height: 26, borderRadius: 13, position: "relative" },
  toggleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", position: "absolute", top: 3 },
  statsGrid: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, padding: 12 },
  statValue: { fontSize: 17, fontFamily: fonts.serif.extra },
  statLabel: { fontSize: 10, fontFamily: fonts.sans.regular, marginTop: 3 },
  radarCard: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 16 },
  radarHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  radarTitle: { fontSize: 14, fontFamily: fonts.serif.extra },
  radarSub: { fontSize: 11, fontFamily: fonts.sans.bold },
  marketCell: { flex: 1, borderRadius: 14, padding: 10 },
  marketLabel: { fontSize: 11, fontFamily: fonts.sans.bold },
  marketValue: { fontSize: 16, fontFamily: fonts.serif.extra, marginTop: 4 },
  marketTrend: { fontSize: 10, fontFamily: fonts.sans.bold, marginTop: 4 },
  trackBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    zIndex: 38,
  },
  trackPulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  trackEyebrow: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 9,
    fontFamily: fonts.sans.bold,
    letterSpacing: 1,
    marginBottom: 2,
  },
  trackTitle: { color: "#fff", fontSize: 13, fontFamily: fonts.sans.extra },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  jobCard: { borderRadius: 18, padding: 18, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 },
  jobBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  jobLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.9)" },
  jobLiveText: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 1 },
  jobTitle: { color: "#fff", fontSize: 16, fontFamily: fonts.serif.extra },
  jobSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 3 },
  requestCard: { borderRadius: 16, borderWidth: 1.5, padding: 14, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 5 },
  requestHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  requestName: { fontSize: 14, fontFamily: fonts.sans.bold },
  requestMeta: { fontSize: 11, fontFamily: fonts.sans.regular },
  requestPrice: { fontSize: 16, fontFamily: fonts.serif.extra },
  requestSub: { fontSize: 10, fontFamily: fonts.sans.regular },
  requestBtns: { flexDirection: "row", gap: 8 },
  requestRefuse: { flex: 1, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  requestRefuseText: { fontSize: 12, fontFamily: fonts.sans.semibold },
  requestAccept: { flex: 2, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  requestAcceptText: { color: "#fff", fontSize: 13, fontFamily: fonts.sans.bold },

  pinCardHint: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 6, paddingHorizontal: 2 },
  pinCardHintText: { fontSize: 10, fontFamily: fonts.sans.regular },

  portfolioEntry: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  portfolioIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  portfolioTitle: { fontSize: 13, fontFamily: fonts.sans.bold },
  portfolioSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 1 },

  waitingCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12, overflow: "hidden" },
  waitingPulseRing: { position: "absolute", width: 60, height: 60, borderRadius: 30, borderWidth: 2, left: 8 },
  tipsCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  tipsIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  tipsTitle: { fontSize: 13, fontFamily: fonts.serif.extra, flex: 1 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingTop: 12, marginTop: 4, borderTopWidth: 1 },
  tipIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tipLabel: { fontSize: 12, fontFamily: fonts.sans.bold, marginBottom: 2 },
  tipDesc: { fontSize: 11, fontFamily: fonts.sans.regular, lineHeight: 16 },
});

/* ─── Draggable providers sheet ─────────────────────────────────────── */
const SCREEN_H = Dimensions.get("window").height;
const COLLAPSED_H = 180;  // sheet colapsado com prestadores
const EMPTY_H     = 100;  // sheet colapsado sem prestadores / carregando
const CHIP_ROW_H  = 52;   // altura da faixa flutuante de filtros
const MINI_CARD_H = 82;   // altura fixa dos mini cards no carrossel
const EXPANDED_H  = Math.min(SCREEN_H * 0.58, 460);

function ProvidersSheet({
  providers,
  loading,
  active,
  onSelect,
  onOpenProfile,
  onSeeAll,
  insetsBottom,
  heightAnim,
}: {
  providers: Provider[];
  loading?: boolean;
  active: Provider | null;
  onSelect: (p: Provider) => void;
  onOpenProfile: (p: Provider) => void;
  onSeeAll: () => void;
  insetsBottom: number;
  heightAnim: Animated.Value;
}) {
  const c = colors.light;
  const hasProviders = providers.length > 0;
  const searching = loading || !hasProviders;
  const minH = hasProviders ? COLLAPSED_H : EMPTY_H;
  const startH = useRef(minH);
  const [expanded, setExpanded] = useState(false);
  const canExpandRef = useRef(hasProviders);

  useEffect(() => {
    canExpandRef.current = hasProviders;
    startH.current = minH;
    if (!hasProviders && expanded) {
      setExpanded(false);
    }
  }, [expanded, hasProviders, minH]);

  const snap = (target: number) => {
    heightAnim.stopAnimation();
    heightAnim.setValue(target);
    startH.current = target;
    const nextExpanded = canExpandRef.current && target === EXPANDED_H;
    setExpanded(nextExpanded);
    Haptics.impactAsync(nextExpanded ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => canExpandRef.current && Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        if (!canExpandRef.current) return;
        startH.current = (heightAnim as any)._value ?? startH.current;
        heightAnim.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        if (!canExpandRef.current) return;
        const currentMin = canExpandRef.current ? COLLAPSED_H : EMPTY_H;
        const next = Math.max(currentMin, Math.min(EXPANDED_H, startH.current - g.dy));
        heightAnim.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        if (!canExpandRef.current) {
          snap(EMPTY_H);
          return;
        }
        const currentMin = canExpandRef.current ? COLLAPSED_H : EMPTY_H;
        const mid = (currentMin + EXPANDED_H) / 2;
        const value = (heightAnim as any)._value ?? startH.current;
        const target = g.vy < -0.5 ? EXPANDED_H : g.vy > 0.5 ? currentMin : value > mid ? EXPANDED_H : currentMin;
        snap(target);
      },
    }),
  ).current;

  const toggle = () => {
    if (!hasProviders) return;
    snap(expanded ? minH : EXPANDED_H);
  };

  return (
    <Animated.View
      style={[
        sheetStyles.sheet,
        { backgroundColor: c.card, height: heightAnim, paddingBottom: insetsBottom },
        shadows.xl,
      ]}
    >
      {/* Área de arrasto — SOMENTE handle + título, sem ScrollView */}
      <View {...responder.panHandlers} style={sheetStyles.dragArea}>
        <View style={[sheetStyles.handle, { backgroundColor: "#D6D3D1" }]} />
        <View style={sheetStyles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[sheetStyles.headerTitle, { color: c.text }]}>
              {searching ? "Buscando prestadores…" : expanded ? "Prestadores na sua área" : "Perto de você"}
            </Text>
            <Text style={[sheetStyles.headerSub, { color: c.softMuted }]}>
              {searching
                ? "Procurando na sua região"
                : `${providers.length} disponíveis · ${expanded ? "deslize para baixo" : "puxe para ver lista"}`}
            </Text>
          </View>
          {hasProviders && (
            <Pressable onPress={toggle} style={[sheetStyles.toggleBtn, { backgroundColor: c.background, borderColor: c.borderLight }]}>
              <Ionicons name={expanded ? "chevron-down" : "chevron-up"} size={16} color={c.text} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Body — carrossel e lista em posição absoluta dentro do sheet, sem overflow */}
      <View style={{ flex: 1, position: "relative" }}>
        {searching ? (
          <View style={sheetStyles.searchingBody}>
            <ActivityIndicator size="small" color={c.primary} />
          </View>
        ) : expanded ? (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {providers.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => onOpenProfile(p)}
                style={[
                  sheetStyles.listRow,
                  {
                    backgroundColor: c.background,
                    borderColor: active?.id === p.id ? p.color : c.borderLight,
                    borderWidth: active?.id === p.id ? 2 : 1,
                  },
                ]}
              >
                <LinearGradient
                  colors={[p.color, `${p.color}AA`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={sheetStyles.listAvatar}
                >
                  <Text style={sheetStyles.listIni}>{p.ini}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <View style={sheetStyles.listHeadRow}>
                    <Text style={[sheetStyles.listName, { color: c.text }]} numberOfLines={1}>{p.name}</Text>
                    {p.isOnline ? (
                      <View style={[sheetStyles.onlineDot, { backgroundColor: c.success }]} />
                    ) : null}
                  </View>
                  <View style={sheetStyles.listMeta}>
                    <View style={[sheetStyles.catTag, { backgroundColor: `${p.color}18` }]}>
                      {p.cat === "Mudança" ? (
                        <Ionicons name="home" size={9} color={p.color} />
                      ) : p.cat === "Frete" ? (
                        <MaterialCommunityIcons name="truck" size={10} color={p.color} />
                      ) : (
                        <Ionicons name="cube" size={9} color={p.color} />
                      )}
                      <Text style={[sheetStyles.catTxt, { color: p.color }]}>{p.cat}</Text>
                    </View>
                    <Ionicons name="star" size={10} color={c.warning} />
                    <Text style={[sheetStyles.metaTxt, { color: c.warning }]}>{p.rating}</Text>
                    <Text style={[sheetStyles.metaTxt, { color: c.softMuted }]}>·</Text>
                    <Text style={[sheetStyles.metaTxt, { color: c.sub }]}>{p.km} km</Text>
                    <Text style={[sheetStyles.metaTxt, { color: c.softMuted }]}>·</Text>
                    <Text style={[sheetStyles.metaTxt, { color: c.sub }]}>{p.area}</Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[sheetStyles.listPrice, { color: p.color }]}>{p.price}</Text>
                  <Text style={[sheetStyles.listPriceSub, { color: c.softMuted }]}>desde</Text>
                </View>
              </Pressable>
            ))}
            <Pressable
              onPress={onSeeAll}
              style={[sheetStyles.seeAll, { backgroundColor: c.background, borderColor: c.borderLight }]}
            >
              <Text style={[sheetStyles.seeAllTxt, { color: c.text }]}>Ver tudo no Marketplace</Text>
              <Ionicons name="arrow-forward" size={14} color={c.text} />
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 18, gap: 10 }}
          >
            {providers.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => onSelect(p)}
                style={[
                  styles.providerMiniCard,
                  {
                    backgroundColor: c.background,
                    borderColor: active?.id === p.id ? p.color : c.borderLight,
                  },
                ]}
              >
                <View style={styles.providerMiniHead}>
                  <View style={[styles.providerMiniIcon, { backgroundColor: `${p.color}18` }]}>
                    {p.cat === "Mudança" ? (
                      <Ionicons name="home" size={12} color={p.color} />
                    ) : p.cat === "Frete" ? (
                      <MaterialCommunityIcons name="truck" size={13} color={p.color} />
                    ) : (
                      <Ionicons name="cube" size={12} color={p.color} />
                    )}
                  </View>
                  <Text style={[styles.providerMiniPrice, { color: p.color }]}>{p.price}</Text>
                </View>
                <View>
                  <Text style={[styles.providerMiniName, { color: c.text }]} numberOfLines={1}>{p.name}</Text>
                  <Text style={[styles.providerMiniMeta, { color: c.softMuted }]}>★ {p.rating} · {p.vehicle}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </Animated.View>
  );
}

const sheetStyles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    zIndex: 31,
    overflow: "hidden",
  },
  dragArea: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 14, fontFamily: fonts.sans.bold },
  headerSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  toggleBtn: { width: 32, height: 32, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  searchingBody: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 18 },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  listAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  listIni: { color: "#fff", fontSize: 13, fontFamily: fonts.serif.extra },
  listHeadRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  listName: { flex: 1, fontSize: 13, fontFamily: fonts.sans.bold },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  listMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap" },
  catTag: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  catTxt: { fontSize: 11, fontFamily: fonts.sans.bold },
  metaTxt: { fontSize: 10, fontFamily: fonts.sans.semibold },
  listPrice: { fontSize: 14, fontFamily: fonts.serif.extra },
  listPriceSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 1 },

  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  seeAllTxt: { fontSize: 13, fontFamily: fonts.sans.bold },
});
