import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_PROVIDERS, MOCK_POSTINGS, FILTERS, type Category } from "@/constants/mockData";
import colors, { fonts, shadows } from "@/constants/colors";
import { TopNav } from "@/components/TopNav";
import { SideSheet } from "@/components/SideSheet";
import { ProfileOverlay } from "@/components/ProfileOverlay";
import { MarketMap, type MapPin } from "@/components/MarketMap";

export default function MarketplaceScreen() {
  const { role, user } = useAuth();
  if (!user) return null;
  return role === "cliente" ? <ClienteMarketplace /> : <PrestadorMarketplace />;
}

function ClienteMarketplace() {
  const c = colors.light;
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Todos");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activePin, setActivePin] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = filter === "Todos" ? MOCK_PROVIDERS : MOCK_PROVIDERS.filter((p) => p.cat === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.area.toLowerCase().includes(q));
    }
    return list;
  }, [filter, query]);

  const onlinePins: MapPin[] = useMemo(
    () =>
      filtered
        .filter((p) => p.isOnline)
        .map((p) => ({ id: p.id, cat: p.cat, color: p.color, label: p.price, lat: p.lat, lng: p.lng })),
    [filtered],
  );

  const sortedList = useMemo(() => {
    if (!activePin) return filtered;
    const pinned = filtered.find((p) => p.id === activePin);
    if (!pinned) return filtered;
    return [pinned, ...filtered.filter((p) => p.id !== activePin)];
  }, [filtered, activePin]);

  const initials = (user?.name || "RA").split(" ").map((p) => p[0]).slice(0, 2).join("");

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <TopNav
        title="Marketplace"
        subtitle="Encontre o profissional ideal"
        initials={initials}
        badge
        onMenuOpen={() => setMenuOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero gradient */}
        <LinearGradient
          colors={[c.primary, c.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>MARKETPLACE</Text>
          <Text style={styles.heroTitle}>Quem você quer perto?</Text>
          <Text style={styles.heroSub}>Compare prestadores, propostas e tempo de chegada.</Text>
        </LinearGradient>

        {/* Live map */}
        <MarketMap
          pins={onlinePins}
          activeId={activePin}
          onPinPress={(id) => setActivePin(id === activePin ? null : id)}
          title="Prestadores ao vivo"
          subtitle={`${onlinePins.length} online · disponíveis agora`}
          badgeColor={c.success}
        />

        {/* Search */}
        <View style={[styles.search, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Ionicons name="search" size={16} color={c.softMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar nome, bairro, serviço..."
            placeholderTextColor={c.softMuted}
            style={[styles.searchInput, { color: c.text }]}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color={c.softMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginBottom: 6 }}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterChip,
                  { backgroundColor: active ? c.text : c.card, borderColor: active ? c.text : c.border },
                ]}
              >
                <Text
                  style={{
                    color: active ? "#fff" : c.text,
                    fontFamily: active ? fonts.sans.bold : fonts.sans.medium,
                    fontSize: 12,
                  }}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* List */}
        {sortedList.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => router.push(`/provider/${p.id}`)}
            style={[
              styles.providerCard,
              { backgroundColor: c.card, borderColor: activePin === p.id ? p.color : c.border, borderWidth: activePin === p.id ? 2 : 1 },
              shadows.sm,
            ]}
          >
            <LinearGradient
              colors={[p.color, `${p.color}AA`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.providerAvatar}
            >
              <Text style={styles.providerInitials}>{p.ini}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <View style={styles.providerHeadRow}>
                <Text style={[styles.providerName, { color: c.text }]}>{p.name}</Text>
                {p.isOnline ? (
                  <View style={[styles.onlineBadge, { backgroundColor: c.successLight }]}>
                    <View style={[styles.onlineDot, { backgroundColor: c.success }]} />
                    <Text style={[styles.onlineText, { color: c.success }]}>online</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.providerMetaRow}>
                <View style={[styles.catTag, { backgroundColor: `${p.color}18` }]}>
                  {p.cat === "Mudança" ? (
                    <Ionicons name="home" size={10} color={p.color} />
                  ) : p.cat === "Frete" ? (
                    <MaterialCommunityIcons name="truck" size={11} color={p.color} />
                  ) : (
                    <Ionicons name="cube" size={10} color={p.color} />
                  )}
                  <Text style={[styles.catTagText, { color: p.color }]}>{p.cat}</Text>
                </View>
                <Ionicons name="star" size={11} color={c.warning} />
                <Text style={[styles.metaText, { color: c.warning }]}>{p.rating}</Text>
                <Text style={[styles.metaSep, { color: c.softMuted }]}>·</Text>
                <Text style={[styles.metaText, { color: c.sub }]}>{p.area}</Text>
                <Text style={[styles.metaSep, { color: c.softMuted }]}>·</Text>
                <Text style={[styles.metaText, { color: c.sub }]}>{p.km} km</Text>
              </View>
              <View style={styles.providerFootRow}>
                <Text style={[styles.priceFrom, { color: c.softMuted }]}>a partir de</Text>
                <Text style={[styles.priceVal, { color: p.color }]}>{p.price}</Text>
                <View style={{ flex: 1 }} />
                <Ionicons name="chevron-forward" size={16} color={c.softMuted} />
              </View>
            </View>
          </Pressable>
        ))}

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search" size={28} color={c.softMuted} />
            <Text style={[styles.emptyText, { color: c.sub }]}>Nenhum prestador encontrado</Text>
          </View>
        ) : null}
      </ScrollView>

      <SideSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} name={user?.name || "Cliente"} initials={initials} />
    </View>
  );
}

