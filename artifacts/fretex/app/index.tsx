import React, { useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Animated, PanResponder, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useService } from "@/contexts/ServiceContext";
import { MOCK_PROVIDERS, FILTERS, CATEGORY_COLORS, type Category, type Provider } from "@/constants/mockData";
import colors, { fonts, shadows } from "@/constants/colors";
import { TopNav } from "@/components/TopNav";
import { SideSheet } from "@/components/SideSheet";
import { ProfileOverlay } from "@/components/ProfileOverlay";
import { MapSVG } from "@/components/MapSVG";
import { ProviderPin } from "@/components/ProviderPin";
import { Chip } from "@/components/Chip";
import { ProviderModal } from "@/components/ProviderModal";

/* ─── Activity Heatmap ───────────────────────────────────────────────── */
const WEEKS = 12;
const DAYS = 7;
const CELL = 14;
const CELL_GAP = 3;

function generateActivityData(): { count: number; day: Date }[] {
  const today = new Date();
  const cells: { count: number; day: Date }[] = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (w * DAYS + (DAYS - 1 - d)));
      const rand = Math.random();
      const count = rand < 0.25 ? 0 : rand < 0.55 ? 1 : rand < 0.75 ? 2 : rand < 0.9 ? 3 : 4;
      cells.push({ count, day: date });
    }
  }
  return cells;
}

const ACTIVITY_DATA = generateActivityData();

const BEST_HOURS = [
  { hour: "08h–10h", score: 87, label: "Frete" },
  { hour: "13h–15h", score: 73, label: "Mudança" },
  { hour: "17h–19h", score: 65, label: "Entrega" },
];

