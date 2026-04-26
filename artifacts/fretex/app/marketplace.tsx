import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_PROVIDERS, MOCK_POSTINGS, FILTERS, CATEGORIES, type Category } from "@/constants/mockData";
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

/* ─── Custom Order Modal (Cliente) ────────────────────────────────────── */
function CustomOrderModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = colors.light;
  const [cat, setCat] = useState<Category>("Frete");
  const [budget, setBudget] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const catColors: Record<Category, string> = {
    Mudança: c.primary,
    Frete: c.blue,
    Entrega: c.success,
  };

  const handleSubmit = () => {
    if (!origin.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
      setBudget(""); setOrigin(""); setDestination(""); setDescription(""); setScheduleDate("");
    }, 1800);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            {/* Header */}
            <View style={[modalStyles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
              <Pressable onPress={onClose} style={modalStyles.headerClose}>
                <Ionicons name="close" size={20} color={c.text} />
              </Pressable>
              <Text style={[modalStyles.headerTitle, { color: c.text }]}>Criar pedido customizado</Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Category */}
              <Text style={[modalStyles.label, { color: c.sub }]}>Categoria</Text>
              <View style={modalStyles.catRow}>
                {CATEGORIES.map((c2) => {
                  const active = cat === c2;
                  const col = catColors[c2];
                  return (
                    <Pressable
                      key={c2}
                      onPress={() => setCat(c2)}
                      style={[
                        modalStyles.catChip,
                        {
                          backgroundColor: active ? col : c.card,
                          borderColor: active ? col : c.border,
                        },
                      ]}
                    >
                      {c2 === "Mudança" ? (
                        <Ionicons name="home" size={14} color={active ? (col === c.primary ? "#1A1714" : "#fff") : c.sub} />
                      ) : c2 === "Frete" ? (
                        <MaterialCommunityIcons name="truck" size={15} color={active ? "#fff" : c.sub} />
                      ) : (
                        <Ionicons name="cube" size={14} color={active ? "#fff" : c.sub} />
                      )}
                      <Text
                        style={[
                          modalStyles.catChipText,
                          { color: active ? (c2 === "Mudança" ? "#1A1714" : "#fff") : c.text },
                        ]}
                      >
                        {c2}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Origin */}
              <Text style={[modalStyles.label, { color: c.sub }]}>Origem *</Text>
              <View style={[modalStyles.inputWrap, { backgroundColor: c.card, borderColor: c.border }]}>
                <Ionicons name="location" size={16} color={c.softMuted} />
                <TextInput
                  value={origin}
                  onChangeText={setOrigin}
                  placeholder="Endereço de origem"
                  placeholderTextColor={c.softMuted}
                  style={[modalStyles.input, { color: c.text }]}
                  returnKeyType="next"
                />
              </View>

              {/* Destination */}
              <Text style={[modalStyles.label, { color: c.sub }]}>Destino</Text>
              <View style={[modalStyles.inputWrap, { backgroundColor: c.card, borderColor: c.border }]}>
                <Ionicons name="flag" size={16} color={c.softMuted} />
                <TextInput
                  value={destination}
                  onChangeText={setDestination}
                  placeholder="Endereço de destino (opcional)"
                  placeholderTextColor={c.softMuted}
                  style={[modalStyles.input, { color: c.text }]}
                  returnKeyType="next"
                />
              </View>

              {/* Description */}
              <Text style={[modalStyles.label, { color: c.sub }]}>Descrição</Text>
              <View style={[modalStyles.inputWrap, { backgroundColor: c.card, borderColor: c.border, alignItems: "flex-start", paddingVertical: 10 }]}>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="O que precisa ser transportado? (opcional)"
                  placeholderTextColor={c.softMuted}
                  style={[modalStyles.input, { color: c.text, height: 72, textAlignVertical: "top" }]}
                  multiline
                  returnKeyType="done"
                  blurOnSubmit
                />
              </View>

              {/* Budget */}
              <Text style={[modalStyles.label, { color: c.sub }]}>Orçamento máximo</Text>
              <View style={[modalStyles.inputWrap, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[modalStyles.currencyPrefix, { color: c.sub }]}>R$</Text>
                <TextInput
                  value={budget}
                  onChangeText={(t) => setBudget(t.replace(/[^0-9]/g, ""))}
                  placeholder="Quanto deseja pagar?"
                  placeholderTextColor={c.softMuted}
                  style={[modalStyles.input, { color: c.text }]}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              </View>

              {/* Schedule toggle */}
              <Pressable
                onPress={() => setScheduled((v) => !v)}
                style={[
                  modalStyles.toggleRow,
                  { backgroundColor: scheduled ? `${c.primary}22` : c.card, borderColor: scheduled ? c.primary : c.border },
                ]}
              >
                <Ionicons name="calendar" size={16} color={scheduled ? c.primary : c.softMuted} />
                <Text style={[modalStyles.toggleText, { color: scheduled ? c.text : c.sub }]}>Agendar para depois</Text>
                <View style={{ flex: 1 }} />
                <View style={[modalStyles.toggleSwitch, { backgroundColor: scheduled ? c.primary : "#D4D0CB" }]}>
                  <View style={[modalStyles.toggleDot, { left: scheduled ? 22 : 2 }]} />
                </View>
              </Pressable>

              {scheduled ? (
                <View style={[modalStyles.inputWrap, { backgroundColor: c.card, borderColor: c.border, marginTop: 8 }]}>
                  <Ionicons name="time" size={16} color={c.softMuted} />
                  <TextInput
                    value={scheduleDate}
                    onChangeText={setScheduleDate}
                    placeholder="DD/MM/AAAA · HH:MM"
                    placeholderTextColor={c.softMuted}
                    style={[modalStyles.input, { color: c.text }]}
                    returnKeyType="done"
                  />
                </View>
              ) : null}

              {/* CTA */}
              <Pressable
                onPress={handleSubmit}
                style={[
                  modalStyles.cta,
                  { backgroundColor: submitted ? c.success : catColors[cat] },
                ]}
              >
                {submitted ? (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color={submitted ? "#fff" : "#1A1714"} />
                    <Text style={[modalStyles.ctaText, { color: "#fff" }]}>Pedido publicado!</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="send" size={16} color={cat === "Mudança" ? "#1A1714" : "#fff"} />
                    <Text style={[modalStyles.ctaText, { color: cat === "Mudança" ? "#1A1714" : "#fff" }]}>
                      Publicar pedido
                    </Text>
                  </>
                )}
              </Pressable>

              <Text style={[modalStyles.hint, { color: c.softMuted }]}>
                Seu pedido ficará visível para prestadores da sua região darem lances ou aceitarem imediatamente.
              </Text>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── ClienteMarketplace ─────────────────────────────────────────────── */
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
  const [orderModalOpen, setOrderModalOpen] = useState(false);

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
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <LinearGradient
          colors={[c.primary, c.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={[styles.heroEyebrow, { color: "rgba(26,23,20,0.65)" }]}>MARKETPLACE</Text>
          <Text style={[styles.heroTitle, { color: "#1A1714" }]}>Quem você quer perto?</Text>
          <Text style={[styles.heroSub, { color: "rgba(26,23,20,0.75)" }]}>Compare prestadores, propostas e tempo de chegada.</Text>

          {/* Custom order CTA inside hero */}
          <Pressable
            onPress={() => setOrderModalOpen(true)}
            style={[styles.heroOrderBtn, { backgroundColor: "#1A1714" }]}
          >
            <Ionicons name="add-circle" size={16} color={c.primary} />
            <Text style={[styles.heroOrderText, { color: c.primary }]}>Criar pedido customizado</Text>
            <Ionicons name="chevron-forward" size={14} color={c.primary} />
          </Pressable>
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
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          {query ? (
            <Pressable onPress={() => { setQuery(""); Keyboard.dismiss(); }}>
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

        {/* Provider list */}
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
              <Text style={[styles.providerInitials, { color: p.color === "#FFCC00" ? "#1A1714" : "#fff" }]}>{p.ini}</Text>
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
                <View style={[styles.catTag, { backgroundColor: `${p.color}22` }]}>
                  {p.cat === "Mudança" ? (
                    <Ionicons name="home" size={10} color={p.color === "#FFCC00" ? "#8B6F00" : p.color} />
                  ) : p.cat === "Frete" ? (
                    <MaterialCommunityIcons name="truck" size={11} color={p.color} />
                  ) : (
                    <Ionicons name="cube" size={10} color={p.color} />
                  )}
                  <Text style={[styles.catTagText, { color: p.color === "#FFCC00" ? "#8B6F00" : p.color }]}>{p.cat}</Text>
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
                <Text style={[styles.priceVal, { color: p.color === "#FFCC00" ? "#8B6F00" : p.color }]}>{p.price}</Text>
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
      <CustomOrderModal visible={orderModalOpen} onClose={() => setOrderModalOpen(false)} />
    </View>
  );
}

/* ─── PrestadorMarketplace (pesquisa de mercado — somente leitura) ────── */
function PrestadorMarketplace() {
  const c = colors.light;
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Todos");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activePin, setActivePin] = useState<string | null>(null);

  const initials = (user?.name || "CO").split(" ").map((p) => p[0]).slice(0, 2).join("");

  const filtered = useMemo(() => {
    let list = filter === "Todos" ? MOCK_PROVIDERS : MOCK_PROVIDERS.filter((p) => p.cat === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.area.toLowerCase().includes(q));
    }
    return list;
  }, [filter, query]);

  const peerPins: MapPin[] = useMemo(
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

  const avgPrice = filtered.length
    ? Math.round(filtered.reduce((s, p) => s + p.priceFrom, 0) / filtered.length)
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <TopNav
        title="Marketplace"
        subtitle="Pesquisa de mercado"
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
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <LinearGradient
          colors={[c.blue, "#60A5FA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>PESQUISA DE MERCADO</Text>
          <Text style={styles.heroTitle}>Conheça a concorrência</Text>
          <Text style={styles.heroSub}>Analise preços, avaliações e portfólio dos colegas de plataforma.</Text>
          {/* Read-only notice */}
          <View style={styles.readonlyBadge}>
            <Ionicons name="eye" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.readonlyText}>Apenas visualização · solicitações só pelo cliente</Text>
          </View>
        </LinearGradient>

        {/* Pulse metrics */}
        <View style={styles.pulseRow}>
          <View style={[styles.pulseCell, { backgroundColor: c.blueLight }]}>
            <Text style={[styles.pulseValue, { color: c.blue }]}>{filtered.length}</Text>
            <Text style={[styles.pulseLabel, { color: c.sub }]}>Prestadores</Text>
          </View>
          <View style={[styles.pulseCell, { backgroundColor: `${c.primary}22` }]}>
            <Text style={[styles.pulseValue, { color: "#8B6F00" }]}>R${avgPrice}</Text>
            <Text style={[styles.pulseLabel, { color: c.sub }]}>Preço médio</Text>
          </View>
          <View style={[styles.pulseCell, { backgroundColor: c.successLight }]}>
            <Text style={[styles.pulseValue, { color: c.success }]}>{filtered.filter((p) => p.isOnline).length}</Text>
            <Text style={[styles.pulseLabel, { color: c.sub }]}>Online agora</Text>
          </View>
        </View>

        {/* Map */}
        <MarketMap
          pins={peerPins}
          activeId={activePin}
          onPinPress={(id) => setActivePin(id === activePin ? null : id)}
          title="Colegas na sua região"
          subtitle={`${peerPins.length} online agora`}
          badgeColor={c.blue}
        />

        {/* Search */}
        <View style={[styles.search, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Ionicons name="search" size={16} color={c.softMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nome ou bairro..."
            placeholderTextColor={c.softMuted}
            style={[styles.searchInput, { color: c.text }]}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          {query ? (
            <Pressable onPress={() => { setQuery(""); Keyboard.dismiss(); }}>
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

        {/* Peer list — read-only, view profile only */}
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
              <Text style={[styles.providerInitials, { color: p.color === "#FFCC00" ? "#1A1714" : "#fff" }]}>{p.ini}</Text>
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
                <View style={[styles.catTag, { backgroundColor: `${p.color}22` }]}>
                  {p.cat === "Mudança" ? (
                    <Ionicons name="home" size={10} color={p.color === "#FFCC00" ? "#8B6F00" : p.color} />
                  ) : p.cat === "Frete" ? (
                    <MaterialCommunityIcons name="truck" size={11} color={p.color} />
                  ) : (
                    <Ionicons name="cube" size={10} color={p.color} />
                  )}
                  <Text style={[styles.catTagText, { color: p.color === "#FFCC00" ? "#8B6F00" : p.color }]}>{p.cat}</Text>
                </View>
                <Ionicons name="star" size={11} color={c.warning} />
                <Text style={[styles.metaText, { color: c.warning }]}>{p.rating}</Text>
                <Text style={[styles.metaSep, { color: c.softMuted }]}>·</Text>
                <Text style={[styles.metaText, { color: c.sub }]}>{p.jobs} serviços</Text>
                <Text style={[styles.metaSep, { color: c.softMuted }]}>·</Text>
                <Text style={[styles.metaText, { color: c.sub }]}>{p.km} km</Text>
              </View>
              <View style={styles.providerFootRow}>
                <Text style={[styles.priceFrom, { color: c.softMuted }]}>cobra a partir de</Text>
                <Text style={[styles.priceVal, { color: p.color === "#FFCC00" ? "#8B6F00" : p.color }]}>{p.price}</Text>
                <View style={{ flex: 1 }} />
                {/* Read-only: show profile icon, NOT a request button */}
                <View style={[styles.viewProfileBtn, { backgroundColor: c.background, borderColor: c.border }]}>
                  <Ionicons name="person" size={12} color={c.sub} />
                  <Text style={[styles.viewProfileText, { color: c.sub }]}>Ver perfil</Text>
                </View>
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
      <ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} name={user?.name || "Prestador"} initials={initials} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 22, padding: 20, marginBottom: 16, gap: 4 },
  heroEyebrow: { color: "rgba(255,255,255,0.78)", fontSize: 10, letterSpacing: 1, fontFamily: fonts.sans.bold },
  heroTitle: { color: "#fff", fontSize: 22, fontFamily: fonts.serif.extra, marginTop: 4, lineHeight: 26 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 2, lineHeight: 18 },
  heroOrderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  heroOrderText: { fontSize: 13, fontFamily: fonts.sans.bold },
  readonlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  readonlyText: { color: "rgba(255,255,255,0.9)", fontSize: 10, fontFamily: fonts.sans.medium },
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
  providerInitials: { fontSize: 18, fontFamily: fonts.serif.extra },
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
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewProfileText: { fontSize: 10, fontFamily: fonts.sans.bold },
  empty: { paddingVertical: 50, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 13, fontFamily: fonts.sans.medium },
  pulseRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  pulseCell: { flex: 1, padding: 10, borderRadius: 14, alignItems: "center" },
  pulseValue: { fontSize: 15, fontFamily: fonts.serif.extra },
  pulseLabel: { fontSize: 10, fontFamily: fonts.sans.regular, marginTop: 3 },
});

const modalStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerClose: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: fonts.sans.bold },
  label: { fontSize: 11, fontFamily: fonts.sans.bold, letterSpacing: 0.5, marginBottom: 6, marginTop: 16, textTransform: "uppercase" },
  catRow: { flexDirection: "row", gap: 8 },
  catChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  catChipText: { fontSize: 13, fontFamily: fonts.sans.bold },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 14, fontFamily: fonts.sans.medium, paddingVertical: 0 },
  currencyPrefix: { fontSize: 14, fontFamily: fonts.sans.bold },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 16,
  },
  toggleText: { fontSize: 13, fontFamily: fonts.sans.semibold },
  toggleSwitch: { width: 44, height: 24, borderRadius: 12, position: "relative" },
  toggleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff", position: "absolute", top: 3 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 16,
    marginTop: 24,
  },
  ctaText: { fontSize: 15, fontFamily: fonts.sans.bold },
  hint: { fontSize: 11, fontFamily: fonts.sans.regular, textAlign: "center", marginTop: 12, lineHeight: 16 },
});
