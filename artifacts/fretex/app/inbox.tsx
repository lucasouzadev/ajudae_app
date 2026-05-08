import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import colors, { fonts, shadows } from "@/constants/colors";
import { TopNav } from "@/components/TopNav";
import { SideSheet } from "@/components/SideSheet";
import { ProfileOverlay } from "@/components/ProfileOverlay";
import { Skeleton } from "@/components/Skeleton";

interface Conversation {
  id: string;
  name: string;
  ini: string;
  color: string;
  cat: string;
  last: string;
  when: string;
  unread: number;
  online: boolean;
  fromMe?: boolean;
}

const CLIENTE_CONVERSATIONS: Conversation[] = [
  { id: "c-1", name: "Carlos Oliveira", ini: "CO", color: "#FF5500", cat: "Mudança · em rota", last: "Cheguei no portão. Pode descer?", when: "2 min", unread: 1, online: true },
  { id: "c-2", name: "Marcos Frete", ini: "MF", color: "#2563EB", cat: "Frete · combinado", last: "Combinado, até logo!", when: "1 h", unread: 0, online: true, fromMe: true },
  { id: "c-3", name: "Pedro Entrega", ini: "PE", color: "#9333EA", cat: "Entrega · concluída", last: "Foto da entrega enviada", when: "ontem", unread: 0, online: false },
  { id: "c-4", name: "Rafael Carreto", ini: "RC", color: "#16A34A", cat: "Frete · proposta", last: "Posso fazer por R$60", when: "ontem", unread: 0, online: false },
];

const PRESTADOR_CONVERSATIONS: Conversation[] = [
  { id: "p-1", name: "Ricardo A.", ini: "RA", color: "#FF5500", cat: "Mudança · em andamento", last: "Pode subir o material?", when: "3 min", unread: 2, online: true },
  { id: "p-2", name: "Julia Nunes", ini: "JN", color: "#2563EB", cat: "Frete · proposta aceita", last: "Aceito sua proposta de R$120", when: "30 min", unread: 1, online: true },
  { id: "p-3", name: "Marcelo T.", ini: "MT", color: "#16A34A", cat: "Mudança · concluída", last: "Obrigado pelo serviço!", when: "ontem", unread: 0, online: false },
  { id: "p-4", name: "Helena R.", ini: "HR", color: "#9333EA", cat: "Entrega · combinada", last: "Confirmado para às 19h", when: "ontem", unread: 0, online: false, fromMe: true },
];

const SUPPORT_HUBS_CLIENTE = [
  { icon: "chatbubbles" as const, lib: "ion" as const, label: "Chat com suporte", sub: "Resposta em até 5 min", color: "#FF5500" },
  { icon: "shield-checkmark" as const, lib: "ion" as const, label: "Reportar problema", sub: "PIN, segurança, conduta", color: "#2563EB" },
  { icon: "whatsapp" as const, lib: "mc" as const, label: "WhatsApp", sub: "(21) 9 9876-5432", color: "#16A34A" },
];

const SUPPORT_HUBS_PRESTADOR = [
  { icon: "chatbubbles" as const, lib: "ion" as const, label: "Suporte prestador", sub: "Canal exclusivo 24/7", color: "#2563EB" },
  { icon: "cash" as const, lib: "mc" as const, label: "Pagamentos", sub: "Repasses e taxas", color: "#16A34A" },
  { icon: "warning" as const, lib: "ion" as const, label: "Disputa ou no-show", sub: "Abrir ticket de incidente", color: "#FF5500" },
];