function PrestadorMarketplace() {
  const c = colors.light;
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Todos");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activePin, setActivePin] = useState<string | null>(null);

  const initials = (user?.name || "CO").split(" ").map((p) => p[0]).slice(0, 2).join("");
  const filtered = filter === "Todos" ? MOCK_POSTINGS : MOCK_POSTINGS.filter((p) => p.cat === filter);

  const postingPins: MapPin[] = useMemo(
    () =>
      filtered.map((p) => {
        const color = p.cat === "Mudança" ? c.primary : p.cat === "Frete" ? c.blue : c.success;
        return { id: p.id, cat: p.cat, color, label: p.budget, lat: p.lat, lng: p.lng, scheduled: p.scheduled };
      }),
    [filtered, c],
  );

  const sortedPostings = useMemo(() => {
    if (!activePin) return filtered;
    const pinned = filtered.find((p) => p.id === activePin);
    if (!pinned) return filtered;
    return [pinned, ...filtered.filter((p) => p.id !== activePin)];
  }, [filtered, activePin]);

  const scheduledCount = filtered.filter((p) => p.scheduled).length;
  const liveCount = filtered.length - scheduledCount;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <TopNav
        title="Marketplace"
        subtitle="Solicitações abertas"
        initials={initials}
        badge
        accentColor={c.blue}
        onMenuOpen={() => setMenuOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[c.blue, "#60A5FA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>OPORTUNIDADES</Text>
          <Text style={styles.heroTitle}>Pulso do mercado</Text>
          <Text style={styles.heroSub}>{filtered.length} publicações próximas — {liveCount} ao vivo · {scheduledCount} agendadas.</Text>
        </LinearGradient>

        {/* Live map */}
        <MarketMap
          pins={postingPins}
          activeId={activePin}
          onPinPress={(id) => setActivePin(id === activePin ? null : id)}
          title="Clientes na sua região"
          subtitle={`${liveCount} ao vivo · ${scheduledCount} agendados`}
          badgeColor={c.blue}
        />

        {/* Pulse */}
        <View style={[styles.pulseRow]}>
          <View style={[styles.pulseCell, { backgroundColor: c.successLight }]}>
            <Text style={[styles.pulseValue, { color: c.success }]}>R$214</Text>
            <Text style={[styles.pulseLabel, { color: c.sub }]}>Ticket médio</Text>
          </View>
          <View style={[styles.pulseCell, { backgroundColor: c.blueLight }]}>
            <Text style={[styles.pulseValue, { color: c.blue }]}>4 min</Text>
            <Text style={[styles.pulseLabel, { color: c.sub }]}>Aceite médio</Text>
          </View>
          <View style={[styles.pulseCell, { backgroundColor: c.warningLight }]}>
            <Text style={[styles.pulseValue, { color: c.warning }]}>92%</Text>
            <Text style={[styles.pulseLabel, { color: c.sub }]}>Conversão</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginBottom: 6 }}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterChip,
                  { backgroundColor: active ? c.blue : c.card, borderColor: active ? c.blue : c.border },
                ]}
              >
                <Text
                  style={{
                    color: active ? "#fff" : c.text,
                    fontFamily: active ? fonts.sans.bold : fonts.sans.medium,
                    fontSize: 12,
                  }}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Postings */}
        {sortedPostings.map((post) => {
          const catColor = post.cat === "Mudança" ? c.primary : post.cat === "Frete" ? c.blue : c.success;
          const active = activePin === post.id;
          return (
            <View
              key={post.id}
              style={[
                styles.postCard,
                { backgroundColor: c.card, borderColor: active ? catColor : c.border, borderWidth: active ? 2 : 1 },
                shadows.sm,
              ]}
            >
              <View style={styles.postHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.postClient, { color: c.softMuted }]}>{post.client}</Text>
                  <Text style={[styles.postRoute, { color: c.text }]}>{post.route}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.postBudget, { color: c.success }]}>{post.budget}</Text>
                  <Text style={[styles.postWhen, { color: c.softMuted }]}>{post.when}</Text>
                </View>
              </View>
              <View style={styles.postRow}>
                <View style={[styles.catTag, { backgroundColor: `${catColor}18` }]}>
                  {post.cat === "Mudança" ? (
                    <Ionicons name="home" size={10} color={catColor} />
                  ) : post.cat === "Frete" ? (
                    <MaterialCommunityIcons name="truck" size={11} color={catColor} />
                  ) : (
                    <Ionicons name="cube" size={10} color={catColor} />
                  )}
                  <Text style={[styles.catTagText, { color: catColor }]}>{post.cat}</Text>
                </View>
                <Text style={[styles.postObjects, { color: c.sub }]}>{post.objects}</Text>
              </View>
              <View style={styles.postFoot}>
                <View style={styles.postFootLeft}>
                  <Ionicons name="people" size={13} color={c.softMuted} />
                  <Text style={[styles.postFootText, { color: c.softMuted }]}>{post.providers} propostas</Text>
                </View>
                <Pressable
                  onPress={() => router.push("/request")}
                  style={[styles.postCta, { backgroundColor: c.blue }]}
                >
                  <Text style={styles.postCtaText}>Enviar proposta</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <SideSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} name={user?.name || "Prestador"} initials={initials} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 22, padding: 20, marginBottom: 16 },
  heroEyebrow: { color: "rgba(255,255,255,0.78)", fontSize: 10, letterSpacing: 1, fontFamily: fonts.sans.bold },
  heroTitle: { color: "#fff", fontSize: 22, fontFamily: fonts.serif.extra, marginTop: 4, lineHeight: 26 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 6, lineHeight: 18 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: fonts.sans.medium, paddingVertical: 0 },
  filterChip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  providerCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  providerAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  providerInitials: { color: "#fff", fontSize: 18, fontFamily: fonts.serif.extra },
  providerHeadRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  providerName: { flex: 1, fontSize: 14, fontFamily: fonts.sans.bold },
  onlineBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  onlineDot: { width: 5, height: 5, borderRadius: 3 },
  onlineText: { fontSize: 9, fontFamily: fonts.sans.bold },
  providerMetaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  catTag: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, marginRight: 2 },
  catTagText: { fontSize: 10, fontFamily: fonts.sans.bold },
  metaText: { fontSize: 11, fontFamily: fonts.sans.semibold },
  metaSep: { fontSize: 11, fontFamily: fonts.sans.regular },
  providerFootRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 7 },
  priceFrom: { fontSize: 10, fontFamily: fonts.sans.regular },
  priceVal: { fontSize: 15, fontFamily: fonts.serif.extra },
  empty: { paddingVertical: 50, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 13, fontFamily: fonts.sans.medium },

  pulseRow: { flexDirection: "row", gap: 8 },
  pulseCell: { flex: 1, padding: 10, borderRadius: 14, alignItems: "center" },
  pulseValue: { fontSize: 15, fontFamily: fonts.serif.extra },
  pulseLabel: { fontSize: 10, fontFamily: fonts.sans.regular, marginTop: 3 },

  postCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 10 },
  postHead: { flexDirection: "row", marginBottom: 8 },
  postClient: { fontSize: 11, fontFamily: fonts.sans.regular },
  postRoute: { fontSize: 14, fontFamily: fonts.sans.bold, marginTop: 2 },
  postBudget: { fontSize: 16, fontFamily: fonts.serif.extra },
  postWhen: { fontSize: 10, fontFamily: fonts.sans.regular, marginTop: 2 },
  postRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  postObjects: { flex: 1, fontSize: 11, fontFamily: fonts.sans.regular },
  postFoot: { flexDirection: "row", alignItems: "center", gap: 10 },
  postFootLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  postFootText: { fontSize: 11, fontFamily: fonts.sans.medium },
  postCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 11,
  },
  postCtaText: { color: "#fff", fontSize: 12, fontFamily: fonts.sans.bold },
});
