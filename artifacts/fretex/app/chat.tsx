import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import colors, { fonts, shadows } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { fetchQuickMessages, sendQuickMessage, type QuickMessageRow } from "@/lib/quickMessages";
import { fetchServiceChatDetails, type ServiceChatDetails } from "@/lib/serviceChats";

interface Msg {
  id: string;
  text: string;
  from: "me" | "them";
  time: string;
  read?: boolean;
}

const now = () => {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

const formatTime = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return now();
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};


const QUICK_REPLIES_DM = [
  "Ok!",
  "Combinado",
  "Onde você está?",
  "Pode confirmar o endereço?",
];

const readOnlyStatuses = new Set(["completed", "cancelled", "disputed"]);
const openChatStatuses = new Set(["accepted", "en_route", "in_progress", "completed", "cancelled", "disputed"]);
const serviceStatusLabels: Record<string, string> = {
  accepted: "Aceito",
  en_route: "Em rota",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
  disputed: "Em disputa",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Agora";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Agora";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatPrice = (value: number | null) => {
  if (!value) return "A combinar";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export default function ChatScreen() {
  const c = colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id, name, ini, color, type, requestId } = useLocalSearchParams<{
    id: string;
    name: string;
    ini: string;
    color: string;
    type: "dm" | "support" | "financial" | "provider_support";
    requestId?: string;
  }>();

  const chatColor = color || "#FF5500";
  const chatType = type || "dm";
  const threadKey = id || chatType;
  const realtimeRequestId = requestId || "";
  const isRealtimeChat = Boolean(realtimeRequestId && user?.id);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [service, setService] = useState<ServiceChatDetails | null>(null);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceOpen, setServiceOpen] = useState(true);
  const flatRef = useRef<FlatList>(null);

  const isSupport = chatType !== "dm";
  const accent = isSupport ? c.blue : chatColor;
  const quickReplies = QUICK_REPLIES_DM;
  const isBlockedDm = chatType === "dm" && !isRealtimeChat;
  const serviceReadOnly = Boolean(service && readOnlyStatuses.has(service.status));
  const canSend = !isSupport && !isBlockedDm && !serviceReadOnly && (!isRealtimeChat || Boolean(service && !serviceError));

  const mapRowToMessage = (row: QuickMessageRow): Msg => ({
    id: row.id,
    text: row.message,
    from: row.sender_id === user?.id ? "me" : "them",
    time: formatTime(row.created_at),
    read: true,
  });

  useEffect(() => {
    if (!isRealtimeChat || !user?.id) {
      setService(null);
      setServiceError(null);
      return;
    }

    let mounted = true;
    setServiceLoading(true);
    setServiceError(null);
    fetchServiceChatDetails(realtimeRequestId, user.id)
      .then((details) => {
        if (!mounted) return;
        if (!details || !openChatStatuses.has(details.status)) {
          setService(null);
          setServiceError("Chat indisponível para este serviço.");
          return;
        }
        setService(details);
      })
      .catch(() => {
        if (mounted) setServiceError("Não foi possível carregar os dados do serviço.");
      })
      .finally(() => {
        if (mounted) setServiceLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isRealtimeChat, realtimeRequestId, user?.id]);

  useEffect(() => {
    if (!isRealtimeChat) {
      setMessages([]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
      return;
    }

    let mounted = true;
    fetchQuickMessages(realtimeRequestId)
      .then((rows) => {
        if (!mounted) return;
        setMessages(rows.map(mapRowToMessage));
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
      })
      .catch(() => {
        if (mounted) setMessages([]);
      });

    const channel = supabase
      .channel(`quick-messages:${realtimeRequestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quick_messages",
          filter: `request_id=eq.${realtimeRequestId}`,
        },
        (payload) => {
          const row = payload.new as QuickMessageRow;
          setMessages((prev) => {
            if (prev.some((item) => item.id === row.id)) return prev;
            return [...prev, mapRowToMessage(row)];
          });
          setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [chatType, isRealtimeChat, realtimeRequestId, threadKey, user?.id]);

  const send = async (msg: string) => {
    if (!canSend) return;
    if (!msg.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const clean = msg.trim();
    setText("");

    if (isRealtimeChat && user?.id) {
      try {
        const row = await sendQuickMessage(realtimeRequestId, user.id, clean);
        setMessages((prev) => {
          if (prev.some((item) => item.id === row.id)) return prev;
          return [...prev, mapRowToMessage(row)];
        });
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `local-error-${Date.now()}`,
            text: "Não foi possível enviar. Tente novamente.",
            from: "them",
            time: now(),
            read: false,
          },
        ]);
      }
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

  };

  const renderMsg = ({ item, index }: { item: Msg; index: number }) => {
    const isMe = item.from === "me";
    const prevItem = messages[index - 1];
    const showAvatar = !isMe && (!prevItem || prevItem.from === "me");

    return (
      <View style={[msgStyles.row, isMe && msgStyles.rowMe]}>
        {!isMe && (
          <View style={[msgStyles.avatar, showAvatar ? {} : { opacity: 0 }]}>
            {isSupport ? (
              <View style={[msgStyles.avatarCircle, { backgroundColor: accent }]}>
                <Ionicons name="headset" size={14} color="#fff" />
              </View>
            ) : (
              <LinearGradient
                colors={[chatColor, `${chatColor}AA`]}
                style={msgStyles.avatarCircle}
              >
                <Text style={msgStyles.avatarIni}>{(ini || "?").charAt(0)}</Text>
              </LinearGradient>
            )}
          </View>
        )}
        <View style={[msgStyles.bubble, isMe ? [msgStyles.bubbleMe, { backgroundColor: isSupport ? accent : c.primary }] : [msgStyles.bubbleThem, { backgroundColor: c.card, borderColor: c.borderLight }]]}>
          <Text style={[msgStyles.bubbleText, { color: isMe ? (isSupport ? "#fff" : c.text) : c.text }]}>{item.text}</Text>
          <View style={msgStyles.bubbleMeta}>
            <Text style={[msgStyles.bubbleTime, { color: isMe ? (isSupport ? "rgba(255,255,255,0.6)" : `${c.text}80`) : c.softMuted }]}>{item.time}</Text>
            {isMe && (
              <Ionicons name={item.read ? "checkmark-done" : "checkmark"} size={12} color="rgba(255,255,255,0.6)" style={{ marginLeft: 3 }} />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={[chatStyles.header, { paddingTop: insets.top + 8, backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} style={chatStyles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </Pressable>
        <View style={chatStyles.headerAvatar}>
          {isSupport ? (
            <View style={[chatStyles.headerAvatarCircle, { backgroundColor: accent }]}>
              <Ionicons name="headset" size={18} color="#fff" />
            </View>
          ) : (
            <LinearGradient colors={[chatColor, `${chatColor}AA`]} style={chatStyles.headerAvatarCircle}>
              <Text style={chatStyles.headerIni}>{ini || "?"}</Text>
            </LinearGradient>
          )}
          <View style={[chatStyles.onlineDot, { backgroundColor: c.success, borderColor: c.card }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[chatStyles.headerName, { color: c.text }]} numberOfLines={1}>{name || "Suporte"}</Text>
          <Text style={[chatStyles.headerSub, { color: c.success }]}>
            {isSupport ? "suporte via ticket" : serviceLoading ? "carregando serviço" : service ? (serviceStatusLabels[service.status] ?? service.status) : "chat bloqueado"}
          </Text>
        </View>
        {isSupport && (
          <Pressable style={[chatStyles.headerAction, { backgroundColor: c.background, borderColor: c.borderLight }]}>
            <Ionicons name="call-outline" size={16} color={c.text} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMsg}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            isSupport ? (
              <View style={[chatStyles.blockedState, { backgroundColor: c.card, borderColor: c.border }]}>
                <Ionicons name="ticket-outline" size={20} color={c.softMuted} />
                <Text style={[chatStyles.blockedTitle, { color: c.text }]}>Suporte via Ticket</Text>
                <Text style={[chatStyles.blockedText, { color: c.softMuted }]}>
                  Para falar com o suporte, abra um ticket na tela de suporte. Nossa equipe responde em até 24h.
                </Text>
              </View>
            ) : isBlockedDm || serviceError ? (
              <View style={[chatStyles.blockedState, { backgroundColor: c.card, borderColor: c.border }]}>
                <Ionicons name="lock-closed" size={20} color={c.softMuted} />
                <Text style={[chatStyles.blockedTitle, { color: c.text }]}>Chat indisponível</Text>
                <Text style={[chatStyles.blockedText, { color: c.softMuted }]}>
                  {serviceError ?? "O chat só abre após uma proposta aceita ou um serviço agendado."}
                </Text>
              </View>
            ) : null
          }
        />

        {service ? (
          <View style={[chatStyles.serviceSheet, { backgroundColor: c.card, borderColor: c.border }]}>
            <Pressable style={chatStyles.serviceSheetHead} onPress={() => setServiceOpen((value) => !value)}>
              <View style={{ flex: 1 }}>
                <Text style={[chatStyles.serviceSheetTitle, { color: c.text }]} numberOfLines={1}>
                  {service.category} · {serviceStatusLabels[service.status] ?? service.status}
                </Text>
                <Text style={[chatStyles.serviceSheetSub, { color: c.softMuted }]} numberOfLines={1}>
                  {formatPrice(service.price)} · {formatDateTime(service.scheduled_for)}
                </Text>
              </View>
              <Ionicons name={serviceOpen ? "chevron-down" : "chevron-up"} size={18} color={c.softMuted} />
            </Pressable>
            {serviceOpen ? (
              <View style={chatStyles.serviceSheetBody}>
                <View style={chatStyles.serviceInfoRow}>
                  <Text style={[chatStyles.serviceInfoLabel, { color: c.softMuted }]}>Cliente</Text>
                  <Text style={[chatStyles.serviceInfoValue, { color: c.text }]}>{service.client_name}</Text>
                </View>
                <View style={chatStyles.serviceInfoRow}>
                  <Text style={[chatStyles.serviceInfoLabel, { color: c.softMuted }]}>Prestador</Text>
                  <Text style={[chatStyles.serviceInfoValue, { color: c.text }]}>{service.provider_name}</Text>
                </View>
                <View style={chatStyles.serviceInfoRow}>
                  <Text style={[chatStyles.serviceInfoLabel, { color: c.softMuted }]}>Origem</Text>
                  <Text style={[chatStyles.serviceInfoValue, { color: c.text }]}>{service.address_origin}</Text>
                </View>
                {service.address_dest ? (
                  <View style={chatStyles.serviceInfoRow}>
                    <Text style={[chatStyles.serviceInfoLabel, { color: c.softMuted }]}>Destino</Text>
                    <Text style={[chatStyles.serviceInfoValue, { color: c.text }]}>{service.address_dest}</Text>
                  </View>
                ) : null}
                {service.description ? (
                  <View style={chatStyles.serviceInfoRow}>
                    <Text style={[chatStyles.serviceInfoLabel, { color: c.softMuted }]}>Detalhes</Text>
                    <Text style={[chatStyles.serviceInfoValue, { color: c.text }]}>{service.description}</Text>
                  </View>
                ) : null}
                <View style={chatStyles.serviceInfoRow}>
                  <Text style={[chatStyles.serviceInfoLabel, { color: c.softMuted }]}>Ajudante</Text>
                  <Text style={[chatStyles.serviceInfoValue, { color: c.text }]}>{service.needs_helper ? "Sim" : "Não"}</Text>
                </View>
                {service.media_urls.length > 0 ? (
                  <Text style={[chatStyles.serviceSheetSub, { color: c.softMuted }]}>
                    {service.media_urls.length} foto(s) anexada(s)
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {messages.length <= 3 && canSend && (
          <View style={chatStyles.quickWrap}>
            {quickReplies.map((q) => (
              <Pressable
                key={q}
                onPress={() => send(q)}
                style={[chatStyles.quickChip, { backgroundColor: c.card, borderColor: c.borderLight }]}
              >
                <Text style={[chatStyles.quickText, { color: c.text }]}>{q}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={[chatStyles.inputBar, { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: insets.bottom || 16 }]}>
          {!canSend ? (
            <View style={[chatStyles.readOnlyBar, { backgroundColor: c.background, borderColor: c.borderLight }]}>
              <Ionicons name="lock-closed" size={15} color={c.softMuted} />
              <Text style={[chatStyles.readOnlyText, { color: c.softMuted }]}>
                {serviceReadOnly ? "Histórico visível. Envio desabilitado." : "Chat liberado apenas para serviço aceito ou agendado."}
              </Text>
            </View>
          ) : (
            <>
          <View style={[chatStyles.inputWrap, { backgroundColor: c.background, borderColor: c.borderLight }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Mensagem..."
              placeholderTextColor={c.softMuted}
              style={[chatStyles.input, { color: c.text }]}
              multiline
              maxLength={500}
              onSubmitEditing={() => send(text)}
            />
          </View>
          <Pressable
            onPress={() => send(text)}
            disabled={!text.trim() || !canSend}
            style={[chatStyles.sendBtn, { backgroundColor: text.trim() ? accent : c.borderLight }]}
          >
            <Ionicons name="send" size={16} color={text.trim() ? "#fff" : c.softMuted} />
          </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const chatStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerAvatar: { position: "relative" },
  headerAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIni: { color: "#fff", fontSize: 14, fontFamily: fonts.serif.extra },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
  },
  headerName: { fontSize: 15, fontFamily: fonts.sans.bold },
  headerSub: { fontSize: 11, fontFamily: fonts.sans.medium, marginTop: 1 },
  headerAction: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  blockedState: {
    marginTop: 28,
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    gap: 8,
  },
  blockedTitle: { fontSize: 14, fontFamily: fonts.sans.bold },
  blockedText: { fontSize: 12, fontFamily: fonts.sans.regular, textAlign: "center", lineHeight: 17 },
  serviceSheet: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  serviceSheetHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  serviceSheetTitle: { fontSize: 13, fontFamily: fonts.sans.bold },
  serviceSheetSub: { fontSize: 11, fontFamily: fonts.sans.medium, marginTop: 2 },
  serviceSheetBody: { paddingHorizontal: 14, paddingBottom: 12, gap: 8 },
  serviceInfoRow: { gap: 2 },
  serviceInfoLabel: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.5 },
  serviceInfoValue: { fontSize: 12, fontFamily: fonts.sans.medium, lineHeight: 17 },
  quickWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  quickText: { fontSize: 12, fontFamily: fonts.sans.medium },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  inputWrap: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
  },
  input: {
    fontSize: 14,
    fontFamily: fonts.sans.regular,
    letterSpacing: 0,
    lineHeight: 20,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  readOnlyBar: {
    flex: 1,
    minHeight: 42,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  readOnlyText: { flex: 1, fontSize: 12, fontFamily: fonts.sans.medium },
});

const msgStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 6 },
  rowMe: { flexDirection: "row-reverse" },
  avatar: { width: 28 },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarIni: { color: "#fff", fontSize: 11, fontFamily: fonts.serif.extra },
  bubble: {
    maxWidth: "72%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  bubbleMe: {
    borderRadius: 16,
    borderBottomRightRadius: 4,
    borderWidth: 0,
  },
  bubbleThem: {
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, fontFamily: fonts.sans.regular, lineHeight: 20, letterSpacing: 0 },
  bubbleMeta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 3 },
  bubbleTime: { fontSize: 10, fontFamily: fonts.sans.regular },
  typingDots: { flexDirection: "row", gap: 4, padding: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
