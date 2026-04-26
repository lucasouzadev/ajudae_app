import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_PROVIDERS, FILTERS, CATEGORY_COLORS, type Category, type Provider } from "@/constants/mockData";
import colors, { fonts, shadows } from "@/constants/colors";
import { TopNav } from "@/components/TopNav";
import { SideSheet } from "@/components/SideSheet";
import { ProfileOverlay } from "@/components/ProfileOverlay";
import { MapSVG } from "@/components/MapSVG";
import { ProviderPin } from "@/components/ProviderPin";
import { Chip } from "@/components/Chip";
import { ProviderModal } from "@/components/ProviderModal";

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

      {/* Chip buttons */}
      <View style={[styles.actionChipsWrap, { bottom: 198 + insets.bottom }]}>
        <ChipBar
          onService={() => router.push("/request")}
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

      {/* Bottom sheet */}
      <View style={[styles.sheet, { backgroundColor: c.card, paddingBottom: insets.bottom }, shadows.xl]}>
        <View style={[styles.sheetHandle, { backgroundColor: "#D6D3D1" }]} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 18, gap: 10 }}
        >
          {filtered.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                setActive(p);
                setModalProvider(p);
              }}
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
              <Text style={[styles.providerMiniName, { color: c.text }]}>{p.name}</Text>
              <Text style={[styles.providerMiniMeta, { color: c.softMuted }]}>★ {p.rating} · {p.vehicle}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

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
  const insets = useSafeAreaInsets();
  const [online, setOnline] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const initials = (user?.name || "CO").split(" ").map((p) => p[0]).slice(0, 2).join("");
  const firstName = (user?.name || "Carlos").split(" ")[0];

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

        {/* Demo button */}
        <Pressable
          onPress={() => router.push("/request")}
          style={[styles.demoBtn, { backgroundColor: c.primary }, shadows.md]}
        >
          <Ionicons name="notifications" size={16} color="#fff" />
          <Text style={styles.demoBtnText}>Ver solicitação de serviço (demo)</Text>
        </Pressable>

        {/* Active job */}
        <LinearGradient
          colors={[c.primary, c.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.jobCard}
        >
          <View style={styles.jobBadgeRow}>
            <View style={styles.jobLiveDot} />
            <Text style={styles.jobLiveText}>SERVIÇO EM ANDAMENTO — AO VIVO</Text>
          </View>
          <Text style={styles.jobTitle}>Mudança · Tijuca → Barra</Text>
          <Text style={styles.jobSub}>12,4 km · Ver mapa →</Text>
        </LinearGradient>

        {/* Request card */}
        <View style={[styles.requestCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <View style={styles.requestHead}>
            <View>
              <Text style={[styles.requestName, { color: c.text }]}>Ricardo A.</Text>
              <Text style={[styles.requestMeta, { color: c.softMuted }]}>Mudança · 12.4 km</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.requestPrice, { color: c.success }]}>R$75,65</Text>
              <Text style={[styles.requestSub, { color: c.softMuted }]}>líquido · Agora</Text>
            </View>
          </View>
          <View style={styles.requestBtns}>
            <Pressable style={[styles.requestRefuse, { backgroundColor: c.background, borderColor: c.border }]}>
              <Text style={[styles.requestRefuseText, { color: c.sub }]}>Recusar</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/request")}
              style={[styles.requestAccept, { backgroundColor: c.primary }]}
            >
              <Text style={styles.requestAcceptText}>Ver detalhes →</Text>
            </Pressable>
          </View>
        </View>

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
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 31,
  },
  sheetHandle: { width: 34, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 8 },
  providerMiniCard: {
    width: 140,
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
  demoBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  demoBtnText: { color: "#fff", fontSize: 14, fontFamily: fonts.sans.extra },
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
