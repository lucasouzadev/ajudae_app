import React, { useEffect, useMemo, useState } from "react";
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
  Dimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_POSTINGS, FILTERS, CATEGORIES, type Category, type Provider } from "@/constants/mockData";
import { fetchOnlineProviders } from "@/lib/providers";
import colors, { fonts, shadows } from "@/constants/colors";
import { Skeleton } from "@/components/Skeleton";
import { TopNav } from "@/components/TopNav";
import { SideSheet } from "@/components/SideSheet";
import { ProfileOverlay } from "@/components/ProfileOverlay";
import { MarketMap, type MapPin } from "@/components/MarketMap";
import { InfoSheet, type InfoItem } from "@/components/InfoSheet";

const SCREEN_H_MKT = Dimensions.get("window").height;

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

/* ─── MapExpandModal ───────────────────────────────────────────────────── */
function MapExpandModal({
  visible,
  onClose,
  pins,
  role,
  onRequest,
}: {
  visible: boolean;
  onClose: () => void;
  pins: MapPin[];
  role: "cliente" | "prestador";
  onRequest?: (id: string) => void;
}) {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activePin, setActivePin] = useState<string | null>(null);
  const active = pins.find((p) => p.id === activePin) ?? null;

  const safeTop = insets.top || 44;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#1A1714" }}>
        {/* Status-bar safe zone */}
        <View style={{ height: safeTop, backgroundColor: "#1A1714" }} />

        {/* Map fill — altura descontada do safe top e bottom */}
        <View style={{ flex: 1, position: "relative" }}>
          <MarketMap
            pins={pins}
            activeId={activePin}
            onPinPress={(id) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setActivePin(id === activePin ? null : id);
            }}
            title={role === "cliente" ? "Prestadores disponíveis" : "Mapa de concorrência"}
            subtitle={`${pins.length} online · toque em um pin`}
            badgeColor={role === "cliente" ? c.success : c.blue}
            height={SCREEN_H_MKT - safeTop}
            headerTop={64}
            recenterBottom={insets.bottom + 72}
          />
        </View>

        {/* Close button — top-left (posicionado sobre o safe zone) */}
        <Pressable
          onPress={onClose}
          style={{ position: "absolute", top: safeTop + 12, left: 16, width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", zIndex: 20 }}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </Pressable>

        {/* Role label */}
        <View style={{ position: "absolute", top: safeTop + 16, left: 68, zIndex: 20, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Text style={{ fontSize: 11, fontFamily: fonts.sans.bold, color: "#fff" }}>
            {role === "cliente" ? "Solicitar serviço" : "Pesquisa de mercado"}
          </Text>
        </View>

        {/* Bottom pin card */}
        {active ? (
          <View style={{ position: "absolute", bottom: insets.bottom + 16, left: 16, right: 16, backgroundColor: "#fff", borderRadius: 20, padding: 16, zIndex: 20, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, elevation: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: active.color, alignItems: "center", justifyContent: "center" }}>
                {active.cat === "Mudança" ? <Ionicons name="home" size={18} color="#fff" /> : active.cat === "Frete" ? <Ionicons name="car" size={18} color="#fff" /> : <Ionicons name="cube" size={18} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: fonts.sans.bold, color: c.text }}>{active.cat}</Text>
                <Text style={{ fontSize: 12, color: c.softMuted, fontFamily: fonts.sans.regular, marginTop: 1 }}>a partir de {active.label}</Text>
              </View>
              <Text style={{ fontSize: 17, fontFamily: fonts.serif.extra, color: active.color }}>{active.label}</Text>
            </View>
            {role === "cliente" ? (
              <Pressable
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                  onRequest?.(active.id);
                  onClose();
                  router.push({ pathname: "/request", params: { providerId: active.id } });
                }}
                style={{ backgroundColor: active.color, borderRadius: 14, height: 48, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}
              >
                <Ionicons name="arrow-forward" size={16} color={active.color === "#FFCC00" ? "#1A1714" : "#fff"} />
                <Text style={{ fontSize: 14, fontFamily: fonts.sans.bold, color: active.color === "#FFCC00" ? "#1A1714" : "#fff" }}>Solicitar este prestador</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  onClose();
                  router.push(`/provider/${active.id}`);
                }}
                style={{ backgroundColor: c.blueLight, borderRadius: 14, height: 44, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}
              >
                <Ionicons name="bar-chart" size={15} color={c.blue} />
                <Text style={{ fontSize: 13, fontFamily: fonts.sans.bold, color: c.blue }}>Análise de concorrência</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={{ position: "absolute", bottom: insets.bottom + 16, left: 16, right: 16, zIndex: 20 }}>
            <View style={{ backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center", flexDirection: "row", gap: 8 }}>
              <Ionicons name="finger-print-outline" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={{ fontSize: 12, fontFamily: fonts.sans.regular, color: "rgba(255,255,255,0.85)" }}>
                {role === "cliente" ? "Toque em um pin para solicitar" : "Toque em um pin para ver o concorrente"}
              </Text>
            </View>
          </View>
        )}
      </View>
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
  const [infoOpen, setInfoOpen] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);
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

  const filtered = useMemo(() => {
    let list = filter === "Todos" ? providers : providers.filter((p) => p.cat === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.area.toLowerCase().includes(q));
    }
    return list;
  }, [filter, query, providers]);

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
    <View style={{ flex: 1, backgroundColor: "#EDEAE3" }}>
      <TopNav
        title="Marketplace"
        subtitle="Encontre o profissional ideal"
        initials={initials}
        badge
        onMenuOpen={() => setMenuOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
        onBack={() => router.back()}
        onInfo={() => setInfoOpen(true)}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search — agora no topo */}
        <View style={[styles.search, { backgroundColor: c.card, borderColor: c.border, marginBottom: 12 }, shadows.sm]}>
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

        {/* Live map */}
        <MarketMap
          pins={onlinePins}
          activeId={activePin}
          onPinPress={(id) => setActivePin(id === activePin ? null : id)}
          title="Prestadores ao vivo"
          subtitle={`${onlinePins.length} online · disponíveis agora`}
          badgeColor={c.success}
          onExpand={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); setMapExpanded(true); }}
        />

        {/* Criar pedido customizado — abaixo do mapa */}
        <Pressable
          onPress={() => setOrderModalOpen(true)}
          style={[styles.orderBtn, { backgroundColor: c.text }]}
        >
          <Ionicons name="add" size={15} color={c.primary} />
          <Text style={[styles.orderBtnText, { color: c.primary }]}>Criar pedido customizado</Text>
          <Ionicons name="chevron-forward" size={13} color={`${c.primary}99`} />
        </Pressable>

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
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={[styles.providerCard, { backgroundColor: c.card, borderColor: c.border }, { flexDirection: "row", gap: 12 }]}>
              <Skeleton width={50} height={50} borderRadius={25} />
              <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
                <Skeleton width="55%" height={13} />
                <Skeleton width="38%" height={11} />
                <Skeleton width="75%" height={11} />
              </View>
            </View>
          ))
        ) : sortedList.map((p) => (
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

        {!loading && filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search" size={28} color={c.softMuted} />
            <Text style={[styles.emptyText, { color: c.sub }]}>Nenhum prestador encontrado</Text>
          </View>
        ) : null}
      </ScrollView>

      <SideSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} name={user?.name || "Cliente"} initials={initials} />
      <CustomOrderModal visible={orderModalOpen} onClose={() => setOrderModalOpen(false)} />
      <MapExpandModal visible={mapExpanded} onClose={() => setMapExpanded(false)} pins={onlinePins} role="cliente" onRequest={(id) => { setActivePin(id); }} />
      <InfoSheet
        storageKey="ajudae_info_marketplace_cliente"
        title="Bem-vindo ao Marketplace"
        subtitle="Veja como encontrar o melhor profissional para seu serviço"
        items={CLIENTE_MARKET_INFO}
        forceOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
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
  const [infoOpen, setInfoOpen] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
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

  const initials = (user?.name || "CO").split(" ").map((p) => p[0]).slice(0, 2).join("");

  const filtered = useMemo(() => {
    let list = filter === "Todos" ? providers : providers.filter((p) => p.cat === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.area.toLowerCase().includes(q));
    }
    return list;
  }, [filter, query, providers]);

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
    <View style={{ flex: 1, backgroundColor: "#EDEAE3" }}>
      <TopNav
        title="Marketplace"
        subtitle="Pesquisa de mercado"
        initials={initials}
        badge
        accentColor={c.blue}
        onMenuOpen={() => setMenuOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
        onBack={() => router.back()}
        onInfo={() => setInfoOpen(true)}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search — topo */}
        <View style={[styles.search, { backgroundColor: c.card, borderColor: c.border, marginBottom: 12 }, shadows.sm]}>
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
          onExpand={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); setMapExpanded(true); }}
        />

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
      <MapExpandModal visible={mapExpanded} onClose={() => setMapExpanded(false)} pins={peerPins} role="prestador" />
      <InfoSheet
        storageKey="ajudae_info_marketplace_prestador"
        title="Pesquisa de Mercado"
        subtitle="Entenda como usar esta tela para se destacar na concorrência"
        accentColor={colors.light.blue}
        items={PRESTADOR_MARKET_INFO}
        forceOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
    </View>
  );
}

