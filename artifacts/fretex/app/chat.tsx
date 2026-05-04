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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import colors, { fonts, shadows } from "@/constants/colors";

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

/* ── Mock threads por conversa ── */
const MOCK_THREADS: Record<string, Msg[]> = {
  "c-1": [
    { id: "1", text: "Oi! Estou a caminho do seu endereço.", from: "them", time: "14:20", read: true },
    { id: "2", text: "Ótimo! Pode chamar quando chegar.", from: "me", time: "14:21", read: true },
    { id: "3", text: "Cheguei no portão. Pode descer?", from: "them", time: "14:32", read: false },
  ],
  "c-2": [
    { id: "1", text: "Olá! Vi sua solicitação de frete.", from: "them", time: "10:05", read: true },
    { id: "2", text: "Sim! Preciso transportar móveis para Tijuca.", from: "me", time: "10:07", read: true },
    { id: "3", text: "Tenho disponibilidade amanhã às 9h. Posso fazer por R$120.", from: "them", time: "10:10", read: true },
    { id: "4", text: "Combinado, até logo!", from: "me", time: "10:12", read: true },
  ],
  "c-3": [
    { id: "1", text: "Boa tarde! Seu pedido foi entregue.", from: "them", time: "16:45", read: true },
    { id: "2", text: "Foto da entrega enviada.", from: "them", time: "16:46", read: true },
    { id: "3", text: "Obrigado!", from: "me", time: "16:50", read: true },
  ],
  "c-4": [
    { id: "1", text: "Oi, tudo bem? Vi seu anúncio.", from: "me", time: "11:00", read: true },
    { id: "2", text: "Tudo sim! Posso fazer por R$60, traço orçamento completo?", from: "them", time: "11:03", read: true },
  ],
  "p-1": [
    { id: "1", text: "Bom dia! Pedido confirmado para hoje.", from: "me", time: "09:00", read: true },
    { id: "2", text: "Perfeito! Vou precisar de acesso ao elevador.", from: "them", time: "09:05", read: true },
    { id: "3", text: "Pode subir o material?", from: "them", time: "11:20", read: false },
    { id: "4", text: "Olha, preciso de 3 pessoas para o piano.", from: "them", time: "11:21", read: false },
  ],
  "p-2": [
    { id: "1", text: "Olá! Vi seu perfil no Ajudaê.", from: "them", time: "08:30", read: true },
    { id: "2", text: "Tenho disponibilidade para sexta.", from: "me", time: "08:35", read: true },
    { id: "3", text: "Aceito sua proposta de R$120.", from: "them", time: "08:40", read: false },
  ],
  "p-3": [
    { id: "1", text: "Serviço concluído com sucesso!", from: "me", time: "17:00", read: true },
    { id: "2", text: "Obrigado pelo serviço!", from: "them", time: "17:10", read: true },
  ],
  "p-4": [
    { id: "1", text: "Confirmado para amanhã às 19h.", from: "me", time: "14:00", read: true },
    { id: "2", text: "Confirmado para às 19h.", from: "them", time: "14:05", read: true },
  ],
  support: [
    { id: "1", text: "Olá! Bem-vindo ao suporte Ajudaê. Como posso ajudar?", from: "them", time: "09:00", read: true },
  ],
  financial: [
    { id: "1", text: "Olá! Sou da equipe financeira. Como posso ajudar com sua cobrança?", from: "them", time: "09:00", read: true },
  ],
  provider_support: [
    { id: "1", text: "Canal exclusivo para prestadores 24/7. Como posso ajudar?", from: "them", time: "09:00", read: true },
  ],
};

/* ── Auto-replies mock por contexto ── */
const AUTO_REPLIES: Record<string, string[]> = {
  support: [
    "Entendido! Vou verificar isso para você.",
    "Pode me dar mais detalhes sobre o problema?",
    "Estou consultando nossa equipe. Um momento.",
    "Resolvido! Há algo mais que posso ajudar?",
  ],
  financial: [
    "Verificando seu histórico de pagamentos...",
    "Identifiquei o registro. Pode confirmar a data do serviço?",
    "O repasse é processado em até 2 dias úteis.",
    "Emiti o comprovante, verifique seu email.",
  ],
  provider_support: [
    "Canal 24/7 ativo. Qual é sua dúvida?",
    "Estou verificando sua conta de prestador.",
    "Encontrei sua solicitação. Vou escalar para o time.",
    "Resolvido! Qualquer dúvida, estamos aqui.",
  ],
  dm: [
    "Ok, perfeito!",
    "Combinado.",
    "Pode deixar.",
    "Estou a caminho.",
    "Entendido, sem problema.",
  ],
};

