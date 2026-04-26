import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors, { fonts, shadows } from "@/constants/colors";
import { TopNav } from "@/components/TopNav";
import { SideSheet } from "@/components/SideSheet";
import { ProfileOverlay } from "@/components/ProfileOverlay";
import { useAuth } from "@/contexts/AuthContext";

type Stage =
  | "accepted"
  | "enroute_pickup"
  | "arrived_pickup"
  | "loading"
  | "enroute_delivery"
  | "delivered"
  | "rated";

const STAGES: { id: Stage; label: string; cta: string; sub: string; icon: any }[] = [
  { id: "accepted", label: "Aceito", cta: "Estou a caminho", sub: "Confirme que está saindo", icon: "checkmark-circle" },
  { id: "enroute_pickup", label: "A caminho da coleta", cta: "Cheguei no local", sub: "8 min · 3,2 km até o cliente", icon: "navigate" },
  { id: "arrived_pickup", label: "No local de coleta", cta: "Iniciar carregamento", sub: "Confirme com o cliente o que carregar", icon: "location" },
  { id: "loading", label: "Carregando", cta: "Saí para entrega", sub: "Marque tudo carregado e pronto", icon: "cube" },
  { id: "enroute_delivery", label: "Em trânsito", cta: "Cheguei no destino", sub: "12,4 km até a Barra", icon: "car-sport" },
  { id: "delivered", label: "Entregue", cta: "Solicitar PIN do cliente", sub: "Confirme entrega com PIN de 6 dígitos", icon: "shield-checkmark" },
  { id: "rated", label: "Concluído", cta: "Voltar para Home", sub: "Pagamento liberado em até 1 dia útil", icon: "star" },
];

