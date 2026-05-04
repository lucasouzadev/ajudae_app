import React, { useState, useEffect, useRef } from "react";
import { IS_DEMO } from "@/constants/env";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ScrollView,
  Animated,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import colors, { fonts, shadows } from "@/constants/colors";

const LGPD_KEY = "ajudae_lgpd_accepted";

/* ─── Security & formatting helpers ─────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ERROR_COLOR = "#DC2626";

function sanitize(raw: string): string {
  return raw.replace(/<[^>]*>/g, "").replace(/[<>"'`\\]/g, "").trimStart();
}

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d)/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}

function maskCPF(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function validateCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
  let rem = sum % 11;
  const d1 = rem < 2 ? 0 : 11 - rem;
  if (d1 !== parseInt(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
  rem = sum % 11;
  return (rem < 2 ? 0 : 11 - rem) === parseInt(c[10]);
}

function isFullName(name: string): boolean {
  const words = name.trim().split(/\s+/).filter((w) => w.length >= 2);
  return words.length >= 2;
}

type StrengthLevel = { score: number; label: string; color: string };
function passwordStrength(p: string): StrengthLevel {
  if (!p) return { score: 0, label: "", color: "" };
  let score = 0;
  if (p.length >= 8) score++;
  if (/[a-z]/.test(p)) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?`~]/.test(p)) score++;
  if (score <= 1) return { score: 1, label: "Muito fraca", color: "#DC2626" };
  if (score === 2) return { score: 2, label: "Fraca", color: "#F97316" };
  if (score === 3) return { score: 3, label: "Média", color: "#EAB308" };
  if (score === 4) return { score: 4, label: "Forte", color: "#22C55E" };
  return { score: 5, label: "Muito forte", color: "#16A34A" };
}

function mapAuthError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("Invalid login credentials"))  return "E-mail ou senha incorretos.";
  if (msg.includes("Email not confirmed"))         return "Confirme seu e-mail antes de entrar.";
  if (msg.includes("already registered") || msg.includes("already been registered"))
    return "Este e-mail já está cadastrado.";
  if (msg.includes("weak") || msg.includes("Password should contain"))
    return "Senha fraca — use maiúscula, minúscula, número e símbolo (ex: Senha@123).";
  if (msg.includes("Password should be at least")) return "Senha muito curta — mínimo 6 caracteres.";
  if (msg.includes("Invalid API key") || msg.includes("Invalid Refresh Token"))
    return "Sessão expirada. Feche o app e abra novamente.";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Muitas tentativas. Aguarde alguns minutos.";
  if (msg.includes("Network") || msg.includes("fetch"))
    return "Sem conexão. Verifique sua internet.";
  if (msg.includes("PGRST") || msg.includes("schema cache"))
    return "Erro interno. Tente novamente em instantes.";
  return "Algo deu errado. Tente novamente.";
}

/* ─── UI helpers ─────────────────────────────────────────────────────── */
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 }}>
      <Ionicons name="alert-circle" size={12} color={ERROR_COLOR} />
      <Text style={{ fontSize: 11, fontFamily: fonts.sans.medium, color: ERROR_COLOR }}>{msg}</Text>
    </View>
  );
}

function ErrorBanner({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1,
      borderRadius: 12, padding: 12, marginBottom: 16,
    }}>
      <Ionicons name="warning" size={16} color="#DC2626" />
      <Text style={{ flex: 1, fontSize: 13, fontFamily: fonts.sans.medium, color: "#991B1B" }}>{msg}</Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Ionicons name="close" size={15} color="#DC2626" />
      </Pressable>
    </View>
  );
}