const QUICK_REPLIES_SUPPORT = [
  "Preciso de ajuda com um pedido",
  "Problema com pagamento",
  "Questão de segurança",
  "Outro assunto",
];

const QUICK_REPLIES_DM = [
  "Ok!",
  "Combinado",
  "Onde você está?",
  "Pode confirmar o endereço?",
];

export default function ChatScreen() {
  const c = colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id, name, ini, color, type } = useLocalSearchParams<{
    id: string;
    name: string;
    ini: string;
    color: string;
    type: "dm" | "support" | "financial" | "provider_support";
  }>();

  const chatColor = color || "#FF5500";
  const chatType = type || "dm";
  const threadKey = id || chatType;

  const [messages, setMessages] = useState<Msg[]>(
    MOCK_THREADS[threadKey] || MOCK_THREADS[chatType] || []
  );
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const replyIdx = useRef(0);

  const isSupport = chatType !== "dm";
  const accent = isSupport ? c.blue : chatColor;
  const quickReplies = isSupport ? QUICK_REPLIES_SUPPORT : QUICK_REPLIES_DM;
  const autoReplies = AUTO_REPLIES[chatType] || AUTO_REPLIES.dm;

  useEffect(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  }, []);

  const send = (msg: string) => {
    if (!msg.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newMsg: Msg = {
      id: Date.now().toString(),
      text: msg.trim(),
      from: "me",
      time: now(),
      read: false,
    };
    setMessages((prev) => [...prev, newMsg]);
    setText("");
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);

    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const reply: Msg = {
        id: (Date.now() + 1).toString(),
        text: autoReplies[replyIdx.current % autoReplies.length],
        from: "them",
        time: now(),
        read: false,
      };
      replyIdx.current += 1;
      setMessages((prev) => [...prev, reply]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1500 + Math.random() * 1000);
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
        <View style={[msgStyles.bubble, isMe ? [msgStyles.bubbleMe, { backgroundColor: accent }] : [msgStyles.bubbleThem, { backgroundColor: c.card, borderColor: c.borderLight }]]}>
          <Text style={[msgStyles.bubbleText, { color: isMe ? "#fff" : c.text }]}>{item.text}</Text>
          <View style={msgStyles.bubbleMeta}>
            <Text style={[msgStyles.bubbleTime, { color: isMe ? "rgba(255,255,255,0.6)" : c.softMuted }]}>{item.time}</Text>
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
            {typing ? "digitando..." : "online"}
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
          ListFooterComponent={
            typing ? (
              <View style={[msgStyles.row]}>
                <View style={msgStyles.avatar}>
                  <View style={[msgStyles.avatarCircle, { backgroundColor: accent }]}>
                    {isSupport ? (
                      <Ionicons name="headset" size={14} color="#fff" />
                    ) : (
                      <Text style={msgStyles.avatarIni}>{(ini || "?").charAt(0)}</Text>
                    )}
                  </View>
                </View>
                <View style={[msgStyles.bubble, msgStyles.bubbleThem, { backgroundColor: c.card, borderColor: c.borderLight }]}>
                  <View style={msgStyles.typingDots}>
                    {[0, 1, 2].map((i) => (
                      <View key={i} style={[msgStyles.dot, { backgroundColor: c.softMuted }]} />
                    ))}
                  </View>
                </View>
              </View>
            ) : null
          }
        />

        {/* Quick replies */}
        {messages.length <= 3 && (
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

        {/* Input */}
        <View style={[chatStyles.inputBar, { backgroundColor: c.card, borderTopColor: c.border, paddingBottom: insets.bottom || 16 }]}>
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
            disabled={!text.trim()}
            style={[chatStyles.sendBtn, { backgroundColor: text.trim() ? accent : c.borderLight }]}
          >
            <Ionicons name="send" size={16} color={text.trim() ? "#fff" : c.softMuted} />
          </Pressable>
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