export default function JobScreen() {
  const c = colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("enroute_pickup");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = (user?.name || "PR").split(" ").map((p) => p[0]).slice(0, 2).join("");
  const stageIndex = STAGES.findIndex((s) => s.id === stage);
  const current = STAGES[stageIndex];
  const progress = ((stageIndex + 1) / STAGES.length) * 100;

  const advance = () => {
    if (stage === "rated") {
      router.replace("/");
      return;
    }
    const next = STAGES[stageIndex + 1];
    if (next) setStage(next.id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <TopNav
        title="Serviço em andamento"
        subtitle={`Etapa ${stageIndex + 1} de ${STAGES.length} · ${current.label}`}
        initials={initials}
        accentColor={c.primary}
        onMenuOpen={() => setMenuOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Live hero */}
        <LinearGradient
          colors={[c.primary, c.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>AO VIVO · MUDANÇA</Text>
          </View>
          <Text style={styles.heroTitle}>Tijuca → Barra da Tijuca</Text>
          <Text style={styles.heroMeta}>12,4 km · ~38 min · R$165 (líquido R$148,50)</Text>

          {/* Progress */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{Math.round(progress)}% do serviço concluído</Text>
        </LinearGradient>

        {/* Client card */}
        <View style={[styles.clientCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <LinearGradient colors={["#2563EB", "#60A5FA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.clientAvatar}>
            <Text style={styles.clientIni}>RA</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.clientName, { color: c.text }]}>Ricardo A.</Text>
            <Text style={[styles.clientMeta, { color: c.softMuted }]}>Cliente Ajudaê! · 4,9 ★</Text>
          </View>
          <Pressable
            onPress={() => router.push("/inbox")}
            style={[styles.clientBtn, { backgroundColor: c.background, borderColor: c.border }]}
          >
            <Ionicons name="chatbubble-ellipses" size={16} color={c.text} />
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL("tel:+5521999998888").catch(() => {})}
            style={[styles.clientBtn, { backgroundColor: c.primary, borderColor: c.primary }]}
          >
            <Ionicons name="call" size={16} color="#fff" />
          </Pressable>
        </View>

        {/* Route */}
        <View style={[styles.routeCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Text style={[styles.sectionLabel, { color: c.softMuted }]}>ROTA</Text>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: c.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.routeAddress, { color: c.text }]}>Rua Conde de Bonfim, 410</Text>
              <Text style={[styles.routeAddrSub, { color: c.softMuted }]}>Tijuca · 3º andar (sem elevador)</Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: c.success, borderColor: c.success }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.routeAddress, { color: c.text }]}>Av. das Américas, 5500</Text>
              <Text style={[styles.routeAddrSub, { color: c.softMuted }]}>Barra da Tijuca · Bloco 3 · Apto 1204</Text>
            </View>
          </View>
        </View>

        {/* Stage timeline */}
        <Text style={[styles.sectionLabel, { color: c.softMuted, marginTop: 18 }]}>ETAPAS DO SERVIÇO</Text>
        <View style={[styles.timeline, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          {STAGES.map((s, idx) => {
            const done = idx < stageIndex;
            const active = idx === stageIndex;
            const tone = done ? c.success : active ? c.primary : c.borderLight;
            return (
              <View key={s.id} style={styles.tlRow}>
                <View style={styles.tlLeft}>
                  <View style={[styles.tlNode, { backgroundColor: tone, borderColor: tone }]}>
                    <Ionicons
                      name={done ? "checkmark" : (s.icon as any)}
                      size={done ? 12 : 11}
                      color={done || active ? "#fff" : c.softMuted}
                    />
                  </View>
                  {idx < STAGES.length - 1 ? (
                    <View style={[styles.tlBar, { backgroundColor: idx < stageIndex ? c.success : c.borderLight }]} />
                  ) : null}
                </View>
                <View style={{ flex: 1, paddingBottom: 14 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: active ? fonts.sans.bold : fonts.sans.semibold,
                      color: active ? c.text : done ? c.text : c.softMuted,
                    }}
                  >
                    {s.label}
                  </Text>
                  {active ? (
                    <Text style={[styles.tlSub, { color: c.softMuted }]}>{s.sub}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {/* Item info */}
        <View style={[styles.itemCard, { backgroundColor: c.card, borderColor: c.border, marginTop: 18 }]}>
          <Text style={[styles.sectionLabel, { color: c.softMuted }]}>ITEM</Text>
          <View style={styles.itemRow}>
            <View style={[styles.itemIcon, { backgroundColor: `${c.primary}18` }]}>
              <MaterialCommunityIcons name="sofa" size={20} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: c.text }]}>Mudança média</Text>
              <Text style={[styles.itemSub, { color: c.softMuted }]}>Sofá, 4 caixas grandes, 1 cama box, mesa</Text>
            </View>
          </View>
          <View style={[styles.itemKpis, { borderTopColor: c.border }]}>
            <View style={styles.kpi}>
              <Text style={[styles.kpiLabel, { color: c.softMuted }]}>VOLUME</Text>
              <Text style={[styles.kpiValue, { color: c.text }]}>~3 m³</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={[styles.kpiLabel, { color: c.softMuted }]}>AJUDANTE</Text>
              <Text style={[styles.kpiValue, { color: c.text }]}>1 incluso</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={[styles.kpiLabel, { color: c.softMuted }]}>PAGAMENTO</Text>
              <Text style={[styles.kpiValue, { color: c.success }]}>Pix</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.ctaWrap, { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: 16 + insets.bottom }]}>
        {stage !== "rated" ? (
          <Pressable
            style={[styles.ctaSecondary, { backgroundColor: c.background, borderColor: c.border }]}
          >
            <Ionicons name="alert-circle" size={15} color={c.warning} />
            <Text style={[styles.ctaSecondaryText, { color: c.text }]}>Reportar problema</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={advance}
          style={[styles.ctaPrimary, { backgroundColor: stage === "rated" ? c.success : c.primary }, shadows.md]}
        >
          <Text style={styles.ctaPrimaryText}>{current.cta}</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>
      </View>

      <SideSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} name={user?.name || ""} initials={initials} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 22, padding: 18 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 1 },
  heroTitle: { color: "#fff", fontSize: 22, fontFamily: fonts.serif.extra, marginTop: 8, lineHeight: 26 },
  heroMeta: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: fonts.sans.medium, marginTop: 4 },
  progressTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 6, marginTop: 14, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: "#fff", borderRadius: 6 },
  progressLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontFamily: fonts.sans.semibold, marginTop: 6 },

  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
  },
  clientAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  clientIni: { color: "#fff", fontSize: 14, fontFamily: fonts.serif.extra },
  clientName: { fontSize: 14, fontFamily: fonts.sans.bold },
  clientMeta: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  clientBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  sectionLabel: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8, marginBottom: 10 },

  routeCard: { padding: 14, borderRadius: 16, borderWidth: 1, marginTop: 14 },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  routeDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, borderWidth: 2, borderColor: "transparent" },
  routeAddress: { fontSize: 13, fontFamily: fonts.sans.bold },
  routeAddrSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  routeLine: { width: 2, height: 22, backgroundColor: "#E5DED3", marginLeft: 5, marginVertical: 2 },

  timeline: { padding: 16, borderRadius: 16, borderWidth: 1 },
  tlRow: { flexDirection: "row", gap: 12 },
  tlLeft: { alignItems: "center", width: 22 },
  tlNode: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  tlBar: { width: 2, flex: 1, marginTop: 2 },
  tlSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2, lineHeight: 15 },

  itemCard: { padding: 14, borderRadius: 16, borderWidth: 1 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  itemIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  itemTitle: { fontSize: 14, fontFamily: fonts.sans.bold },
  itemSub: { fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 2 },
  itemKpis: { flexDirection: "row", gap: 12, borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  kpi: { flex: 1 },
  kpiLabel: { fontSize: 9, fontFamily: fonts.sans.bold, letterSpacing: 0.6 },
  kpiValue: { fontSize: 13, fontFamily: fonts.sans.bold, marginTop: 4 },

  ctaWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
  },
  ctaSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
  },
  ctaSecondaryText: { fontSize: 12, fontFamily: fonts.sans.bold },
  ctaPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  ctaPrimaryText: { color: "#fff", fontSize: 14, fontFamily: fonts.sans.bold },
});
