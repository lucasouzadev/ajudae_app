import React, { useState } from "react";
import { Linking, View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useSupport } from "@/contexts/SupportContext";
import { MOCK_FAQS } from "@/constants/mockData";
import colors, { fonts, shadows } from "@/constants/colors";
import { TopNav } from "@/components/TopNav";
import { SideSheet } from "@/components/SideSheet";
import { ProfileOverlay } from "@/components/ProfileOverlay";
import { Skeleton } from "@/components/Skeleton";

const QUICK = [
  { icon: "warning" as const, label: "Reportar problema", color: "#FF5500" },
  { icon: "card" as const, label: "Cobrança", color: "#16A34A", lib: "ion" as const },
  { icon: "lock-closed" as const, label: "Segurança", color: "#2563EB" },
  { icon: "chatbubbles" as const, label: "Chat com agente", color: "#9333EA" },
  { icon: "notifications" as const, label: "Teste push", color: "#7C3AED" },
];

const STATUS_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  open: { bg: "#FEF3C7", fg: "#D97706", label: "Aberto" },
  under_review: { bg: "#DBEAFE", fg: "#2563EB", label: "Em análise" },
  resolved: { bg: "#DCFCE7", fg: "#16A34A", label: "Resolvido" },
};

export default function SupportScreen() {
  const c = colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const { tickets } = useSupport();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  if (!user) return null;
  const initials = (user.name || "RA").split(" ").map((p) => p[0]).slice(0, 2).join("");
  const accent = role === "cliente" ? c.primary : c.blue;
  const accentEnd = role === "cliente" ? c.primaryDeep : "#60A5FA";
  const faqs = MOCK_FAQS[role];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <TopNav
        title="Central de Ajuda"
        subtitle="Estamos por aqui"
        initials={initials}
        badge
        accentColor={accent}
        onMenuOpen={() => setMenuOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={[accent, accentEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>SUPORTE</Text>
          <Text style={styles.heroTitle}>Como podemos ajudar?</Text>
          <Text style={styles.heroSub}>Tickets em até 2h úteis · Chat 24/7.</Text>
        </LinearGradient>

        {/* Quick actions */}
        <View style={styles.quickGrid}>
          {QUICK.map((q) => (
            <Pressable
              key={q.label}
              onPress={() => {
                if (q.label === "Reportar problema") router.push("/ticket");
                else if (q.label === "Chat com agente") router.push({ pathname: "/chat", params: { id: "support", name: "Suporte Ajudaê", ini: "SA", color: "#FF5500", type: "support" } } as any);
                else if (q.label === "Cobrança") router.push({ pathname: "/chat", params: { id: "financial", name: "Suporte Financeiro", ini: "SF", color: "#16A34A", type: "financial" } } as any);
                else if (q.label === "Segurança") router.push("/ticket");
                else if (q.label === "Teste push") router.push("/push-test" as never);
              }}
              style={[styles.quickCell, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}
            >
              <View style={[styles.quickIcon, { backgroundColor: `${q.color}18` }]}>
                <Ionicons name={q.icon} size={17} color={q.color} />
              </View>
              <Text style={[styles.quickLabel, { color: c.text }]}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Tickets */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>Meus Tickets</Text>
        <Text style={[styles.sectionSub, { color: c.softMuted }]}>
          {loading ? "Carregando..." : tickets.length === 0 ? "Você ainda não abriu tickets" : `${tickets.length} aberto(s)`}
        </Text>

        {loading ? (
          [0, 1].map((i) => (
            <View key={i} style={[styles.ticketCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.ticketHead}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="65%" height={13} borderRadius={5} />
                  <Skeleton width="40%" height={11} borderRadius={4} />
                </View>
                <Skeleton width={70} height={24} borderRadius={999} />
              </View>
              <Skeleton width="90%" height={11} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
          ))
        ) : tickets.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: c.background }]}>
              <Ionicons name="ticket" size={20} color={c.softMuted} />
            </View>
            <Text style={[styles.emptyText, { color: c.sub }]}>Tudo certo por aqui</Text>
            <Text style={[styles.emptyHint, { color: c.softMuted }]}>
              Use os atalhos acima caso precise abrir uma solicitação.
            </Text>
          </View>
        ) : (
          tickets.slice(0, 5).map((t) => {
            const s = STATUS_COLORS[t.status] || STATUS_COLORS.open;
            return (
              <View key={t.id} style={[styles.ticketCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
                <View style={styles.ticketHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ticketReason, { color: c.text }]}>{t.reason}</Text>
                    <Text style={[styles.ticketDate, { color: c.softMuted }]}>
                      {new Date(t.createdAt).toLocaleDateString("pt-BR")}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.statusText, { color: s.fg }]}>{s.label}</Text>
                  </View>
                </View>
                <Text style={[styles.ticketDesc, { color: c.sub }]} numberOfLines={2}>
                  {t.description}
                </Text>
              </View>
            );
          })
        )}

        {/* FAQs */}
        <Text style={[styles.sectionTitle, { color: c.text, marginTop: 24 }]}>Perguntas Frequentes</Text>
        <Text style={[styles.sectionSub, { color: c.softMuted }]}>Respostas rápidas para dúvidas comuns</Text>

        {loading ? (
          [0, 1, 2].map((i) => (
            <View key={i} style={[styles.faqCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={[styles.faqHead, { paddingVertical: 12 }]}>
                <Skeleton width={28} height={28} borderRadius={8} />
                <Skeleton width="75%" height={13} borderRadius={5} />
              </View>
            </View>
          ))
        ) : null}

        {!loading && faqs.map((faq, i) => (
          <View key={i} style={[styles.faqCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Pressable onPress={() => setExpanded(expanded === i ? null : i)} style={styles.faqHead}>
              <View style={[styles.faqDot, { backgroundColor: c.background }]}>
                <Text style={[styles.faqDotText, { color: c.softMuted }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.faqQ, { color: c.text }]}>{faq.q}</Text>
              <Ionicons name={expanded === i ? "chevron-up" : "chevron-down"} size={16} color={c.softMuted} />
            </Pressable>
            {expanded === i ? <Text style={[styles.faqA, { color: c.sub }]}>{faq.a}</Text> : null}
          </View>
        ))}

        {/* Contacts */}
        <Text style={[styles.sectionTitle, { color: c.text, marginTop: 24 }]}>Outros canais</Text>
        <View style={[styles.contactCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Pressable onPress={() => Linking.openURL("whatsapp://send?phone=5521998765432").catch(() => Linking.openURL("https://wa.me/5521998765432"))} style={[styles.contactRow, { borderBottomColor: c.borderLight }]}>
            <View style={[styles.contactIcon, { backgroundColor: c.successLight }]}>
              <MaterialCommunityIcons name="whatsapp" size={18} color={c.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactLabel, { color: c.text }]}>WhatsApp</Text>
              <Text style={[styles.contactSub, { color: c.softMuted }]}>(21) 9 9876-5432</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={c.softMuted} />
          </Pressable>
          <Pressable onPress={() => Linking.openURL("mailto:ajuda@ajudae.app")} style={[styles.contactRow, { borderBottomColor: c.borderLight }]}>
            <View style={[styles.contactIcon, { backgroundColor: c.blueLight }]}>
              <Ionicons name="mail" size={18} color={c.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactLabel, { color: c.text }]}>Email</Text>
              <Text style={[styles.contactSub, { color: c.softMuted }]}>ajuda@ajudae.app</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={c.softMuted} />
          </Pressable>
          <Pressable onPress={() => Linking.openURL("tel:08002004500")} style={styles.contactRow}>
            <View style={[styles.contactIcon, { backgroundColor: c.warningLight }]}>
              <Ionicons name="call" size={18} color={c.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactLabel, { color: c.text }]}>Telefone</Text>
              <Text style={[styles.contactSub, { color: c.softMuted }]}>0800 200 4500</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={c.softMuted} />
          </Pressable>
        </View>
      </ScrollView>

      <SideSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} name={user.name} initials={initials} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 22, padding: 20, marginBottom: 16 },
  heroEyebrow: { color: "rgba(255,255,255,0.78)", fontSize: 10, letterSpacing: 1, fontFamily: fonts.sans.bold },
  heroTitle: { color: "#fff", fontSize: 22, fontFamily: fonts.serif.extra, marginTop: 4, lineHeight: 26 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 6, lineHeight: 18 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickCell: {
    width: "48.4%",
    flexGrow: 1,
    flexBasis: "48%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quickIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  quickLabel: { flex: 1, fontSize: 12, fontFamily: fonts.sans.bold },
  sectionTitle: { fontSize: 18, fontFamily: fonts.serif.extra, marginTop: 22 },
  sectionSub: { fontSize: 12, fontFamily: fonts.sans.regular, marginBottom: 12, marginTop: 2 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 8 },
  emptyIcon: { width: 50, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 14, fontFamily: fonts.sans.bold },
  emptyHint: { fontSize: 12, fontFamily: fonts.sans.regular, textAlign: "center" },
  ticketCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 8 },
  ticketHead: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  ticketReason: { fontSize: 13, fontFamily: fonts.sans.bold },
  ticketDate: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 10, fontFamily: fonts.sans.bold },
  ticketDesc: { fontSize: 12, fontFamily: fonts.sans.regular, lineHeight: 18 },
  faqCard: { borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  faqHead: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  faqDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  faqDotText: { fontSize: 11, fontFamily: fonts.serif.extra },
  faqQ: { flex: 1, fontSize: 13, fontFamily: fonts.sans.semibold },
  faqA: { fontSize: 12, fontFamily: fonts.sans.regular, lineHeight: 19, paddingHorizontal: 14, paddingBottom: 14 },
  contactCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
  },
  contactIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  contactLabel: { fontSize: 13, fontFamily: fonts.sans.bold },
  contactSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 1 },
});
