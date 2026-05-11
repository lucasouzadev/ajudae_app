import React, { useState, useRef, useEffect } from "react";
import {
  Alert,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors, { fonts, shadows } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { usePortfolio } from "@/contexts/PortfolioContext";
import { CATEGORY_COLORS, type Provider } from "@/constants/mockData";
import { fetchProviderById } from "@/lib/providers";

/* ─── Seções disponíveis para edição ────────────────────────────────────── */
const PORTFOLIO_SECTIONS = [
  { key: "bio",      icon: "person-outline" as const,     label: "Bio / Apresentação",       desc: "Fale sobre você e seu trabalho (máx. 280 caracteres)" },
  { key: "helpers",  icon: "people-outline" as const,     label: "Ajudantes",                desc: "Informe se você trabalha com ajudantes e quantos" },
  { key: "services", icon: "list-outline" as const,       label: "Serviços em destaque",      desc: "Até 3 serviços com título, preço e descrição curta" },
  { key: "promo",    icon: "pricetag-outline" as const,   label: "Promoção ativa",            desc: "Oferta especial com texto livre e prazo de validade" },
  { key: "photos",   icon: "images-outline" as const,     label: "Fotos do trabalho",         desc: "Até 6 fotos dos seus serviços (disponível em breve)" },
  { key: "review",   icon: "star-outline" as const,       label: "Depoimento em destaque",    desc: "Fixe a avaliação que melhor representa você" },
];

export default function PortfolioScreen() {
  const c = colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [providerData, setProviderData] = useState<Provider | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchProviderById(user.id).then((data) => {
        if (data) setProviderData(data);
      });
    }
  }, [user?.id]);

  // Fallback color until real data loads
  const providerColor = providerData?.color ?? CATEGORY_COLORS.Mudança;
  const onColor = providerColor === "#FFCC00" ? "#1A1714" : "#fff";

  const [tab, setTab] = useState<"preview" | "edit">("preview");
  const { portfolio, setPortfolio } = usePortfolio();

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header hero */}
      <LinearGradient
        colors={[providerColor, `${providerColor}BB`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: insets.top + 8 }]}
      >
        <View style={s.heroNav}>
          <Pressable onPress={() => router.back()} style={[s.iconBtn, { backgroundColor: "rgba(0,0,0,0.18)" }]}>
            <Ionicons name="chevron-back" size={20} color={onColor} />
          </Pressable>
          <Text style={[s.heroTitle, { color: onColor }]}>Meu Portfólio</Text>
          <Pressable style={[s.iconBtn, { backgroundColor: "rgba(0,0,0,0.18)" }]}>
            <Ionicons name="share-outline" size={18} color={onColor} />
          </Pressable>
        </View>

        <View style={s.heroBody}>
          <View style={[s.avatar, { borderColor: "rgba(255,255,255,0.5)" }]}>
            <Text style={[s.avatarText, { color: onColor }]}>{providerData?.ini ?? (user?.name || "P").split(" ").map((p) => p[0]).slice(0, 2).join("")}</Text>
          </View>
          <Text style={[s.name, { color: onColor }]}>{user?.name || providerData?.name || "Prestador"}</Text>
          <Text style={[s.heroSub, { color: `${onColor}CC` }]}>
            {providerData?.cat ?? "Frete"} · ★ {providerData?.rating ?? "—"} · {providerData?.jobs ?? 0} serviços
          </Text>
        </View>

        {/* Tab switcher */}
        <View style={s.tabRow}>
          {(["preview", "edit"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[s.tabBtn, tab === t && { backgroundColor: "rgba(255,255,255,0.22)" }]}
            >
              <Ionicons
                name={t === "preview" ? "eye-outline" : "create-outline"}
                size={14}
                color={tab === t ? onColor : `${onColor}99`}
              />
              <Text style={[s.tabBtnText, { color: tab === t ? onColor : `${onColor}99` }]}>
                {t === "preview" ? "Preview" : "Editar"}
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {tab === "preview"
        ? <PortfolioPreview portfolio={portfolio} providerColor={providerColor} c={c} insets={insets} />
        : <PortfolioEdit portfolio={portfolio} onChange={setPortfolio} c={c} insets={insets} />
      }
    </View>
  );
}

