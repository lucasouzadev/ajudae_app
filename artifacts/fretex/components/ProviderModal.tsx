import React from "react";
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import colors, { fonts, shadows } from "@/constants/colors";
import type { Provider, Category } from "@/constants/mockData";
import { PrimaryButton } from "./PrimaryButton";
import { useAuth } from "@/contexts/AuthContext";

interface ProviderModalProps {
  open: boolean;
  provider: Provider | null;
  onClose: () => void;
  onRequest: (p: Provider) => void;
  onProfile: (p: Provider) => void;
}

const REPUTATION = [
  { label: "Pontualidade", v: 0.96 },
  { label: "Cuidado", v: 0.92 },
  { label: "Comunicação", v: 0.88 },
];

function CatIcon({ cat, size, color }: { cat: Category; size: number; color: string }) {
  if (cat === "Mudança") return <Ionicons name="home" size={size} color={color} />;
  if (cat === "Frete") return <MaterialCommunityIcons name="truck" size={size + 1} color={color} />;
  return <Ionicons name="cube" size={size} color={color} />;
}

export function ProviderModal({ open, provider, onClose, onRequest, onProfile }: ProviderModalProps) {
  const c = colors.light;
  const { role } = useAuth();
  const isClient = role === "cliente";
  if (!provider) return null;
  const accentText = provider.color === "#FFCC00" ? "#8B6F00" : provider.color;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centerWrap} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: c.card }, shadows.xl]}>
          {/* Hero */}
          <LinearGradient
            colors={[`${provider.color}14`, c.card]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.hero}
          >
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={16} color={c.text} />
            </Pressable>

            <View style={styles.heroBody}>
              <View>
                <LinearGradient
                  colors={[provider.color, `${provider.color}AA`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.avatar, { borderColor: c.card }, shadows.md]}
                >
                  <Text style={styles.avatarText}>{provider.ini}</Text>
                </LinearGradient>
                <View style={[styles.verifyBadge, { borderColor: c.card, backgroundColor: c.success }]}>
                  <Ionicons name="checkmark" size={11} color="#fff" />
                </View>
              </View>
              <Text style={[styles.name, { color: c.text }]}>{provider.name}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.catChip, { backgroundColor: `${provider.color}18` }]}>
                  <CatIcon cat={provider.cat} size={11} color={provider.color} />
                  <Text style={[styles.catText, { color: provider.color }]}>{provider.cat}</Text>
                </View>
                <Ionicons name="star" size={13} color={c.warning} />
                <Text style={[styles.ratingText, { color: c.warning }]}>{provider.rating}</Text>
                <Text style={{ color: c.softMuted, fontSize: 11 }}>·</Text>
                <Text style={[styles.jobsText, { color: c.sub }]}>{provider.jobs} serviços</Text>
              </View>
            </View>
          </LinearGradient>

          <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ padding: 20, paddingTop: 8 }}>
            {/* Modelo + Serviço */}
            <View style={styles.gridRow}>
              <View style={[styles.gridCell, { backgroundColor: c.background, borderColor: c.border }]}>
                <Text style={[styles.cellLabel, { color: c.softMuted }]}>MODELO</Text>
                <Text style={[styles.cellTitle, { color: c.text }]}>{provider.vehicle}</Text>
                <Text style={[styles.cellSub, { color: c.sub }]}>{provider.model}</Text>
              </View>
              <View style={[styles.gridCell, { backgroundColor: c.background, borderColor: c.border }]}>
                <Text style={[styles.cellLabel, { color: c.softMuted }]}>SERVIÇO</Text>
                <Text style={[styles.cellTitle, { color: c.text }]}>{provider.cat}</Text>
                <Text style={[styles.cellSub, { color: c.sub }]}>
                  a partir de <Text style={{ color: provider.color, fontFamily: fonts.serif.extra }}>{provider.price}</Text>
                </Text>
              </View>
            </View>

            {/* Reputação */}
            <Text style={[styles.sectionLabel, { color: c.sub }]}>REPUTAÇÃO</Text>
            <View style={[styles.reputBox, { backgroundColor: c.background, borderColor: c.border }]}>
              {REPUTATION.map((r, i) => (
                <View key={i} style={{ marginBottom: i < REPUTATION.length - 1 ? 10 : 0 }}>
                  <View style={styles.reputHead}>
                    <Text style={[styles.reputLabel, { color: c.text }]}>{r.label}</Text>
                    <Text style={[styles.reputPct, { color: provider.color }]}>{Math.round(r.v * 100)}%</Text>
                  </View>
                  <View style={[styles.reputBar, { backgroundColor: c.border }]}>
                    <View style={[styles.reputFill, { width: `${r.v * 100}%`, backgroundColor: provider.color }]} />
                  </View>
                </View>
              ))}
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statCell, { backgroundColor: c.background, borderColor: c.border }]}>
                <Text style={[styles.statValue, { color: c.text }]}>{provider.responseTime}</Text>
                <Text style={[styles.statLabel, { color: c.softMuted }]}>Resposta</Text>
              </View>
              <View style={[styles.statCell, { backgroundColor: c.background, borderColor: c.border }]}>
                <Text style={[styles.statValue, { color: c.text }]}>{provider.completionRate}</Text>
                <Text style={[styles.statLabel, { color: c.softMuted }]}>Conclusão</Text>
              </View>
              <View style={[styles.statCell, { backgroundColor: c.background, borderColor: c.border }]}>
                <Text style={[styles.statValue, { color: c.text }]}>{provider.km} km</Text>
                <Text style={[styles.statLabel, { color: c.softMuted }]}>Distância</Text>
              </View>
            </View>
          </ScrollView>

          {/* CTAs — diferenciados por role */}
          <View style={[styles.ctas, { borderTopColor: c.borderLight }]}>
            <PrimaryButton
              variant="outline"
              title="Ver perfil"
              size="md"
              color={provider.color}
              onPress={() => onProfile(provider)}
              style={{ flex: 1 }}
            />
            {isClient ? (
              <PrimaryButton
                title="Solicitar"
                size="md"
                color={provider.color}
                onPress={() => onRequest(provider)}
                icon="arrow-forward"
                style={{ flex: 1.4 }}
              />
            ) : (
              /* Prestador: sem CTA de solicitação */
              <View style={[styles.peerCta, { backgroundColor: c.blueLight, flex: 1.4 }]}>
                <Ionicons name="bar-chart" size={14} color={c.blue} />
                <Text style={[styles.peerCtaText, { color: c.blue }]}>Pesquisa</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 12 },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 22,
    overflow: "hidden",
  },
  hero: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18 },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(28,25,23,0.08)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  heroBody: { alignItems: "center" },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 30, fontFamily: fonts.serif.extra },
  verifyBadge: {
    position: "absolute",
    bottom: 10,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 19, fontFamily: fonts.serif.extra, lineHeight: 22 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 20,
  },
  catText: { fontSize: 10, fontFamily: fonts.sans.bold },
  ratingText: { fontSize: 13, fontFamily: fonts.serif.extra },
  jobsText: { fontSize: 11, fontFamily: fonts.sans.regular },
  gridRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  gridCell: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cellLabel: { fontSize: 9, fontFamily: fonts.sans.bold, letterSpacing: 0.6 },
  cellTitle: { fontSize: 13, fontFamily: fonts.sans.bold, marginTop: 2 },
  cellSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  sectionLabel: {
    fontSize: 10,
    fontFamily: fonts.sans.bold,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  reputBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  reputHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  reputLabel: { fontSize: 12, fontFamily: fonts.sans.semibold },
  reputPct: { fontSize: 12, fontFamily: fonts.sans.bold },
  reputBar: { height: 5, borderRadius: 3, overflow: "hidden" },
  reputFill: { height: "100%", borderRadius: 3 },
  statsRow: { flexDirection: "row", gap: 8 },
  statCell: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  statValue: { fontSize: 14, fontFamily: fonts.serif.extra },
  statLabel: { fontSize: 10, fontFamily: fonts.sans.regular, marginTop: 2 },
  ctas: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
  },
  peerCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
  },
  peerCtaText: { fontSize: 13, fontFamily: fonts.sans.bold },
});