function ActivityHeatmap() {
  const c = colors.light;
  const cellColor = (count: number) => {
    if (count === 0) return c.border;
    if (count === 1) return `${c.primary}55`;
    if (count === 2) return `${c.primary}99`;
    if (count === 3) return c.primary;
    return c.primaryDeep;
  };

  const totalServices = ACTIVITY_DATA.reduce((s, d) => s + (d.count > 0 ? d.count : 0), 0);
  const activeDays = ACTIVITY_DATA.filter((d) => d.count > 0).length;
  const streak = (() => {
    let s = 0;
    for (let i = ACTIVITY_DATA.length - 1; i >= 0; i--) {
      if (ACTIVITY_DATA[i].count > 0) s++;
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
        <View style={[heatStyles.statPill, { backgroundColor: `${c.primary}22` }]}>
          <Text style={[heatStyles.statVal, { color: "#8B6F00" }]}>{totalServices}</Text>
          <Text style={[heatStyles.statLbl, { color: c.sub }]}>serviços</Text>
        </View>
        <View style={[heatStyles.statPill, { backgroundColor: c.blueLight }]}>
          <Text style={[heatStyles.statVal, { color: c.blue }]}>{activeDays}</Text>
          <Text style={[heatStyles.statLbl, { color: c.sub }]}>dias ativos</Text>
        </View>
        <View style={[heatStyles.statPill, { backgroundColor: c.successLight }]}>
          <Text style={[heatStyles.statVal, { color: c.success }]}>{streak}</Text>
          <Text style={[heatStyles.statLbl, { color: c.sub }]}>sequência</Text>
        </View>
      </View>

      {/* Grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        <View style={{ flexDirection: "row", gap: CELL_GAP }}>
          {Array.from({ length: WEEKS }).map((_, w) => (
            <View key={w} style={{ flexDirection: "column", gap: CELL_GAP }}>
              {Array.from({ length: DAYS }).map((_, d) => {
                const cell = ACTIVITY_DATA[w * DAYS + d];
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
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={heatStyles.legend}>
        <Text style={[heatStyles.legendText, { color: c.softMuted }]}>Menos</Text>
        {[0, 1, 2, 3, 4].map((v) => (
          <View key={v} style={[heatStyles.legendCell, { backgroundColor: cellColor(v) }]} />
        ))}
        <Text style={[heatStyles.legendText, { color: c.softMuted }]}>Mais</Text>
      </View>

      {/* Best hours report */}
      <View style={[heatStyles.divider, { backgroundColor: c.border }]} />
      <Text style={[heatStyles.reportTitle, { color: c.text }]}>Melhores horários</Text>
      {BEST_HOURS.map((h) => (
        <View key={h.hour} style={heatStyles.hourRow}>
          <Text style={[heatStyles.hourLabel, { color: c.text }]}>{h.hour}</Text>
          <View style={[heatStyles.hourBar, { backgroundColor: c.border }]}>
            <View style={[heatStyles.hourFill, { width: `${h.score}%` as any, backgroundColor: c.primary }]} />
          </View>
          <Text style={[heatStyles.hourScore, { color: "#8B6F00" }]}>{h.score}%</Text>
          <View style={[heatStyles.hourCat, { backgroundColor: `${c.blue}18` }]}>
            <Text style={[heatStyles.hourCatText, { color: c.blue }]}>{h.label}</Text>
          </View>
        </View>
      ))}
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
  statLbl: { fontSize: 9, fontFamily: fonts.sans.regular, marginTop: 2 },
  cell: { borderRadius: 3 },
  legend: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  legendText: { fontSize: 9, fontFamily: fonts.sans.regular },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
  divider: { height: 1, marginVertical: 14 },
  reportTitle: { fontSize: 12, fontFamily: fonts.sans.bold, marginBottom: 10 },
  hourRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  hourLabel: { width: 72, fontSize: 11, fontFamily: fonts.sans.semibold },
  hourBar: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  hourFill: { height: 6, borderRadius: 3 },
  hourScore: { width: 34, fontSize: 11, fontFamily: fonts.sans.bold, textAlign: "right" },
  hourCat: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  hourCatText: { fontSize: 9, fontFamily: fonts.sans.bold },
});

export default function HomeScreen() {
  const { user, role } = useAuth();
  if (!user) return null;
  return role === "cliente" ? <ClienteHome /> : <PrestadorHome />;
}

function ChipBar({ onService, onInbox, onMarketplace, badgeColor = "#FF5500" }: { onService: () => void; onInbox: () => void; onMarketplace: () => void; badgeColor?: string }) {
  const c = colors.light;
  return (
    <View style={chipStyles.row}>
      <Pressable onPress={onService} style={[chipStyles.chip, { backgroundColor: c.card, borderColor: c.border }, shadows.md]}>
        <MaterialCommunityIcons name="truck" size={14} color={c.text} />
        <Text style={chipStyles.label}>Serviço</Text>
      </Pressable>
      <Pressable onPress={onInbox} style={[chipStyles.chip, { backgroundColor: c.card, borderColor: c.border }, shadows.md]}>
        <Ionicons name="chatbubbles" size={13} color={c.text} />
        <Text style={chipStyles.label}>Inbox</Text>
        <View style={[chipStyles.badge, { backgroundColor: badgeColor }]}>
          <Text style={chipStyles.badgeText}>2</Text>
        </View>
      </Pressable>
      <Pressable onPress={onMarketplace} style={[chipStyles.chip, { backgroundColor: c.card, borderColor: c.border }, shadows.md]}>
        <Ionicons name="cart" size={13} color={c.text} />
        <Text style={chipStyles.label}>Marketplace</Text>
      </Pressable>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  label: { fontSize: 12, fontFamily: fonts.sans.bold, color: "#1C1917" },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  badgeText: { color: "#fff", fontSize: 9, fontFamily: fonts.sans.extra },
});

/* ─── ClienteHome ─────────────────────────────────────────────────────── */
function ClienteHome() {
  const c = colors.light;
  const router = useRouter();
  const { user } = useAuth();
  const { active: activeService } = useService();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Todos");
  const [active, setActive] = useState<Provider | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [modalProvider, setModalProvider] = useState<Provider | null>(null);

  const filtered = useMemo(
    () => (filter === "Todos" ? MOCK_PROVIDERS : MOCK_PROVIDERS.filter((p) => p.cat === filter)),
    [filter]
  );

  const counts = useMemo(() => {
    const result: Record<string, number> = { Todos: MOCK_PROVIDERS.length };
    (["Mudança", "Frete", "Entrega"] as Category[]).forEach((k) => {
      result[k] = MOCK_PROVIDERS.filter((p) => p.cat === k).length;
    });
    return result;
  }, []);

  const initials = (user?.name || "RA").split(" ").map((p) => p[0]).slice(0, 2).join("");

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* Map area */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <MapSVG />
        {/* User location */}
        <View style={[styles.userLocWrap, { top: "32%" }]} pointerEvents="none">
          <View style={[styles.userPulse, { backgroundColor: `${c.blue}33` }]} />
          <View style={[styles.userDot, { backgroundColor: c.blue, borderColor: c.card }]} />
        </View>

        {/* Pins */}
        {filtered.map((p) => {
          const topPct = 14 + (p.lat / 100) * 40;
          return (
            <View
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.lng}%`,
                top: `${topPct}%`,
                transform: [{ translateX: -30 }, { translateY: -16 }],
                zIndex: 35,
              }}
            >
              <ProviderPin
                category={p.cat}
                price={p.price}
                color={p.color}
                active={active?.id === p.id}
                onPress={() => setActive(active?.id === p.id ? null : p)}
              />
            </View>
          );
        })}
      </View>

      <TopNav
        title="Ajudaê!"
        subtitle="Tijuca, Rio de Janeiro"
        initials={initials}
        badge
        onMenuOpen={() => setMenuOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
      />

      {/* Active mini card */}
      {active ? (
        <View style={[styles.activeCard, { backgroundColor: c.card, bottom: 248 + insets.bottom }, shadows.lg]}>
          <View style={styles.activeRow}>
            <View style={[styles.activeIcon, { backgroundColor: `${active.color}18` }]}>
              {active.cat === "Mudança" ? (
                <Ionicons name="home" size={17} color={active.color} />
              ) : active.cat === "Frete" ? (
                <MaterialCommunityIcons name="truck" size={18} color={active.color} />
              ) : (
                <Ionicons name="cube" size={17} color={active.color} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.activeName, { color: c.text }]}>{active.name}</Text>
              <Text style={[styles.activeSub, { color: c.softMuted }]}>★ {active.rating} · {active.vehicle}</Text>
            </View>
            <Pressable
              onPress={() => setActive(null)}
              style={[styles.activeClose, { backgroundColor: c.background }]}
            >
              <Ionicons name="close" size={13} color={c.softMuted} />
            </Pressable>
          </View>
          <View style={styles.activeBtns}>
            <View style={[styles.activePrice, { backgroundColor: c.background }]}>
              <Text style={[styles.activePriceText, { color: active.color }]}>{active.price}</Text>
              <Text style={[styles.activePriceSub, { color: c.softMuted }]}>estimado</Text>
            </View>
            <Pressable
              onPress={() => setModalProvider(active)}
              style={[styles.activeRequestBtn, { backgroundColor: active.color }]}
            >
              <Text style={styles.activeRequestText}>Solicitar</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Active service tracking banner */}
      {activeService && activeService.status !== "completed" && activeService.status !== "cancelled" ? (
        <Pressable
          onPress={() => router.push("/track")}
          style={[
            styles.trackBanner,
            {
              top: insets.top + 70,
              backgroundColor:
                activeService.category === "Mudança"
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
            <Text style={styles.trackEyebrow}>ACOMPANHAR PEDIDO · #{activeService.id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.trackTitle}>
              {activeService.status === "requested"
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
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </Pressable>
      ) : null}

      {/* Chip buttons */}
      <View style={[styles.actionChipsWrap, { bottom: 198 + insets.bottom }]}>
        <ChipBar
          onService={() => router.push(activeService && activeService.status !== "completed" && activeService.status !== "cancelled" ? "/track" : "/request")}
          onInbox={() => router.push("/inbox")}
          onMarketplace={() => router.push("/marketplace")}
        />
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        style={[styles.filtersWrap, { bottom: 152 + insets.bottom }]}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f}
            label={f}
            active={filter === f}
            count={counts[f]}
            category={f === "Todos" ? null : (f as Category)}
            onPress={() => setFilter(f)}
          />
        ))}
      </ScrollView>

      {/* Bottom draggable sheet */}
      <ProvidersSheet
        providers={filtered}
        active={active}
        onSelect={(p) => {
          setActive(p);
          setModalProvider(p);
        }}
        onOpenProfile={(p) => router.push(`/provider/${p.id}`)}
        onSeeAll={() => router.push("/marketplace")}
        insetsBottom={insets.bottom}
      />

      <SideSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} name={user?.name || "Cliente"} initials={initials} />
      <ProviderModal
        open={!!modalProvider}
        provider={modalProvider}
        onClose={() => setModalProvider(null)}
        onRequest={(p) => {
          setModalProvider(null);
          router.push({ pathname: "/request", params: { providerId: p.id } });
        }}
        onProfile={(p) => {
          setModalProvider(null);
          router.push(`/provider/${p.id}`);
        }}
      />
    </View>
  );
}

/* ─── PrestadorHome ──────────────────────────────────────────────────── */
function PrestadorHome() {
  const c = colors.light;
  const router = useRouter();
  const { user } = useAuth();
  const { active: activeService } = useService();
  const insets = useSafeAreaInsets();
  const [online, setOnline] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const initials = (user?.name || "CO").split(" ").map((p) => p[0]).slice(0, 2).join("");
  const firstName = (user?.name || "Carlos").split(" ")[0];

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
    { v: "R$247", l: "Hoje", color: c.success, bg: c.successLight },
    { v: "4.9 ★", l: "Avaliação", color: c.warning, bg: c.warningLight },
    { v: "3", l: "Serviços", color: c.blue, bg: c.blueLight },
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
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Online toggle */}
        <Pressable
          onPress={() => setOnline((v) => !v)}
          style={[
            styles.onlineRow,
            {
              backgroundColor: online ? c.successLight : c.card,
              borderColor: online ? "#BBF7D0" : c.border,
            },
          ]}
        >
          <View style={[styles.onlineDot, { backgroundColor: online ? c.success : c.softMuted }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.onlineTitle, { color: c.text }]}>
              {online ? "Você está disponível" : "Você está offline"}
            </Text>
            <Text style={[styles.onlineSub, { color: c.softMuted }]}>
              {online ? "Visível no mapa" : "Toque para ativar"}
            </Text>
          </View>
          <View style={[styles.toggle, { backgroundColor: online ? c.success : "#D4D0CB" }]}>
            <View style={[styles.toggleDot, { left: online ? 23 : 3 }]} />
          </View>
        </Pressable>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.l} style={[styles.statCard, { backgroundColor: s.bg }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.v}</Text>
              <Text style={[styles.statLabel, { color: c.sub }]}>{s.l}</Text>
            </View>
          ))}
        </View>

        {/* Radar */}
        <View style={[styles.radarCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <View style={styles.radarHead}>
            <Text style={[styles.radarTitle, { color: c.text }]}>Radar do mercado</Text>
            <Text style={[styles.radarSub, { color: c.blue }]}>6 publicações perto</Text>
          </View>
          <View style={styles.statsGrid}>
            {market.map((m) => (
              <View key={m.label} style={[styles.marketCell, { backgroundColor: c.background }]}>
                <Text style={[styles.marketLabel, { color: c.text }]}>{m.label}</Text>
                <Text style={[styles.marketValue, { color: c.text }]}>{m.value}</Text>
                <Text style={[styles.marketTrend, { color: m.trend.startsWith("+") ? c.success : c.warning }]}>{m.trend}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Activity heatmap */}
        <ActivityHeatmap />

        {/* Active job — only when prestador has accepted/en_route/in_progress */}
        {inProgress ? (
          <Pressable onPress={() => router.push("/job")}>
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
              <Text style={styles.jobTitle}>
                {inProgress.category} · {inProgress.customerName}
              </Text>
              <Text style={styles.jobSub}>
                {inProgress.status === "accepted"
                  ? "Confirme que está saindo →"
                  : inProgress.status === "en_route"
                  ? "Você está a caminho →"
                  : "Concluir e cobrar PIN →"}
              </Text>
            </LinearGradient>
          </Pressable>
        ) : null}

        {/* Real incoming request */}
        {incoming ? (
          <View style={[styles.requestCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
            <View style={styles.requestHead}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.requestName, { color: c.text }]}>{incoming.customerName}</Text>
                <Text style={[styles.requestMeta, { color: c.softMuted }]}>
                  {incoming.category} · {incoming.scheduled ? "Agendado" : "Imediato"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.requestPrice, { color: c.success }]}>R$ {(incoming.estimatedPrice * 0.85).toFixed(2)}</Text>
                <Text style={[styles.requestSub, { color: c.softMuted }]}>líquido · Agora</Text>
              </View>
            </View>
            <View style={styles.requestBtns}>
              <Pressable
                onPress={() => router.push("/request-details")}
                style={[styles.requestRefuse, { backgroundColor: c.background, borderColor: c.border }]}
              >
                <Text style={[styles.requestRefuseText, { color: c.sub }]}>Recusar</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/request-details")}
                style={[styles.requestAccept, { backgroundColor: incomingAccent }]}
              >
                <Text style={styles.requestAcceptText}>Ver detalhes →</Text>
              </Pressable>
            </View>
          </View>
        ) : !inProgress ? (
          <View style={[styles.requestCard, { backgroundColor: c.card, borderColor: c.border, alignItems: "center" }, shadows.sm]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: c.background }]}>
              <Ionicons name="hourglass" size={20} color={c.softMuted} />
            </View>
            <Text style={[styles.requestName, { color: c.text, marginTop: 10, textAlign: "center" }]}>
              Aguardando solicitações
            </Text>
            <Text style={[styles.requestSub, { color: c.softMuted, textAlign: "center", marginTop: 4 }]}>
              Quando alguém pedir um serviço perto de você, aparecerá aqui.
            </Text>
            <Text style={[styles.requestSub, { color: c.softMuted, textAlign: "center", marginTop: 8, fontStyle: "italic" }]}>
              Para simular, troque para Cliente no menu lateral e crie um pedido.
            </Text>
          </View>
        ) : null}

        {/* Chip bar */}
        <View style={{ marginTop: 14 }}>
          <ChipBar
            onService={() => router.push("/request")}
            onInbox={() => router.push("/inbox")}
            onMarketplace={() => router.push("/marketplace")}
            badgeColor={c.blue}
          />
        </View>
      </ScrollView>

      <SideSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProfileOverlay
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        name={user?.name || "Prestador"}
        initials={initials}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /* Cliente */
  userLocWrap: { position: "absolute", left: "50%", marginLeft: -14, alignItems: "center", justifyContent: "center", zIndex: 20 },
  userPulse: { position: "absolute", width: 28, height: 28, borderRadius: 14 },
  userDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  activeCard: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 18,
    padding: 14,
    zIndex: 36,
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
  actionChipsWrap: { position: "absolute", right: 16, zIndex: 33 },
  filtersWrap: { position: "absolute", left: 0, right: 0, zIndex: 32, maxHeight: 40 },
  providerMiniCard: {
    width: 150,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
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
  jobCard: { borderRadius: 18, padding: 18, marginBottom: 16 },
  jobBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  jobLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.9)" },
  jobLiveText: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 1 },
  jobTitle: { color: "#fff", fontSize: 16, fontFamily: fonts.serif.extra },
  jobSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 3 },
  requestCard: { borderRadius: 16, borderWidth: 1.5, padding: 14 },
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
});

/* ─── Draggable providers sheet ─────────────────────────────────────── */
const SCREEN_H = Dimensions.get("window").height;
const COLLAPSED_H = 76;   // only handle + subtitle visible — no overlap with filters
const EXPANDED_H = Math.min(SCREEN_H * 0.78, 640);

function ProvidersSheet({
  providers,
  active,
  onSelect,
  onOpenProfile,
  onSeeAll,
  insetsBottom,
}: {
  providers: Provider[];
  active: Provider | null;
  onSelect: (p: Provider) => void;
  onOpenProfile: (p: Provider) => void;
  onSeeAll: () => void;
  insetsBottom: number;
}) {
  const c = colors.light;
  const heightAnim = useRef(new Animated.Value(COLLAPSED_H)).current;
  const startH = useRef(COLLAPSED_H);
  const [expanded, setExpanded] = useState(false);

  const snap = (target: number) => {
    Animated.spring(heightAnim, {
      toValue: target,
      tension: 70,
      friction: 13,
      useNativeDriver: false,
    }).start();
    startH.current = target;
    setExpanded(target === EXPANDED_H);
  };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        // capture current animated value
        // @ts-expect-error access internal
        startH.current = (heightAnim as any)._value ?? startH.current;
        heightAnim.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        const next = Math.max(COLLAPSED_H, Math.min(EXPANDED_H, startH.current - g.dy));
        heightAnim.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const mid = (COLLAPSED_H + EXPANDED_H) / 2;
        // @ts-expect-error access internal
        const value = (heightAnim as any)._value ?? startH.current;
        const target = g.vy < -0.5 ? EXPANDED_H : g.vy > 0.5 ? COLLAPSED_H : value > mid ? EXPANDED_H : COLLAPSED_H;
        snap(target);
      },
    }),
  ).current;

  const toggle = () => snap(expanded ? COLLAPSED_H : EXPANDED_H);

  return (
    <Animated.View
      style={[
        sheetStyles.sheet,
        { backgroundColor: c.card, height: heightAnim, paddingBottom: insetsBottom },
        shadows.xl,
      ]}
    >
      {/* Drag header */}
      <View {...responder.panHandlers} style={sheetStyles.header}>
        <View style={[sheetStyles.handle, { backgroundColor: "#D6D3D1" }]} />
        <View style={sheetStyles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[sheetStyles.headerTitle, { color: c.text }]}>
              {expanded ? "Prestadores na sua área" : "Perto de você"}
            </Text>
            <Text style={[sheetStyles.headerSub, { color: c.softMuted }]}>
              {providers.length} disponíveis · {expanded ? "deslize para baixo" : "puxe para ver lista"}
            </Text>
          </View>
          <Pressable onPress={toggle} style={[sheetStyles.toggleBtn, { backgroundColor: c.background, borderColor: c.borderLight }]}>
            <Ionicons name={expanded ? "chevron-down" : "chevron-up"} size={16} color={c.text} />
          </Pressable>
        </View>
      </View>

      {/* Body — list when expanded, carousel when collapsed */}
      {expanded ? (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
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
              <Text style={[styles.providerMiniName, { color: c.text }]} numberOfLines={1}>{p.name}</Text>
              <Text style={[styles.providerMiniMeta, { color: c.softMuted }]}>★ {p.rating} · {p.vehicle}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
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
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 14, fontFamily: fonts.sans.bold },
  headerSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  toggleBtn: { width: 32, height: 32, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },

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
  catTxt: { fontSize: 9, fontFamily: fonts.sans.bold },
  metaTxt: { fontSize: 10, fontFamily: fonts.sans.semibold },
  listPrice: { fontSize: 14, fontFamily: fonts.serif.extra },
  listPriceSub: { fontSize: 9, fontFamily: fonts.sans.regular, marginTop: 1 },

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