/* ─── Preview ────────────────────────────────────────────────────────────── */
function PortfolioPreview({ portfolio, providerColor, c, insets }: any) {
  const accentText = providerColor === "#FFCC00" ? "#8B6F00" : providerColor;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Bio */}
      {portfolio.bio ? (
        <View style={[s.previewCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={s.previewCardHead}>
            <View style={[s.previewIconWrap, { backgroundColor: `${providerColor}18` }]}>
              <Ionicons name="person-outline" size={15} color={providerColor} />
            </View>
            <Text style={[s.previewCardTitle, { color: c.text }]}>Sobre mim</Text>
          </View>
          <Text style={[s.previewBio, { color: c.sub }]}>{portfolio.bio}</Text>
        </View>
      ) : (
        <PlaceholderBlock icon="person-outline" label="Bio não preenchida" hint="Vá em Editar para adicionar sua apresentação" c={c} />
      )}

      {/* Ajudantes */}
      <View style={[s.previewCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={s.previewCardHead}>
          <View style={[s.previewIconWrap, { backgroundColor: `${providerColor}18` }]}>
            <Ionicons name="people-outline" size={15} color={providerColor} />
          </View>
          <Text style={[s.previewCardTitle, { color: c.text }]}>Ajudantes</Text>
          <View style={[s.helperBadge, { backgroundColor: portfolio.supportsHelpers ? `${c.success}18` : `${c.softMuted}18` }]}>
            <Text style={[s.helperBadgeText, { color: portfolio.supportsHelpers ? c.success : c.softMuted }]}>
              {portfolio.supportsHelpers ? "Sim" : "Não"}
            </Text>
          </View>
        </View>
        <Text style={[s.previewBio, { color: c.sub }]}>
          {portfolio.supportsHelpers
            ? `Trabalha com ajudantes · ${portfolio.helpersCount} disponível${portfolio.helpersCount !== 1 ? "s" : ""}`
            : "Não trabalha com ajudantes no momento"}
        </Text>
      </View>

      {/* Promoção */}
      {portfolio.promoText ? (
        <LinearGradient
          colors={[`${providerColor}22`, `${providerColor}08`]}
          style={[s.promoCard, { borderColor: `${providerColor}55` }]}
        >
          <View style={[s.promoBadge, { backgroundColor: providerColor }]}>
            <Text style={[s.promoBadgeText, { color: providerColor === "#FFCC00" ? "#1A1714" : "#fff" }]}>
              PROMOÇÃO
            </Text>
          </View>
          <Text style={[s.promoText, { color: c.text }]}>{portfolio.promoText}</Text>
          {portfolio.promoDue ? (
            <Text style={[s.promoDue, { color: c.softMuted }]}>Válido até {portfolio.promoDue}</Text>
          ) : null}
        </LinearGradient>
      ) : (
        <PlaceholderBlock icon="pricetag-outline" label="Nenhuma promoção ativa" hint="Crie uma oferta para se destacar no marketplace" c={c} />
      )}

      {/* Serviços em destaque */}
      <View style={[s.previewCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={s.previewCardHead}>
          <View style={[s.previewIconWrap, { backgroundColor: `${providerColor}18` }]}>
            <Ionicons name="list-outline" size={15} color={providerColor} />
          </View>
          <Text style={[s.previewCardTitle, { color: c.text }]}>Serviços</Text>
          {portfolio.services.length < 3 && (
            <Text style={[s.previewCardHint, { color: c.softMuted }]}>{portfolio.services.length}/3</Text>
          )}
        </View>
        {portfolio.services.length > 0 ? (
          portfolio.services.map((sv: any, i: number) => (
            <View key={i} style={[s.serviceRow, { borderTopColor: c.borderLight }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.serviceTitle, { color: c.text }]}>{sv.title}</Text>
                <Text style={[s.serviceDesc, { color: c.sub }]}>{sv.desc}</Text>
              </View>
              <Text style={[s.servicePrice, { color: accentText }]}>{sv.price}</Text>
            </View>
          ))
        ) : (
          <Text style={[s.previewBio, { color: c.softMuted, marginTop: 6 }]}>
            Nenhum serviço em destaque. Adicione em Editar.
          </Text>
        )}
        {portfolio.services.length < 3 && (
          <View style={[s.addSlot, { borderColor: c.borderLight }]}>
            <Ionicons name="add-circle-outline" size={16} color={c.softMuted} />
            <Text style={[s.addSlotText, { color: c.softMuted }]}>Slot disponível</Text>
          </View>
        )}
      </View>

      {/* Fotos — placeholder (feature futura) */}
      <View style={[s.previewCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={s.previewCardHead}>
          <View style={[s.previewIconWrap, { backgroundColor: `${providerColor}18` }]}>
            <Ionicons name="images-outline" size={15} color={providerColor} />
          </View>
          <Text style={[s.previewCardTitle, { color: c.text }]}>Fotos do trabalho</Text>
          <View style={[s.comingSoonBadge, { backgroundColor: c.borderLight }]}>
            <Text style={[s.comingSoonText, { color: c.softMuted }]}>Em breve</Text>
          </View>
        </View>
        <View style={s.photoGrid}>
          {[0,1,2,3,4,5].map((i) => (
            <View key={i} style={[s.photoSlot, { backgroundColor: c.background, borderColor: c.borderLight }]}>
              <Ionicons name="camera-outline" size={20} color={c.softMuted} />
            </View>
          ))}
        </View>
      </View>

      {/* Depoimento em destaque */}
      {portfolio.featuredReview ? (
        <View style={[s.previewCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={s.previewCardHead}>
            <View style={[s.previewIconWrap, { backgroundColor: "#FFCC0020" }]}>
              <Ionicons name="star" size={14} color="#D97706" />
            </View>
            <Text style={[s.previewCardTitle, { color: c.text }]}>Depoimento em destaque</Text>
          </View>
          <View style={[s.reviewQuote, { backgroundColor: c.background, borderColor: c.borderLight }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={c.softMuted} style={{ marginBottom: 6 }} />
            <Text style={[s.reviewText, { color: c.text }]}>"{portfolio.featuredReview}"</Text>
            <Text style={[s.reviewAuthor, { color: c.softMuted }]}>— {portfolio.reviewAuthor}</Text>
          </View>
        </View>
      ) : (
        <PlaceholderBlock icon="star-outline" label="Nenhum depoimento fixado" hint="Escolha uma avaliação para destacar no seu perfil" c={c} />
      )}
    </ScrollView>
  );
}

/* ─── Placeholder para seções não preenchidas ───────────────────────────── */
function PlaceholderBlock({ icon, label, hint, c }: { icon: any; label: string; hint: string; c: any }) {
  return (
    <View style={[s.placeholder, { backgroundColor: c.background, borderColor: c.borderLight }]}>
      <Ionicons name={icon} size={18} color={c.softMuted} />
      <View style={{ flex: 1 }}>
        <Text style={[s.placeholderLabel, { color: c.sub }]}>{label}</Text>
        <Text style={[s.placeholderHint, { color: c.softMuted }]}>{hint}</Text>
      </View>
    </View>
  );
}

/* ─── Edit ───────────────────────────────────────────────────────────────── */
function PortfolioEdit({ portfolio, onChange, c, insets }: any) {
  const [openSection, setOpenSection] = useState<string | null>("bio");
  const [saved, setSaved] = useState(false);

  const update = (key: string, val: any) => {
    setSaved(false);
    onChange((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onChange((prev: any) => prev);
    setSaved(true);
  };

  const updateService = (i: number, field: string, val: string) => {
    const updated = [...portfolio.services];
    updated[i] = { ...updated[i], [field]: val };
    update("services", updated);
  };

  const addService = () => {
    if (portfolio.services.length < 3)
      update("services", [...portfolio.services, { title: "", price: "", desc: "" }]);
  };

  const removeService = (i: number) => {
    update("services", portfolio.services.filter((_: any, idx: number) => idx !== i));
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80, gap: 8 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.editIntro, { color: c.softMuted }]}>
          Toque em uma seção para expandir e editar. As alterações ficam salvas localmente.
        </Text>

        {PORTFOLIO_SECTIONS.map((sec) => {
          const open = openSection === sec.key;
          return (
            <View key={sec.key} style={[s.editSection, { backgroundColor: c.card, borderColor: open ? c.primary : c.border }]}>
              {/* Section header */}
              <Pressable
                style={s.editSectionHead}
                onPress={() => setOpenSection(open ? null : sec.key)}
              >
                <View style={[s.editIconWrap, { backgroundColor: open ? `${c.primary}18` : c.background }]}>
                  <Ionicons name={sec.icon} size={16} color={open ? c.primary : c.sub} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.editSectionLabel, { color: c.text }]}>{sec.label}</Text>
                  <Text style={[s.editSectionDesc, { color: c.softMuted }]}>{sec.desc}</Text>
                </View>
                <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={c.softMuted} />
              </Pressable>

              {/* Section body */}
              {open && sec.key === "bio" && (
                <View style={s.editBody}>
                  <TextInput
                    style={[s.textarea, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                    value={portfolio.bio}
                    onChangeText={(v) => update("bio", v)}
                    placeholder="Conte sobre você, sua experiência e diferenciais..."
                    placeholderTextColor={c.softMuted}
                    multiline
                    maxLength={280}
                    textAlignVertical="top"
                  />
                  <Text style={[s.charCount, { color: c.softMuted }]}>{portfolio.bio.length}/280</Text>
                </View>
              )}

              {open && sec.key === "helpers" && (
                <View style={s.editBody}>
                  <Pressable
                    onPress={() => update("supportsHelpers", !portfolio.supportsHelpers)}
                    style={[s.helperToggleRow, { backgroundColor: portfolio.supportsHelpers ? `${c.success}12` : c.background, borderColor: portfolio.supportsHelpers ? c.success : c.border }]}
                  >
                    <Ionicons name="people" size={18} color={portfolio.supportsHelpers ? c.success : c.softMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.toggleTitle, { color: c.text }]}>Trabalha com ajudantes?</Text>
                      <Text style={[s.toggleSub, { color: c.softMuted }]}>Visível para clientes no perfil e na solicitação</Text>
                    </View>
                    <View style={[s.togglePill, { backgroundColor: portfolio.supportsHelpers ? c.success : "#D4D0CB" }]}>
                      <View style={[s.toggleDot, { left: portfolio.supportsHelpers ? 20 : 2 }]} />
                    </View>
                  </Pressable>
                  {portfolio.supportsHelpers && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[s.fieldLabel, { color: c.sub }]}>Quantidade de ajudantes disponíveis</Text>
                      <View style={s.counterRow}>
                        <Pressable
                          onPress={() => update("helpersCount", Math.max(1, portfolio.helpersCount - 1))}
                          style={[s.counterBtn, { backgroundColor: c.background, borderColor: c.border }]}
                        >
                          <Ionicons name="remove" size={18} color={c.text} />
                        </Pressable>
                        <Text style={[s.counterVal, { color: c.text }]}>{portfolio.helpersCount}</Text>
                        <Pressable
                          onPress={() => update("helpersCount", Math.min(10, portfolio.helpersCount + 1))}
                          style={[s.counterBtn, { backgroundColor: c.background, borderColor: c.border }]}
                        >
                          <Ionicons name="add" size={18} color={c.text} />
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {open && sec.key === "promo" && (
                <View style={s.editBody}>
                  <Text style={[s.fieldLabel, { color: c.sub }]}>Texto da promoção</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                    value={portfolio.promoText}
                    onChangeText={(v) => update("promoText", v)}
                    placeholder="Ex: Mudança completa com 10% OFF"
                    placeholderTextColor={c.softMuted}
                  />
                  <Text style={[s.fieldLabel, { color: c.sub, marginTop: 10 }]}>Válido até (opcional)</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                    value={portfolio.promoDue}
                    onChangeText={(v) => update("promoDue", v)}
                    placeholder="Ex: 30/05"
                    placeholderTextColor={c.softMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              )}

              {open && sec.key === "services" && (
                <View style={s.editBody}>
                  {portfolio.services.map((sv: any, i: number) => (
                    <View key={i} style={[s.serviceEditCard, { backgroundColor: c.background, borderColor: c.borderLight }]}>
                      <View style={s.serviceEditHead}>
                        <Text style={[s.serviceEditNum, { color: c.softMuted }]}>Serviço {i + 1}</Text>
                        <Pressable onPress={() => removeService(i)}>
                          <Ionicons name="trash-outline" size={15} color={c.softMuted} />
                        </Pressable>
                      </View>
                      <TextInput
                        style={[s.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
                        value={sv.title}
                        onChangeText={(v) => updateService(i, "title", v)}
                        placeholder="Título (ex: Mudança Residencial)"
                        placeholderTextColor={c.softMuted}
                      />
                      <TextInput
                        style={[s.input, { backgroundColor: c.card, borderColor: c.border, color: c.text, marginTop: 8 }]}
                        value={sv.price}
                        onChangeText={(v) => updateService(i, "price", v)}
                        placeholder="Preço (ex: R$89)"
                        placeholderTextColor={c.softMuted}
                        keyboardType="default"
                      />
                      <TextInput
                        style={[s.input, { backgroundColor: c.card, borderColor: c.border, color: c.text, marginTop: 8 }]}
                        value={sv.desc}
                        onChangeText={(v) => updateService(i, "desc", v)}
                        placeholder="Descrição curta"
                        placeholderTextColor={c.softMuted}
                      />
                    </View>
                  ))}
                  {portfolio.services.length < 3 && (
                    <Pressable
                      onPress={addService}
                      style={[s.addServiceBtn, { borderColor: c.primary, backgroundColor: `${c.primary}0A` }]}
                    >
                      <Ionicons name="add-circle-outline" size={16} color={c.primary} />
                      <Text style={[s.addServiceText, { color: c.primary }]}>Adicionar serviço</Text>
                    </Pressable>
                  )}
                </View>
              )}

              {open && sec.key === "photos" && (
                <View style={s.editBody}>
                  <View style={[s.comingSoonBox, { backgroundColor: c.background, borderColor: c.borderLight }]}>
                    <Ionicons name="images-outline" size={28} color={c.softMuted} />
                    <Text style={[s.comingSoonBoxTitle, { color: c.sub }]}>Upload de fotos</Text>
                    <Text style={[s.comingSoonBoxDesc, { color: c.softMuted }]}>
                      Esta funcionalidade estará disponível na próxima versão do app.
                    </Text>
                  </View>
                </View>
              )}

              {open && sec.key === "review" && (
                <View style={s.editBody}>
                  <Text style={[s.fieldLabel, { color: c.sub }]}>Depoimento fixado</Text>
                  <TextInput
                    style={[s.textarea, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                    value={portfolio.featuredReview}
                    onChangeText={(v) => update("featuredReview", v)}
                    placeholder="Cole aqui o texto de uma avaliação que você quer destacar..."
                    placeholderTextColor={c.softMuted}
                    multiline
                    textAlignVertical="top"
                  />
                  <Text style={[s.fieldLabel, { color: c.sub, marginTop: 10 }]}>Autor</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
                    value={portfolio.reviewAuthor}
                    onChangeText={(v) => update("reviewAuthor", v)}
                    placeholder="Ex: Maria S."
                    placeholderTextColor={c.softMuted}
                  />
                </View>
              )}
            </View>
          );
        })}

        {/* Save CTA */}
        <Pressable onPress={handleSave} style={[s.saveBtn, { backgroundColor: saved ? c.success : c.primary }]}>
          <Ionicons name={saved ? "checkmark-circle" : "save-outline"} size={18} color="#1A1714" />
          <Text style={[s.saveBtnText, { color: "#1A1714" }]}>{saved ? "Portfólio salvo!" : "Salvar portfólio"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  /* Hero */
  hero: { paddingHorizontal: 16, paddingBottom: 0 },
  heroNav: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  heroTitle: { flex: 1, fontSize: 16, fontFamily: fonts.serif.extra, textAlign: "center" },
  iconBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  heroBody: { alignItems: "center", paddingBottom: 16 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2.5, marginBottom: 10,
  },
  avatarText: { fontSize: 24, fontFamily: fonts.serif.extra },
  name: { fontSize: 18, fontFamily: fonts.serif.extra, marginBottom: 4 },
  heroSub: { fontSize: 12, fontFamily: fonts.sans.regular },

  /* Tab */
  tabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 12,
    paddingTop: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
  },
  tabBtnText: { fontSize: 13, fontFamily: fonts.sans.bold },

  /* Preview cards */
  previewCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  previewCardHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  previewIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  previewCardTitle: { fontSize: 13, fontFamily: fonts.serif.extra, flex: 1 },
  previewCardHint: { fontSize: 11, fontFamily: fonts.sans.regular },
  previewBio: { fontSize: 13, fontFamily: fonts.sans.regular, lineHeight: 20 },

  /* Promo */
  promoCard: { borderRadius: 18, borderWidth: 1.5, padding: 16 },
  promoBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginBottom: 8 },
  promoBadgeText: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8 },
  promoText: { fontSize: 16, fontFamily: fonts.serif.extra, lineHeight: 22 },
  promoDue: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 6 },

  /* Services */
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, marginTop: 4, borderTopWidth: 1 },
  serviceTitle: { fontSize: 13, fontFamily: fonts.sans.bold },
  serviceDesc: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2, lineHeight: 16 },
  servicePrice: { fontSize: 15, fontFamily: fonts.serif.extra },
  addSlot: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: 10, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderStyle: "dashed",
  },
  addSlotText: { fontSize: 12, fontFamily: fonts.sans.regular },

  /* Photos */
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  photoSlot: {
    width: "30.5%", aspectRatio: 1, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  comingSoonBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  comingSoonText: { fontSize: 10, fontFamily: fonts.sans.bold },

  /* Review */
  reviewQuote: { borderRadius: 14, borderWidth: 1, padding: 14 },
  reviewText: { fontSize: 13, fontFamily: fonts.sans.regular, lineHeight: 20, fontStyle: "italic" },
  reviewAuthor: { fontSize: 11, fontFamily: fonts.sans.bold, marginTop: 8 },

  /* Placeholder */
  placeholder: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, borderStyle: "dashed",
    paddingHorizontal: 14, paddingVertical: 12,
  },
  placeholderLabel: { fontSize: 12, fontFamily: fonts.sans.bold },
  placeholderHint: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },

  /* Edit */
  editIntro: { fontSize: 12, fontFamily: fonts.sans.regular, lineHeight: 18, marginBottom: 4 },
  editSection: { borderRadius: 16, borderWidth: 1.5, overflow: "hidden" },
  editSectionHead: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  editIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  editSectionLabel: { fontSize: 13, fontFamily: fonts.sans.bold },
  editSectionDesc: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 1 },
  editBody: { paddingHorizontal: 14, paddingBottom: 16, paddingTop: 4 },

  input: {
    height: 44, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, fontSize: 13, fontFamily: fonts.sans.regular,
  },
  textarea: {
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 13, fontFamily: fonts.sans.regular,
    minHeight: 88,
  },
  charCount: { fontSize: 11, fontFamily: fonts.sans.regular, textAlign: "right", marginTop: 4 },
  fieldLabel: { fontSize: 11, fontFamily: fonts.sans.bold, marginBottom: 6, letterSpacing: 0.3 },

  serviceEditCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  serviceEditHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  serviceEditNum: { fontSize: 11, fontFamily: fonts.sans.bold, letterSpacing: 0.4 },

  addServiceBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed",
    paddingVertical: 12,
  },
  addServiceText: { fontSize: 13, fontFamily: fonts.sans.bold },

  comingSoonBox: {
    borderRadius: 14, borderWidth: 1, padding: 24,
    alignItems: "center", gap: 8,
  },
  comingSoonBoxTitle: { fontSize: 14, fontFamily: fonts.sans.bold },
  comingSoonBoxDesc: { fontSize: 12, fontFamily: fonts.sans.regular, textAlign: "center", lineHeight: 18 },

  saveBtn: {
    height: 52, borderRadius: 15,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  saveBtnText: { fontSize: 15, fontFamily: fonts.sans.bold },

  helperBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  helperBadgeText: { fontSize: 11, fontFamily: fonts.sans.bold },

  helperToggleRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5,
  },
  toggleTitle: { fontSize: 13, fontFamily: fonts.sans.bold },
  toggleSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 1 },
  togglePill: { width: 44, height: 24, borderRadius: 12, position: "relative" },
  toggleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff", position: "absolute", top: 3 },

  counterRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 8 },
  counterBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  counterVal: { fontSize: 20, fontFamily: fonts.serif.extra, minWidth: 30, textAlign: "center" },
});
