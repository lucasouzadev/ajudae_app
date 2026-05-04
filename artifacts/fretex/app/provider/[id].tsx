import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors, { fonts, shadows } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { usePortfolio } from "@/contexts/PortfolioContext";
import { type Provider } from "@/constants/mockData";
import { fetchProviderById } from "@/lib/providers";

export default function ProviderProfileScreen() {
  const c = colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role, user } = useAuth();
  const { portfolio } = usePortfolio();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoadingProvider(true);
    fetchProviderById(id).then((data) => {
      setProvider(data);
      setLoadingProvider(false);
    });
  }, [id]);

  const isClient = role === "cliente";
  // Own profile: when the logged-in provider is viewing their own page
  const isOwnProfile = user?.id === id;
  const displayBio = isOwnProfile ? portfolio.bio : provider?.bio ?? "";

  if (loadingProvider) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: c.sub, fontFamily: fonts.sans.regular }}>Carregando...</Text>
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: c.text, fontFamily: fonts.sans.semibold }}>Prestador não encontrado.</Text>
      </View>
    );
  }

  /* Contraste para texto sobre amarelo */
  const onColor = provider.color === "#FFCC00" ? "#1A1714" : "#fff";
  const accentText = provider.color === "#FFCC00" ? "#8B6F00" : provider.color;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={[provider.color, `${provider.color}AA`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.heroNav}>
            <Pressable onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={20} color={onColor} />
            </Pressable>
            <View style={{ flex: 1 }} />
            {/* Badge de contexto por role */}
            {!isClient ? (
              <View style={[styles.peerBadge, { backgroundColor: "rgba(0,0,0,0.22)" }]}>
                <Ionicons name="eye-outline" size={12} color={onColor} />
                <Text style={[styles.peerBadgeText, { color: onColor }]}>Somente visualização</Text>
              </View>
            ) : null}
            <Pressable style={styles.iconBtn}>
              <Ionicons name="share-outline" size={18} color={onColor} />
            </Pressable>
          </View>

          <View style={styles.heroBody}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={[styles.avatarText, { color: onColor }]}>{provider.ini}</Text>
              </View>
              <View style={[styles.verifyBadge, { backgroundColor: c.success }]}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            </View>
            <Text style={[styles.name, { color: onColor }]}>{provider.name}</Text>
            <View style={styles.metaRow}>
              <View style={styles.catChip}>
                {provider.cat === "Mudança" ? (
                  <Ionicons name="home" size={11} color={onColor} />
                ) : provider.cat === "Frete" ? (
                  <MaterialCommunityIcons name="truck" size={12} color={onColor} />
                ) : (
                  <Ionicons name="cube" size={11} color={onColor} />
                )}
                <Text style={[styles.catText, { color: onColor }]}>{provider.cat}</Text>
              </View>
              <View style={styles.ratingChip}>
                <Ionicons name="star" size={12} color={onColor} />
                <Text style={[styles.ratingText, { color: onColor }]}>{provider.rating}</Text>
                <Text style={[styles.jobsText, { color: `${onColor}CC` }]}>· {provider.jobs} serviços</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Aviso de pesquisa de mercado — só para prestador */}
        {!isClient ? (
          <View style={[styles.researchBanner, { backgroundColor: c.blueLight, borderColor: `${c.blue}44` }]}>
            <Ionicons name="bar-chart" size={15} color={c.blue} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.researchTitle, { color: c.blue }]}>Pesquisa de mercado</Text>
              <Text style={[styles.researchSub, { color: c.sub }]}>
                Você está visualizando o perfil de um colega de plataforma. Solicitações são exclusivas para clientes.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Bio */}
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Sobre</Text>
          <Text style={[styles.bio, { color: c.sub }]}>{displayBio}</Text>
        </View>

        {/* Stats */}
        {(() => {
          const supportsHelpers = isOwnProfile ? portfolio.supportsHelpers : provider.helpers > 0;
          const helpersLabel = supportsHelpers
            ? (isOwnProfile ? `${portfolio.helpersCount}` : `${provider.helpers}`)
            : "Não";
          return (
        <View style={styles.statsRow}>
          {[
            { v: provider.responseTime, l: "Resposta" },
            { v: provider.completionRate, l: "Conclusão" },
            { v: provider.acceptanceRate, l: "Aceitação" },
            { v: helpersLabel, l: "Ajudantes", isHelper: true, supportsHelpers },
          ].map((s) => (
            <View key={s.l} style={[styles.statCell, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.statV, { color: (s as any).isHelper && !(s as any).supportsHelpers ? c.softMuted : accentText }]}>{s.v}</Text>
              <Text style={[styles.statL, { color: c.softMuted }]}>{s.l}</Text>
            </View>
          ))}
        </View>
          );
        })()}

        {/* Serviços em destaque (do portfólio) */}
        {isOwnProfile && portfolio.servicesSection && portfolio.services.length > 0 ? (
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Serviços em destaque</Text>
            {portfolio.services.map((sv, i) => (
              <View key={i} style={[styles.serviceRow, i > 0 && { borderTopColor: c.borderLight, borderTopWidth: 1 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.serviceTitle, { color: c.text }]}>{sv.title}</Text>
                  <Text style={[styles.serviceSub, { color: c.softMuted }]}>{sv.desc}</Text>
                </View>
                <Text style={[styles.servicePrice, { color: accentText }]}>{sv.price}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Promoção ativa (do portfólio) */}
        {isOwnProfile && portfolio.promoText ? (
          <View style={[styles.section, { backgroundColor: `${provider.color}10`, borderColor: `${provider.color}44` }, shadows.sm]}>
            <View style={[styles.promoBadge, { backgroundColor: provider.color }]}>
              <Text style={[styles.promoBadgeText, { color: provider.color === "#FFCC00" ? "#1A1714" : "#fff" }]}>PROMOÇÃO</Text>
            </View>
            <Text style={[styles.promoText, { color: c.text }]}>{portfolio.promoText}</Text>
            {portfolio.promoDue ? (
              <Text style={[styles.promoDue, { color: c.softMuted }]}>Válido até {portfolio.promoDue}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Vehicle */}
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Veículo & equipamento</Text>
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: `${provider.color}22` }]}>
              <MaterialCommunityIcons name="truck" size={18} color={accentText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailLabel, { color: c.text }]}>{provider.model}</Text>
              <Text style={[styles.detailSub, { color: c.softMuted }]}>Placa {provider.plate}</Text>
            </View>
          </View>
          {provider.equipment.length > 0 ? (
            <View style={styles.tagRow}>
              {provider.equipment.map((eq) => (
                <View key={eq} style={[styles.tag, { backgroundColor: c.background, borderColor: c.border }]}>
                  <Text style={[styles.tagText, { color: c.sub }]}>{eq}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.detailSub, { color: c.softMuted, marginTop: 8 }]}>Sem equipamento adicional</Text>
          )}
        </View>

        {/* Work areas */}
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Áreas de atuação</Text>
          <View style={styles.tagRow}>
            {provider.workAreas.map((a) => (
              <View key={a} style={[styles.tag, { backgroundColor: c.background, borderColor: c.border }]}>
                <Ionicons name="location" size={11} color={c.softMuted} />
                <Text style={[styles.tagText, { color: c.sub }]}>{a}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.detailSub, { color: c.softMuted, marginTop: 8 }]}>{provider.workShift}</Text>
        </View>

        {/* Reviews */}
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Avaliações</Text>
          {provider.reviews.map((r, i) => (
            <View
              key={i}
              style={[
                styles.reviewRow,
                i < provider.reviews.length - 1 && { borderBottomColor: c.borderLight, borderBottomWidth: 1 },
              ]}
            >
              <View style={[styles.reviewAvatar, { backgroundColor: c.background }]}>
                <Text style={[styles.reviewIni, { color: c.softMuted }]}>{r.author[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.reviewHead}>
                  <Text style={[styles.reviewAuthor, { color: c.text }]}>{r.author}</Text>
                  <Text style={[styles.reviewWhen, { color: c.softMuted }]}>{r.when}</Text>
                </View>
                <View style={styles.reviewStars}>
                  {Array.from({ length: r.rating }).map((_, k) => (
                    <Ionicons key={k} name="star" size={11} color={c.warning} />
                  ))}
                </View>
                <Text style={[styles.reviewText, { color: c.sub }]}>{r.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recent services */}
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Serviços recentes</Text>
          {provider.recentServices.map((s, i) => (
            <View
              key={i}
              style={[
                styles.recRow,
                i < provider.recentServices.length - 1 && { borderBottomColor: c.borderLight, borderBottomWidth: 1 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.recLabel, { color: c.text }]}>{s.label}</Text>
                <Text style={[styles.recWhen, { color: c.softMuted }]}>{s.when}</Text>
              </View>
              <Text style={[styles.recValue, { color: accentText }]}>{s.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── Sticky footer — diferente por role ── */}
      {isClient ? (
        /* Cliente: solicitar agora */
        <View
          style={[
            styles.cta,
            { paddingBottom: insets.bottom + 14, backgroundColor: c.card, borderTopColor: c.borderLight },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.ctaPriceLabel, { color: c.softMuted }]}>a partir de</Text>
            <Text style={[styles.ctaPrice, { color: accentText }]}>{provider.price}</Text>
          </View>
          <Pressable
            onPress={() => router.push({ pathname: "/request", params: { providerId: provider.id } })}
            style={[
              styles.ctaBtn,
              { backgroundColor: provider.color },
              shadows.md,
              { shadowColor: provider.color, shadowOpacity: 0.35 },
            ]}
          >
            <Text style={[styles.ctaText, { color: onColor }]}>Solicitar agora</Text>
            <Ionicons name="arrow-forward" size={16} color={onColor} />
          </Pressable>
        </View>
      ) : (
        /* Prestador: comparativo de mercado — sem ação de solicitação */
        <View
          style={[
            styles.cta,
            { paddingBottom: insets.bottom + 14, backgroundColor: c.card, borderTopColor: c.borderLight },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.ctaPriceLabel, { color: c.softMuted }]}>cobra a partir de</Text>
            <Text style={[styles.ctaPrice, { color: accentText }]}>{provider.price}</Text>
          </View>
          <View style={[styles.peerActionRow]}>
            <View style={[styles.peerTag, { backgroundColor: c.blueLight }]}>
              <Ionicons name="people" size={13} color={c.blue} />
              <Text style={[styles.peerTagText, { color: c.blue }]}>Colega verificado</Text>
            </View>
            <Pressable
              onPress={() => router.back()}
              style={[styles.ctaBtn, { backgroundColor: c.background, borderWidth: 1.5, borderColor: c.border }]}
            >
              <Ionicons name="arrow-back" size={15} color={c.text} />
              <Text style={[styles.ctaText, { color: c.text }]}>Voltar</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 30 },
  heroNav: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  peerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  peerBadgeText: { fontSize: 10, fontFamily: fonts.sans.bold },
  heroBody: { alignItems: "center", marginTop: 14 },
  avatarWrap: { position: "relative", marginBottom: 12 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 32, fontFamily: fonts.serif.extra },
  verifyBadge: {
    position: "absolute",
    bottom: 4,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 22, fontFamily: fonts.serif.extra, lineHeight: 26 },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  catText: { fontSize: 11, fontFamily: fonts.sans.bold },
  ratingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  ratingText: { fontSize: 12, fontFamily: fonts.serif.extra },
  jobsText: { fontSize: 11, fontFamily: fonts.sans.regular },

  researchBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  researchTitle: { fontSize: 12, fontFamily: fonts.sans.bold, marginBottom: 3 },
  researchSub: { fontSize: 11, fontFamily: fonts.sans.regular, lineHeight: 16 },

  section: { marginHorizontal: 16, marginTop: 14, borderRadius: 18, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 15, fontFamily: fonts.serif.extra, marginBottom: 10 },
  bio: { fontSize: 13, fontFamily: fonts.sans.regular, lineHeight: 19 },
  statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 14 },
  statCell: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 12, alignItems: "center" },
  statV: { fontSize: 14, fontFamily: fonts.serif.extra },
  statL: { fontSize: 10, fontFamily: fonts.sans.regular, marginTop: 3 },

  detailRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  detailIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  detailLabel: { fontSize: 13, fontFamily: fonts.sans.bold },
  detailSub: { fontSize: 11, fontFamily: fonts.sans.regular },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagText: { fontSize: 11, fontFamily: fonts.sans.semibold },

  reviewRow: { flexDirection: "row", gap: 10, paddingVertical: 12 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  reviewIni: { fontSize: 13, fontFamily: fonts.serif.extra },
  reviewHead: { flexDirection: "row", justifyContent: "space-between" },
  reviewAuthor: { fontSize: 13, fontFamily: fonts.sans.bold },
  reviewWhen: { fontSize: 10, fontFamily: fonts.sans.regular },
  reviewStars: { flexDirection: "row", gap: 1, marginTop: 2 },
  reviewText: { fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 4, lineHeight: 17 },

  recRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  recLabel: { fontSize: 13, fontFamily: fonts.sans.bold },
  recWhen: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  recValue: { fontSize: 14, fontFamily: fonts.serif.extra },

  cta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  ctaPriceLabel: { fontSize: 11, fontFamily: fonts.sans.regular },
  ctaPrice: { fontSize: 22, fontFamily: fonts.serif.extra },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    height: 52,
    borderRadius: 16,
  },
  ctaText: { fontSize: 14, fontFamily: fonts.sans.extra },
  peerActionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  peerTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  peerTagText: { fontSize: 11, fontFamily: fonts.sans.bold },

  serviceRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  serviceTitle: { fontSize: 13, fontFamily: fonts.sans.bold },
  serviceSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  servicePrice: { fontSize: 15, fontFamily: fonts.serif.extra },

  promoBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginBottom: 8 },
  promoBadgeText: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8 },
  promoText: { fontSize: 15, fontFamily: fonts.serif.extra },
  promoDue: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 4 },
});
