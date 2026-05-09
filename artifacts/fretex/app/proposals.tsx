import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import colors, { fonts, shadows } from "@/constants/colors";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/contexts/AuthContext";
import { decideProposal, listProposals, type ServiceProposalRow } from "@/lib/proposals";

function formatDate(value?: string | null) {
  if (!value) return "Imediato";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Agendado";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatMoney(value?: number | null) {
  if (!value) return "A combinar";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function categoryName(item: ServiceProposalRow) {
  return item.categories?.name ?? "Serviço";
}

function counterpartyName(item: ServiceProposalRow, role: "cliente" | "prestador") {
  if (role === "cliente") return item.provider?.profiles?.name ?? "Prestador";
  return item.client?.name ?? "Cliente";
}

export default function ProposalsScreen() {
  const c = colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const [proposals, setProposals] = useState<ServiceProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<ServiceProposalRow | null>(null);
  const [scheduleText, setScheduleText] = useState("");
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const initials = (user?.name || "AJ").split(" ").map((part) => part[0]).slice(0, 2).join("");
  const accent = role === "prestador" ? c.blue : c.primary;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setProposals(await listProposals());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar propostas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const parseSchedule = () => {
    const clean = scheduleText.trim();
    const match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
    if (!match) return null;
    const [, day, month, year, hour, minute] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  };

  const decide = async (item: ServiceProposalRow, decision: "accept" | "reject", scheduledFor?: string) => {
    setDecidingId(item.id);
    setError(null);
    try {
      const result = await decideProposal({
        proposal_id: item.id,
        decision,
        scheduled_for: scheduledFor,
      });
      Haptics.notificationAsync(decision === "accept" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
      await load();
      if (decision === "accept" && result.request_id) {
        router.push({
          pathname: "/chat",
          params: {
            id: result.request_id,
            requestId: result.request_id,
            name: counterpartyName(item, role),
            ini: counterpartyName(item, role).slice(0, 2).toUpperCase(),
            color: accent,
            type: "dm",
          },
        } as never);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível decidir a proposta");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setDecidingId(null);
      setScheduleTarget(null);
      setScheduleText("");
    }
  };

  const submitSchedule = () => {
    if (!scheduleTarget) return;
    const scheduledFor = parseSchedule();
    if (!scheduledFor) {
      setError("Informe a data no formato DD/MM/AAAA HH:MM.");
      return;
    }
    decide(scheduleTarget, "accept", scheduledFor);
  };

  const pending = proposals.filter((item) => item.status === "pending");
  const history = proposals.filter((item) => item.status !== "pending");
  const title = role === "prestador" ? "Propostas" : "Minhas propostas";

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <TopNav
        title={title}
        subtitle={role === "prestador" ? "Analise e organize sua agenda" : "Acompanhe envios e agendamentos"}
        initials={initials}
        accentColor={accent}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: "#FFF1F2", borderColor: c.destructive }]}>
            <Ionicons name="alert-circle" size={17} color={c.destructive} />
            <Text style={[styles.errorText, { color: c.destructive }]}>{error}</Text>
          </View>
        ) : null}

        <View style={[styles.hero, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <View style={[styles.heroIcon, { backgroundColor: `${accent}18` }]}>
            <Ionicons name="file-tray-full" size={20} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: c.text }]}>{pending.length} pendente(s)</Text>
            <Text style={[styles.heroSub, { color: c.softMuted }]}>
              {role === "prestador" ? "Aceite uma imediata por vez ou agende para outro horário." : "Chat abre somente depois do aceite."}
            </Text>
          </View>
          <Pressable onPress={load} style={[styles.refreshBtn, { backgroundColor: c.background, borderColor: c.border }]}>
            <Ionicons name="refresh" size={16} color={c.text} />
          </Pressable>
        </View>

        {loading ? (
          <Text style={[styles.emptyText, { color: c.softMuted }]}>Carregando propostas...</Text>
        ) : proposals.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="mail-open-outline" size={28} color={c.softMuted} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>Nenhuma proposta</Text>
            <Text style={[styles.emptyText, { color: c.softMuted }]}>
              {role === "prestador" ? "Quando clientes enviarem propostas, elas aparecem aqui." : "Envie uma proposta pelo Marketplace."}
            </Text>
          </View>
        ) : (
          <>
            {pending.length > 0 ? <Text style={[styles.section, { color: c.text }]}>Pendentes</Text> : null}
            {pending.map((item) => (
              <ProposalCard
                key={item.id}
                item={item}
                role={role}
                c={c}
                accent={accent}
                disabled={decidingId === item.id}
                onAccept={() => decide(item, "accept")}
                onReject={() => decide(item, "reject")}
                onSchedule={() => setScheduleTarget(item)}
              />
            ))}

            {history.length > 0 ? <Text style={[styles.section, { color: c.text, marginTop: 18 }]}>Histórico</Text> : null}
            {history.map((item) => (
              <ProposalCard
                key={item.id}
                item={item}
                role={role}
                c={c}
                accent={accent}
                history
              />
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={!!scheduleTarget} transparent animationType="fade" onRequestClose={() => setScheduleTarget(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.scheduleModal, { backgroundColor: c.card }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Agendar proposta</Text>
            <Text style={[styles.modalSub, { color: c.softMuted }]}>Informe data e hora para aceitar o serviço.</Text>
            <TextInput
              value={scheduleText}
              onChangeText={setScheduleText}
              placeholder="DD/MM/AAAA HH:MM"
              placeholderTextColor={c.softMuted}
              style={[styles.scheduleInput, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setScheduleTarget(null)} style={[styles.modalBtn, { borderColor: c.border }]}>
                <Text style={[styles.modalBtnText, { color: c.text }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={submitSchedule} style={[styles.modalBtn, { backgroundColor: accent, borderColor: accent }]}>
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Agendar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ProposalCard({
  item,
  role,
  c,
  accent,
  disabled,
  history,
  onAccept,
  onReject,
  onSchedule,
}: {
  item: ServiceProposalRow;
  role: "cliente" | "prestador";
  c: typeof colors.light;
  accent: string;
  disabled?: boolean;
  history?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onSchedule?: () => void;
}) {
  const statusColor =
    item.status === "accepted" ? c.success : item.status === "rejected" ? c.destructive : item.status === "pending" ? accent : c.softMuted;
  const name = counterpartyName(item, role);

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: `${statusColor}22` }]}>
          <Text style={[styles.avatarText, { color: statusColor }]}>{name.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: c.text }]}>{name}</Text>
          <Text style={[styles.cardMeta, { color: c.softMuted }]}>{categoryName(item)} · {formatDate(item.scheduled_for)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </View>

      <View style={[styles.detailBox, { backgroundColor: c.background, borderColor: c.borderLight }]}>
        <Text style={[styles.detailText, { color: c.text }]}>{item.address_origin}</Text>
        {item.address_dest ? <Text style={[styles.detailSub, { color: c.softMuted }]}>Destino: {item.address_dest}</Text> : null}
        {item.description ? <Text style={[styles.detailSub, { color: c.softMuted }]}>{item.description}</Text> : null}
        <Text style={[styles.detailMoney, { color: accent }]}>{formatMoney(item.price_proposed)}</Text>
      </View>

      {!history && role === "prestador" ? (
        <View style={styles.actions}>
          <Pressable disabled={disabled} onPress={onReject} style={[styles.actionBtn, { borderColor: c.destructive, backgroundColor: "#FFF1F2" }]}>
            <Text style={[styles.actionText, { color: c.destructive }]}>Recusar</Text>
          </Pressable>
          <Pressable disabled={disabled} onPress={onSchedule} style={[styles.actionBtn, { borderColor: c.border, backgroundColor: c.background }]}>
            <Text style={[styles.actionText, { color: c.text }]}>Agendar</Text>
          </Pressable>
          <Pressable disabled={disabled} onPress={onAccept} style={[styles.actionBtn, { borderColor: c.success, backgroundColor: c.success }]}>
            <Text style={[styles.actionText, { color: "#fff" }]}>Aceitar</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 16 },
  heroIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 15, fontFamily: fonts.sans.bold },
  heroSub: { fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 2, lineHeight: 17 },
  refreshBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  section: { fontSize: 13, fontFamily: fonts.sans.bold, marginBottom: 10 },
  card: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, fontFamily: fonts.serif.extra },
  cardTitle: { fontSize: 14, fontFamily: fonts.sans.bold },
  cardMeta: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontFamily: fonts.sans.bold },
  detailBox: { borderRadius: 14, borderWidth: 1, padding: 12, marginTop: 12, gap: 4 },
  detailText: { fontSize: 12, fontFamily: fonts.sans.semibold },
  detailSub: { fontSize: 11, fontFamily: fonts.sans.regular, lineHeight: 16 },
  detailMoney: { fontSize: 15, fontFamily: fonts.serif.extra, marginTop: 3 },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  actionText: { fontSize: 12, fontFamily: fonts.sans.bold },
  empty: { borderRadius: 18, borderWidth: 1, padding: 28, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 14, fontFamily: fonts.sans.bold },
  emptyText: { fontSize: 12, fontFamily: fonts.sans.regular, textAlign: "center", lineHeight: 17 },
  errorBox: { flexDirection: "row", gap: 8, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 12 },
  errorText: { flex: 1, fontSize: 12, fontFamily: fonts.sans.semibold, lineHeight: 17 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 20 },
  scheduleModal: { width: "100%", borderRadius: 20, padding: 18 },
  modalTitle: { fontSize: 18, fontFamily: fonts.serif.extra },
  modalSub: { fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 4, marginBottom: 14 },
  scheduleInput: { height: 48, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 14, fontFamily: fonts.sans.medium },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  modalBtn: { flex: 1, height: 44, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  modalBtnText: { fontSize: 13, fontFamily: fonts.sans.bold },
});