function PasswordStrengthBar({ password }: { password: string }) {
  const str = passwordStrength(password);
  if (!password) return null;
  return (
    <View style={{ marginTop: 8, gap: 4 }}>
      <View style={{ flexDirection: "row", gap: 3 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={{
              flex: 1, height: 3, borderRadius: 2,
              backgroundColor: i <= str.score ? str.color : "#E5E7EB",
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: 10, fontFamily: fonts.sans.medium, color: str.color }}>{str.label}</Text>
    </View>
  );
}

/* ─── LGPD Bottom Sheet ──────────────────────────────────────────────── */
function LGPDSheet({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(500)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 14, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = (cb: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 600, duration: 260, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(cb);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)", opacity: backdropAnim }]}
        pointerEvents="none"
      />

      {/* Sheet */}
      <Animated.View
        style={[
          lgpdStyles.sheet,
          {
            backgroundColor: c.card,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY: slideAnim }],
          },
          shadows.xl,
        ]}
      >
        {/* Handle */}
        <View style={[lgpdStyles.handle, { backgroundColor: c.border }]} />

        {/* Icon */}
        <View style={[lgpdStyles.iconWrap, { backgroundColor: `${c.primary}18` }]}>
          <Ionicons name="shield-checkmark" size={26} color={c.primary} />
        </View>

        <Text style={[lgpdStyles.title, { color: c.text }]}>
          Política de privacidade{"\n"}e Termos de Uso
        </Text>

        <ScrollView
          style={lgpdStyles.bodyScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          <Text style={[lgpdStyles.body, { color: c.sub }]}>
            Antes de usar o Ajudaê!, leia atentamente os{" "}
            <Text style={{ fontFamily: fonts.sans.bold, color: c.text }}>Termos de Uso</Text>,
            as regras da plataforma e a{" "}
            <Text style={{ fontFamily: fonts.sans.bold, color: c.text }}>Política de Privacidade</Text>.
            {"\n\n"}
            Ao tocar em "Concordo", você confirma que leu, entendeu e concorda em agir de acordo com os termos.
            {"\n\n"}
            A Política de Privacidade aborda principalmente como coletamos e usamos informações pessoais, como seu número de telefone, nome, dados dos seus pedidos, localização, detalhes dos serviços e permissões do dispositivo — em conformidade com a{" "}
            <Text style={{ fontFamily: fonts.sans.bold, color: c.text }}>LGPD (Lei 13.709/2018)</Text>.
          </Text>

          <Pressable onPress={() => Linking.openURL("https://ajudaeh.com.br/privacidade")} style={lgpdStyles.linkRow}>
            <Text style={[lgpdStyles.link, { color: c.blue }]}>Política de Privacidade e Termos de Uso</Text>
            <Ionicons name="open-outline" size={13} color={c.blue} />
          </Pressable>
        </ScrollView>

        {/* Actions */}
        <View style={lgpdStyles.actions}>
          <Pressable
            onPress={() => dismiss(onAccept)}
            style={[lgpdStyles.acceptBtn, { backgroundColor: c.primary }, shadows.md, { shadowColor: c.primary, shadowOpacity: 0.3 }]}
          >
            <Ionicons name="checkmark-circle" size={18} color="#1A1714" />
            <Text style={[lgpdStyles.acceptText, { color: "#1A1714" }]}>Concordo</Text>
          </Pressable>

          <Pressable
            onPress={() => dismiss(onDecline)}
            style={[lgpdStyles.declineBtn, { backgroundColor: c.background }]}
          >
            <Text style={[lgpdStyles.declineText, { color: c.sub }]}>Sair</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const lgpdStyles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 14,
    maxHeight: "82%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 22, fontFamily: fonts.serif.extra, lineHeight: 28, marginBottom: 14 },
  bodyScroll: { maxHeight: 200, marginBottom: 20 },
  body: { fontSize: 13, fontFamily: fonts.sans.regular, lineHeight: 20 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 14 },
  link: { fontSize: 13, fontFamily: fonts.sans.semibold, textDecorationLine: "underline" },
  actions: { gap: 10 },
  acceptBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  acceptText: { fontSize: 16, fontFamily: fonts.sans.extra },
  declineBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  declineText: { fontSize: 15, fontFamily: fonts.sans.bold },
});

/* ─── Main Auth Screen ───────────────────────────────────────────────── */
type Screen = "lobby" | "login" | "signup-role" | "signup-form";

export default function AuthScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { login, signup } = useAuth();

  const [screen, setScreen] = useState<Screen>("lobby");
  const [role, setRole] = useState<"cliente" | "prestador">("cliente");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [lgpdChecked, setLgpdChecked] = useState(false);
  const [showLGPD, setShowLGPD] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");

  const accent = role === "cliente" ? c.primary : c.blue;
  const accentText = role === "cliente" ? "#1A1714" : "#fff";

  useEffect(() => {
    AsyncStorage.getItem(LGPD_KEY).then((val) => {
      if (!val) setShowLGPD(true);
      setLgpdChecked(true);
    });
  }, []);

  const handleLGPDAccept = async () => {
    await AsyncStorage.setItem(LGPD_KEY, "1");
    setShowLGPD(false);
  };

  const handleLGPDDecline = () => {
    // Em produção: fechar o app. Em demo: apenas fecha o sheet.
    setShowLGPD(false);
  };

  const clearScreen = (s: Screen) => {
    setFieldErrors({});
    setApiError("");
    setScreen(s);
  };

  const handleLogin = async () => {
    const errs: Record<string, string> = {};
    const cleanEmail = sanitize(email).toLowerCase().trim();
    const cleanSenha = senha.trim();

    if (!cleanEmail) errs.email = "Informe seu e-mail.";
    else if (!EMAIL_RE.test(cleanEmail)) errs.email = "E-mail inválido.";
    if (!cleanSenha) errs.senha = "Informe sua senha.";
    else if (cleanSenha.length < 6) errs.senha = "Senha com no mínimo 6 caracteres.";

    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setApiError("");
    setLoading(true);
    try {
      await login(
        IS_DEMO ? (cleanEmail || "ricardo@ajudae.app") : cleanEmail,
        IS_DEMO ? (cleanSenha || "123456") : cleanSenha,
      );
    } catch (e) {
      setApiError(mapAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    const errs: Record<string, string> = {};
    const cleanNome  = sanitize(nome).trim();
    const cleanEmail = sanitize(email).toLowerCase().trim();
    const cleanTel   = telefone.replace(/\D/g, "");
    const cleanCpf   = cpf.replace(/\D/g, "");
    const cleanSenha = senha;
    const str        = passwordStrength(cleanSenha);

    if (!cleanNome)                           errs.nome = "Nome completo obrigatório.";
    else if (!isFullName(cleanNome))          errs.nome = "Informe nome e sobrenome (mín. 2 palavras).";
    else if (cleanNome.length > 100)          errs.nome = "Nome muito longo (máx. 100 caracteres).";

    if (!cleanCpf)                            errs.cpf = "CPF obrigatório.";
    else if (!validateCPF(cleanCpf))          errs.cpf = "CPF inválido.";

    if (!cleanEmail)                          errs.email = "Informe seu e-mail.";
    else if (!EMAIL_RE.test(cleanEmail))      errs.email = "E-mail inválido.";

    if (!cleanTel)                            errs.telefone = "Informe seu telefone.";
    else if (cleanTel.length < 10 || cleanTel.length > 11)
      errs.telefone = "Telefone inválido — use DDD + número.";

    if (!cleanSenha)                          errs.senha = "Crie uma senha.";
    else if (cleanSenha.length < 8)           errs.senha = "Senha com no mínimo 8 caracteres.";
    else if (str.score < 4)                   errs.senha = "Senha fraca — use maiúscula, minúscula, número e símbolo.";
    else if (cleanSenha.length > 72)          errs.senha = "Senha muito longa (máx. 72 caracteres).";

    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setApiError("");
    setLoading(true);
    try {
      await signup(
        IS_DEMO ? (cleanNome || "Novo Usuário") : cleanNome,
        IS_DEMO ? (cleanEmail || "novo@ajudae.app") : cleanEmail,
        IS_DEMO ? (cleanTel || "21999999999") : cleanTel,
        IS_DEMO ? (cleanSenha || "Senha@123") : cleanSenha,
        role,
        cleanCpf || undefined,
      );
    } catch (e) {
      setApiError(mapAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  if (!lgpdChecked) return null;

  /* ── Lobby ── */
  if (screen === "lobby") {
    return (
      <View style={[s.screen, { backgroundColor: c.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Brand mark */}
        <View style={s.lobbyBrand}>
          <View style={[s.lobbyIcon, { backgroundColor: c.primary }]}>
            <Ionicons name="cube" size={22} color="#1A1714" />
          </View>
          <Text style={[s.lobbyWordmark, { color: c.text }]}>Ajudaê!</Text>
        </View>

        <View style={s.lobbyTagRow}>
          <Text style={[s.lobbyTag, { color: c.sub }]}>Frete · Mudança · Entrega</Text>
        </View>

        {/* Actions */}
        <View style={s.lobbyActions}>
          <Pressable
            onPress={() => setScreen("login")}
            style={[s.lobbyPrimary, { backgroundColor: c.primary }]}
          >
            <Text style={[s.lobbyPrimaryText, { color: "#1A1714" }]}>Entrar</Text>
            <Ionicons name="arrow-forward" size={16} color="#1A1714" />
          </Pressable>

          <Pressable
            onPress={() => setScreen("signup-role")}
            style={[s.lobbySecondary, { backgroundColor: c.card, borderColor: c.border }]}
          >
            <Text style={[s.lobbySecondaryText, { color: c.text }]}>Criar conta</Text>
          </Pressable>
        </View>

        <Text style={[s.terms, { color: c.softMuted }]}>
          Ao continuar, você concorda com os{" "}
          <Text style={{ color: c.sub }}>Termos de Uso</Text> e a{" "}
          <Text style={{ color: c.sub }}>Política de Privacidade</Text>.
        </Text>

        {showLGPD && (
          <LGPDSheet onAccept={handleLGPDAccept} onDecline={handleLGPDDecline} />
        )}
      </View>
    );
  }

  /* ── Login ── */
  if (screen === "login") {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={[s.formScroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Nav */}
              <Pressable onPress={() => clearScreen("lobby")} style={s.backBtn}>
                <Ionicons name="chevron-back" size={18} color={c.text} />
              </Pressable>

              <Text style={[s.formTitle, { color: c.text }]}>Entrar</Text>
              <Text style={[s.formSub, { color: c.sub }]}>Bem-vindo de volta.</Text>

              {apiError ? <ErrorBanner msg={apiError} onDismiss={() => setApiError("")} /> : null}

              <Text style={[s.label, { color: c.softMuted }]}>EMAIL</Text>
              <TextInput
                value={email}
                onChangeText={(t) => { setEmail(sanitize(t)); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" })); }}
                onBlur={() => { setEmail((v) => v.toLowerCase().trim()); }}
                placeholder="voce@email.com"
                placeholderTextColor={c.softMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={254}
                returnKeyType="next"
                style={[s.input, { backgroundColor: c.card, borderColor: fieldErrors.email ? "#DC2626" : c.border, color: c.text }]}
              />
              <FieldError msg={fieldErrors.email} />

              <Text style={[s.label, { color: c.softMuted }]}>SENHA</Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  value={senha}
                  onChangeText={(t) => { setSenha(t); if (fieldErrors.senha) setFieldErrors((p) => ({ ...p, senha: "" })); }}
                  placeholder="••••••"
                  placeholderTextColor={c.softMuted}
                  secureTextEntry={!showPassword}
                  maxLength={72}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  style={[s.input, { backgroundColor: c.card, borderColor: fieldErrors.senha ? "#DC2626" : c.border, color: c.text, paddingRight: 48 }]}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                  style={{ position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" }}
                >
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={c.softMuted} />
                </Pressable>
              </View>
              <FieldError msg={fieldErrors.senha} />

              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={[s.cta, { backgroundColor: c.primary }, shadows.md, { shadowColor: c.primary, shadowOpacity: 0.3 }]}
              >
                <Text style={[s.ctaText, { color: "#1A1714" }]}>
                  {loading ? "Entrando..." : "Entrar"}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#1A1714" />
              </Pressable>

              <Pressable onPress={() => clearScreen("signup-role")} style={{ marginTop: 20, alignSelf: "center" }}>
                <Text style={[s.switchLink, { color: c.sub }]}>
                  Não tem conta?{" "}
                  <Text style={{ color: c.text, fontFamily: fonts.sans.bold }}>Criar conta</Text>
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }

  /* ── Signup — Step 1: choose role ── */
  if (screen === "signup-role") {
    return (
      <View style={[s.screen, { backgroundColor: c.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Pressable onPress={() => setScreen("lobby")} style={[s.backBtn, { marginBottom: 32 }]}>
          <Ionicons name="chevron-back" size={18} color={c.text} />
        </Pressable>

        <Text style={[s.formTitle, { color: c.text, marginBottom: 4 }]}>Você é</Text>
        <Text style={[s.formSub, { color: c.sub, marginBottom: 32 }]}>Escolha como quer usar a plataforma.</Text>

        <View style={s.roleRow}>
          {([
            { key: "cliente" as const, title: "Cliente", sub: "Solicitar serviços", icon: "person" as const, color: c.primary, textColor: "#1A1714" },
            { key: "prestador" as const, title: "Prestador", sub: "Oferecer serviços", icon: "construct" as const, color: c.blue, textColor: "#fff" },
          ]).map((r) => {
            const active = role === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setRole(r.key)}
                style={[
                  s.roleCard,
                  {
                    backgroundColor: active ? `${r.color}14` : c.card,
                    borderColor: active ? r.color : c.border,
                    borderWidth: active ? 2 : 1,
                  },
                  shadows.sm,
                ]}
              >
                <View style={[s.roleIcon, { backgroundColor: active ? r.color : c.background }]}>
                  <Ionicons name={r.icon} size={20} color={active ? r.textColor : c.softMuted} />
                </View>
                <Text style={[s.roleTitle, { color: c.text }]}>{r.title}</Text>
                <Text style={[s.roleSub, { color: c.softMuted }]}>{r.sub}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => clearScreen("signup-form")}
          style={[s.cta, { backgroundColor: accent, marginTop: 32 }, shadows.md, { shadowColor: accent, shadowOpacity: 0.3 }]}
        >
          <Text style={[s.ctaText, { color: accentText }]}>Continuar</Text>
          <Ionicons name="arrow-forward" size={16} color={accentText} />
        </Pressable>

        <Pressable onPress={() => clearScreen("login")} style={{ marginTop: 20, alignSelf: "center" }}>
          <Text style={[s.switchLink, { color: c.sub }]}>
            Já tem conta?{" "}
            <Text style={{ color: c.text, fontFamily: fonts.sans.bold }}>Entrar</Text>
          </Text>
        </Pressable>
      </View>
    );
  }

  /* ── Signup — Step 2: fill form ── */
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[s.formScroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Nav */}
            <View style={s.formNavRow}>
              <Pressable onPress={() => clearScreen("signup-role")} style={s.backBtn}>
                <Ionicons name="chevron-back" size={18} color={c.text} />
              </Pressable>
              {/* Role badge */}
              <View style={[s.rolePill, { backgroundColor: `${accent}18`, borderColor: `${accent}44` }]}>
                <Ionicons
                  name={role === "cliente" ? "person" : "construct"}
                  size={11}
                  color={role === "cliente" ? "#8B6F00" : c.blue}
                />
                <Text style={[s.rolePillText, { color: role === "cliente" ? "#8B6F00" : c.blue }]}>
                  {role === "cliente" ? "Cliente" : "Prestador"}
                </Text>
              </View>
            </View>

            <Text style={[s.formTitle, { color: c.text }]}>Criar conta</Text>
            <Text style={[s.formSub, { color: c.sub }]}>Preencha seus dados para começar.</Text>

            {apiError ? <ErrorBanner msg={apiError} onDismiss={() => setApiError("")} /> : null}

            <Text style={[s.label, { color: c.softMuted }]}>NOME COMPLETO</Text>
            <TextInput
              value={nome}
              onChangeText={(t) => { setNome(sanitize(t)); if (fieldErrors.nome) setFieldErrors((p) => ({ ...p, nome: "" })); }}
              placeholder="Nome e sobrenome"
              placeholderTextColor={c.softMuted}
              autoCorrect={false}
              maxLength={100}
              returnKeyType="next"
              style={[s.input, { backgroundColor: c.card, borderColor: fieldErrors.nome ? "#DC2626" : c.border, color: c.text }]}
            />
            <FieldError msg={fieldErrors.nome} />

            <Text style={[s.label, { color: c.softMuted }]}>CPF</Text>
            <TextInput
              value={cpf}
              onChangeText={(t) => { setCpf(maskCPF(t)); if (fieldErrors.cpf) setFieldErrors((p) => ({ ...p, cpf: "" })); }}
              placeholder="000.000.000-00"
              placeholderTextColor={c.softMuted}
              keyboardType="numeric"
              maxLength={14}
              returnKeyType="next"
              style={[s.input, { backgroundColor: c.card, borderColor: fieldErrors.cpf ? "#DC2626" : c.border, color: c.text }]}
            />
            <FieldError msg={fieldErrors.cpf} />

            <Text style={[s.label, { color: c.softMuted }]}>TELEFONE (WHATSAPP)</Text>
            <TextInput
              value={telefone}
              onChangeText={(t) => { setTelefone(maskPhone(t)); if (fieldErrors.telefone) setFieldErrors((p) => ({ ...p, telefone: "" })); }}
              placeholder="(21) 99999-9999"
              placeholderTextColor={c.softMuted}
              keyboardType="phone-pad"
              maxLength={15}
              returnKeyType="next"
              style={[s.input, { backgroundColor: c.card, borderColor: fieldErrors.telefone ? "#DC2626" : c.border, color: c.text }]}
            />
            <FieldError msg={fieldErrors.telefone} />

            <Text style={[s.label, { color: c.softMuted }]}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={(t) => { setEmail(sanitize(t)); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" })); }}
              onBlur={() => setEmail((v) => v.toLowerCase().trim())}
              placeholder="voce@email.com"
              placeholderTextColor={c.softMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={254}
              returnKeyType="next"
              style={[s.input, { backgroundColor: c.card, borderColor: fieldErrors.email ? "#DC2626" : c.border, color: c.text }]}
            />
            <FieldError msg={fieldErrors.email} />

            <Text style={[s.label, { color: c.softMuted }]}>SENHA</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                value={senha}
                onChangeText={(t) => { setSenha(t); if (fieldErrors.senha) setFieldErrors((p) => ({ ...p, senha: "" })); }}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={c.softMuted}
                secureTextEntry={!showPassword}
                maxLength={72}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
                style={[s.input, { backgroundColor: c.card, borderColor: fieldErrors.senha ? "#DC2626" : c.border, color: c.text, paddingRight: 48 }]}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                style={{ position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" }}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={c.softMuted} />
              </Pressable>
            </View>
            <PasswordStrengthBar password={senha} />
            <FieldError msg={fieldErrors.senha} />

            <Pressable
              onPress={handleSignup}
              disabled={loading}
              style={[s.cta, { backgroundColor: accent }, shadows.md, { shadowColor: accent, shadowOpacity: 0.3 }]}
            >
              <Text style={[s.ctaText, { color: accentText }]}>
                {loading ? "Criando conta..." : "Criar conta"}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={accentText} />
            </Pressable>

            {/* Social login buttons removed — to be designed in a future sprint */}

            <Text style={[s.terms, { color: c.softMuted }]}>
              Ao continuar, você concorda com os{" "}
              <Text style={{ color: c.sub }}>Termos de Uso</Text> e a{" "}
              <Text style={{ color: c.sub }}>Política de Privacidade</Text>.
            </Text>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },

  /* Lobby */
  lobbyBrand: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  lobbyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  lobbyWordmark: { fontSize: 26, fontFamily: fonts.serif.extra },
  lobbyTagRow: { marginBottom: 48 },
  lobbyTag: { fontSize: 13, fontFamily: fonts.sans.regular, letterSpacing: 0.3 },
  lobbyActions: { gap: 10, marginBottom: 28 },
  lobbyPrimary: {
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  lobbyPrimaryText: { fontSize: 15, fontFamily: fonts.sans.extra },
  lobbySecondary: {
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  lobbySecondaryText: { fontSize: 15, fontFamily: fonts.sans.bold },

  /* Shared form */
  formScroll: { paddingHorizontal: 24 },
  formNavRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  rolePillText: { fontSize: 11, fontFamily: fonts.sans.bold },
  formTitle: { fontSize: 26, fontFamily: fonts.serif.extra, lineHeight: 30, marginBottom: 4 },
  formSub: { fontSize: 13, fontFamily: fonts.sans.regular, marginBottom: 24 },
  label: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8, marginBottom: 6, marginTop: 14 },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: fonts.sans.medium,
  },
  cta: {
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  ctaText: { fontSize: 15, fontFamily: fonts.sans.extra },

  /* Role selection */
  roleRow: { flexDirection: "row", gap: 12 },
  roleCard: {
    flex: 1,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  roleIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  roleTitle: { fontSize: 15, fontFamily: fonts.sans.bold },
  roleSub: { fontSize: 11, fontFamily: fonts.sans.regular, textAlign: "center" },

  /* Providers */
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 22 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 1 },
  providersRow: { flexDirection: "row", gap: 10 },
  provBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  terms: { fontSize: 11, fontFamily: fonts.sans.regular, textAlign: "center", marginTop: 20, lineHeight: 17 },
  switchLink: { fontSize: 13, fontFamily: fonts.sans.regular },
  demoHint: { marginTop: 16, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  demoHintTxt: { fontSize: 11, fontFamily: fonts.sans.medium, textAlign: "center" },
});