const CLIENTE_MARKET_INFO: InfoItem[] = [
  { icon: "search-outline", color: "#2563EB", title: "Busca inteligente", description: "Filtre por categoria, nome ou área de atuação para encontrar o profissional ideal." },
  { icon: "map-outline", color: "#16A34A", title: "Mapa interativo", description: "Veja os prestadores online em tempo real no mapa e toque em um pin para ver detalhes." },
  { icon: "document-text-outline", color: "#D97706", title: "Criar pedido", description: "Não encontrou o que procura? Crie um pedido customizado e receba propostas dos prestadores." },
  { icon: "star-outline", color: "#9333EA", title: "Avaliações", description: "Confira as notas e comentários de outros clientes antes de contratar." },
];

const PRESTADOR_MARKET_INFO: InfoItem[] = [
  { icon: "eye-outline", color: "#2563EB", title: "Visão da concorrência", description: "Veja onde seus concorrentes estão atuando e quais preços estão praticando." },
  { icon: "trending-up-outline", color: "#16A34A", title: "Métricas de mercado", description: "Acompanhe o preço médio e demanda por categoria na sua região." },
  { icon: "map-outline", color: "#D97706", title: "Mapa de prestadores", description: "Identifique áreas com menos concorrência para expandir sua atuação." },
  { icon: "lock-closed-outline", color: "#6B7280", title: "Somente leitura", description: "Esta tela é para análise — para receber pedidos, fique online na tela principal." },
];

const styles = StyleSheet.create({
  hero: { borderRadius: 22, padding: 20, marginBottom: 16, gap: 4 },
  heroEyebrow: { color: "rgba(255,255,255,0.78)", fontSize: 10, letterSpacing: 1, fontFamily: fonts.sans.bold },
  heroTitle: { color: "#fff", fontSize: 22, fontFamily: fonts.serif.extra, marginTop: 4, lineHeight: 26 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 2, lineHeight: 18 },
  orderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    marginBottom: 12,
  },
  orderBtnText: { flex: 1, fontSize: 13, fontFamily: fonts.sans.bold },
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
  readonlyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  readonlyRowText: { fontSize: 12, fontFamily: fonts.sans.medium, flex: 1 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: fonts.sans.medium, paddingVertical: 0, letterSpacing: 0 },
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