export default function InboxScreen() {
  const c = colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const { openName } = useLocalSearchParams<{ openName?: string }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  const initials = (user?.name || "RA").split(" ").map((p) => p[0]).slice(0, 2).join("");
  const accent = role === "cliente" ? c.primary : c.blue;
  const accentEnd = role === "cliente" ? c.primaryDeep : "#60A5FA";
  const counterRoleLabel = role === "cliente" ? "prestadores" : "clientes";
  const conversations = role === "cliente" ? CLIENTE_CONVERSATIONS : PRESTADOR_CONVERSATIONS;
  const hubs = role === "cliente" ? SUPPORT_HUBS_CLIENTE : SUPPORT_HUBS_PRESTADOR;
  const filtered = tab === "unread" ? conversations.filter((m) => m.unread > 0) : conversations;
  const totalUnread = conversations.reduce((sum, m) => sum + m.unread, 0);

  useEffect(() => {
    if (!openName) return;
    const match = conversations.find((c) =>
      c.name.toLowerCase().includes((openName as string).toLowerCase().split(" ")[0])
    );
    if (match) {
      setHighlightId(match.id);
      setTimeout(() => scrollRef.current?.scrollTo({ y: conversations.indexOf(match) * 90, animated: true }), 300);
    }
  }, [conversations, openName]);

  if (!user) return null;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <TopNav
        title="Mensagens"
        subtitle={`${conversations.length} conversa(s) com ${counterRoleLabel}`}
        initials={initials}
        badge={totalUnread > 0}
        accentColor={accent}
        onMenuOpen={() => setMenuOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
        onBack={() => router.back()}
      />

      <ScrollView
        ref={scrollRef}
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
          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>INBOX</Text>
            <Text style={styles.heroTitle}>Tudo no mesmo lugar</Text>
            <Text style={styles.heroSub}>
              {role === "cliente"
                ? "Combine detalhes com seus prestadores."
                : "Combine detalhes com seus clientes."}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeNumber}>{totalUnread}</Text>
            <Text style={styles.heroBadgeLabel}>não lidas</Text>
          </View>
        </LinearGradient>

        {/* Support hubs */}
        <Text style={[styles.sectionLabel, { color: c.softMuted }]}>HUBS DE SUPORTE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {hubs.map((h) => (
            <Pressable
              key={h.label}
              onPress={() => {
                if (h.label === "Chat com suporte" || h.label === "Suporte prestador") {
                  router.push({ pathname: "/chat", params: { id: "support", name: h.label, ini: "S", color: h.color, type: role === "prestador" ? "provider_support" : "support" } } as any);
                } else if (h.label === "WhatsApp") {
                  import("react-native").then(({ Linking }) => Linking.openURL("whatsapp://send?phone=5521998765432").catch(() => Linking.openURL("https://wa.me/5521998765432")));
                } else if (h.label === "Reportar problema" || h.label === "Disputa ou no-show") {
                  router.push("/ticket");
                } else if (h.label === "Pagamentos") {
                  router.push({ pathname: "/chat", params: { id: "financial", name: "Suporte Financeiro", ini: "SF", color: h.color, type: "financial" } } as any);
                } else {
                  router.push("/support");
                }
              }}
              style={[styles.hubCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}
            >
              <View style={[styles.hubIcon, { backgroundColor: `${h.color}18` }]}>
                {h.lib === "mc" ? (
                  <MaterialCommunityIcons name={h.icon as any} size={18} color={h.color} />
                ) : (
                  <Ionicons name={h.icon as any} size={18} color={h.color} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.hubLabel, { color: c.text }]} numberOfLines={1}>{h.label}</Text>
                <Text style={[styles.hubSub, { color: c.softMuted }]} numberOfLines={1}>{h.sub}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Tabs */}
        <View style={[styles.tabsBar, { backgroundColor: c.card, borderColor: c.border }]}>
          {(["all", "unread"] as const).map((t) => {
            const active = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[styles.tabBtn, active && { backgroundColor: c.background }]}
              >
                <Text
                  style={{
                    color: active ? c.text : c.softMuted,
                    fontFamily: active ? fonts.sans.bold : fonts.sans.medium,
                    fontSize: 12,
                  }}
                >
                  {t === "all" ? "Todas" : `Não lidas · ${totalUnread}`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Conversations */}
        {loading ? (
          [0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.convoCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <Skeleton width={46} height={46} borderRadius={23} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Skeleton width="45%" height={13} borderRadius={5} />
                  <Skeleton width="18%" height={11} borderRadius={4} />
                </View>
                <Skeleton width="30%" height={11} borderRadius={4} />
                <Skeleton width="75%" height={11} borderRadius={4} />
              </View>
            </View>
          ))
        ) : filtered.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: c.background }]}>
              <Ionicons name="checkmark-done" size={20} color={c.success} />
            </View>
            <Text style={[styles.emptyTitle, { color: c.text }]}>Nada por aqui</Text>
            <Text style={[styles.emptySub, { color: c.softMuted }]}>
              Você leu todas as mensagens. Bom trabalho!
            </Text>
          </View>
        ) : (
          filtered.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => router.push({ pathname: "/chat", params: { id: m.id, name: m.name, ini: m.ini, color: m.color, type: "dm" } } as any)}
              style={[
                styles.convoCard,
                { backgroundColor: c.card, borderColor: highlightId === m.id ? accent : c.border },
                shadows.sm,
                highlightId === m.id && { borderWidth: 2 },
              ]}
            >
              <View style={styles.convoAvatarWrap}>
                <LinearGradient
                  colors={[m.color, `${m.color}AA`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.convoAvatar}
                >
                  <Text style={styles.convoIni}>{m.ini}</Text>
                </LinearGradient>
                {m.online ? (
                  <View style={[styles.convoOnline, { borderColor: c.card, backgroundColor: c.success }]} />
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.convoHead}>
                  <Text style={[styles.convoName, { color: c.text }]} numberOfLines={1}>{m.name}</Text>
                  <Text style={[styles.convoWhen, { color: c.softMuted }]}>{m.when}</Text>
                </View>
                <Text style={[styles.convoCat, { color: m.color }]} numberOfLines={1}>{m.cat}</Text>
                <View style={styles.convoBody}>
                  {m.fromMe ? (
                    <Ionicons name="checkmark-done" size={13} color={c.softMuted} style={{ marginRight: 4 }} />
                  ) : null}
                  <Text
                    style={[
                      styles.convoLast,
                      {
                        color: m.unread > 0 ? c.text : c.softMuted,
                        fontFamily: m.unread > 0 ? fonts.sans.semibold : fonts.sans.regular,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {m.last}
                  </Text>
                  {m.unread > 0 ? (
                    <View style={[styles.unreadBadge, { backgroundColor: m.color }]}>
                      <Text style={styles.unreadText}>{m.unread}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <SideSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} name={user.name} initials={initials} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },
  heroEyebrow: { color: "rgba(255,255,255,0.78)", fontSize: 10, letterSpacing: 1, fontFamily: fonts.sans.bold },
  heroTitle: { color: "#fff", fontSize: 20, fontFamily: fonts.serif.extra, marginTop: 4, lineHeight: 24 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 4, lineHeight: 17 },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    minWidth: 64,
  },
  heroBadgeNumber: { color: "#fff", fontSize: 22, fontFamily: fonts.serif.extra },
  heroBadgeLabel: { color: "rgba(255,255,255,0.85)", fontSize: 9, fontFamily: fonts.sans.bold, letterSpacing: 0.5, marginTop: 2 },

  sectionLabel: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8, marginBottom: 10 },
  hubCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    width: 220,
  },
  hubIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  hubLabel: { fontSize: 13, fontFamily: fonts.sans.bold },
  hubSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 1 },

  tabsBar: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 13,
    borderWidth: 1,
    marginTop: 22,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  convoCard: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  convoAvatarWrap: { position: "relative" },
  convoAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  convoIni: { color: "#fff", fontSize: 15, fontFamily: fonts.serif.extra },
  convoOnline: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2.5,
  },
  convoHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 },
  convoName: { flex: 1, fontSize: 14, fontFamily: fonts.sans.bold },
  convoWhen: { fontSize: 11, fontFamily: fonts.sans.regular },
  convoCat: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.4, marginTop: 2 },
  convoBody: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  convoLast: { flex: 1, fontSize: 12, lineHeight: 17 },
  unreadBadge: {
    minWidth: 18,
    paddingHorizontal: 5,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: { color: "#fff", fontSize: 10, fontFamily: fonts.sans.extra },

  empty: { borderRadius: 16, borderWidth: 1, padding: 28, alignItems: "center", gap: 8 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 14, fontFamily: fonts.sans.bold },
  emptySub: { fontSize: 12, fontFamily: fonts.sans.regular, textAlign: "center" },
});
