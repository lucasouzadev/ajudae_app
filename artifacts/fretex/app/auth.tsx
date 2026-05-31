import React, { useState, useEffect, useRef, useCallback } from "react";
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
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
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
  if (msg.includes("já está vinculado") || msg.includes("CPF já utilizado")) return msg;
  if (msg.includes("Invalid login credentials"))  return "E-mail ou senha incorretos.";
  if (msg.includes("Email not confirmed"))         return "Confirme seu e-mail antes de entrar.";
  if (msg.includes("already registered") || msg.includes("already been registered"))
    return "Este e-mail já está cadastrado.";
  if (msg.includes("weak") || msg.includes("Password should contain"))
    return "Senha fraca — use maiúscula, minúscula, número e símbolo (ex: Senha@123).";
  if (msg.includes("Password should be at least")) return "Senha muito curta — mínimo 6 caracteres.";
  if (msg.includes("Invalid API key") || msg.includes("apikey") || msg.includes("No API key"))
    return "Erro de conexão com o servidor. Tente novamente.";
  if (msg.includes("Invalid Refresh Token") || msg.includes("Refresh Token Not Found"))
    return "Sessão expirada. Fazendo novo login…";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Muitas tentativas. Aguarde alguns minutos.";
  if (msg.includes("Network") || msg.includes("fetch"))
    return "Sem conexão. Verifique sua internet.";
  if (msg.includes("Token has expired") || msg.includes("otp_expired"))
    return "Código expirado. Solicite um novo código.";
  if (msg.includes("otp_invalid") || msg.includes("OTP") || msg.includes("token is invalid"))
    return "Código inválido. Verifique e tente novamente.";
  if (msg.includes("PGRST") || msg.includes("schema cache"))
    return "Erro interno. Tente novamente em instantes.";
  return "Algo deu errado. Tente novamente.";
}

/* ─── Shared UI helpers ───────────────────────────────────────────────── */
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
  if (!msg) return null;
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

/* ─── OTP Input ───────────────────────────────────────────────────────── */
function OTPInput({
  value,
  onChange,
  hasError,
  c,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
  c: { card: string; border: string; text: string };
}) {
  const refs = useRef<(TextInput | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const handleChange = (text: string, idx: number) => {
    const clean = text.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = clean;
    onChange(next.join(""));
    if (clean && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKey = (key: string, idx: number) => {
    if (key === "Backspace" && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  return (
    <View style={{ flexDirection: "row", gap: 8, marginVertical: 20 }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <TextInput
          key={i}
          ref={(r) => { refs.current[i] = r; }}
          value={digits[i]}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKey(e.nativeEvent.key, i)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
          style={{
            flex: 1,
            height: 58,
            borderRadius: 14,
            borderWidth: digits[i] ? 2 : 1.5,
            borderColor: hasError ? ERROR_COLOR : (digits[i] ? c.text : c.border),
            textAlign: "center",
            fontSize: 22,
            fontFamily: fonts.sans.bold,
            backgroundColor: c.card,
            color: c.text,
          }}
        />
      ))}
    </View>
  );
}

/* ─── CTA Button ──────────────────────────────────────────────────────── */
function CTAButton({
  onPress,
  loading = false,
  disabled = false,
  label,
  icon,
  bgColor,
  textColor,
  style,
}: {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  label: string;
  icon?: string;
  bgColor: string;
  textColor: string;
  style?: object;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={[
        s.cta,
        { backgroundColor: bgColor, opacity: loading || disabled ? 0.75 : 1 },
        shadows.md,
        { shadowColor: bgColor, shadowOpacity: 0.3 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          <Text style={[s.ctaText, { color: textColor }]}>{label}</Text>
          {icon ? <Ionicons name={icon as never} size={16} color={textColor} /> : null}
        </>
      )}
    </Pressable>
  );
}

/* ─── LGPD Bottom Sheet ───────────────────────────────────────────────── */
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
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)", opacity: backdropAnim }]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          lgpdStyles.sheet,
          { backgroundColor: c.card, paddingBottom: insets.bottom + 16, transform: [{ translateY: slideAnim }] },
          shadows.xl,
        ]}
      >
        <View style={[lgpdStyles.handle, { backgroundColor: c.border }]} />
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
            Ao tocar em "Concordo", você confirma que leu, entendeu e concorda com os termos.
            {"\n\n"}
            Coletamos informações como nome, telefone, localização e dados dos pedidos — em conformidade com a{" "}
            <Text style={{ fontFamily: fonts.sans.bold, color: c.text }}>LGPD (Lei 13.709/2018)</Text>.
          </Text>
          <Pressable onPress={() => Linking.openURL("https://ajudaeh.com.br/privacidade")} style={lgpdStyles.linkRow}>
            <Text style={[lgpdStyles.link, { color: c.blue }]}>Política de Privacidade e Termos de Uso</Text>
            <Ionicons name="open-outline" size={13} color={c.blue} />
          </Pressable>
        </ScrollView>
        <View style={lgpdStyles.actions}>
          <Pressable
            onPress={() => dismiss(onAccept)}
            style={[lgpdStyles.acceptBtn, { backgroundColor: c.primary }, shadows.md, { shadowColor: c.primary, shadowOpacity: 0.3 }]}
          >
            <Ionicons name="checkmark-circle" size={18} color="#1A1714" />
            <Text style={[lgpdStyles.acceptText, { color: "#1A1714" }]}>Concordo</Text>
          </Pressable>
          <Pressable onPress={() => dismiss(onDecline)} style={[lgpdStyles.declineBtn, { backgroundColor: c.background }]}>
            <Text style={[lgpdStyles.declineText, { color: c.sub }]}>Sair</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const lgpdStyles = StyleSheet.create({
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 14, maxHeight: "82%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  iconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 22, fontFamily: fonts.serif.extra, lineHeight: 28, marginBottom: 14 },
  bodyScroll: { maxHeight: 200, marginBottom: 20 },
  body: { fontSize: 13, fontFamily: fonts.sans.regular, lineHeight: 20 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 14 },
  link: { fontSize: 13, fontFamily: fonts.sans.semibold, textDecorationLine: "underline" },
  actions: { gap: 10 },
  acceptBtn: { height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  acceptText: { fontSize: 16, fontFamily: fonts.sans.extra },
  declineBtn: { height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  declineText: { fontSize: 15, fontFamily: fonts.sans.bold },
});

/* ─── Main Auth Screen ────────────────────────────────────────────────── */
type Screen =
  | "lobby"
  | "login"
  | "signup-role"
  | "signup-form"
  | "forgot-email"
  | "forgot-otp"
  | "forgot-new-password";

export default function AuthScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { login, signup } = useAuth();

  /* ── Navigation & animation ── */
  const [screen, setScreen] = useState<Screen>("lobby");
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;

  const transitionTo = useCallback(
    (next: Screen, dir: "forward" | "back" = "forward") => {
      Keyboard.dismiss();
      Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
        setScreen(next);
        slideAnim.setValue(dir === "forward" ? 40 : -40);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, tension: 120, friction: 18, useNativeDriver: true }),
        ]).start();
      });
    },
    [fadeAnim, slideAnim],
  );

  /* ── Role ── */
  const [role, setRole] = useState<"cliente" | "prestador">("cliente");
  const accent     = role === "cliente" ? c.primary : c.blue;
  const accentText = role === "cliente" ? "#1A1714" : "#fff";

  /* ── Login / Signup shared fields ── */
  const [email,       setEmail]       = useState("");
  const [senha,       setSenha]       = useState("");
  const [nome,        setNome]        = useState("");
  const [telefone,    setTelefone]    = useState("");
  const [cpf,         setCpf]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError,    setApiError]    = useState("");

  /* ── Forgot-password flow ── */
  const [forgotEmail,        setForgotEmail]        = useState("");
  const [forgotOTP,          setForgotOTP]          = useState("");
  const [forgotNewPass,      setForgotNewPass]      = useState("");
  const [forgotConfirm,      setForgotConfirm]      = useState("");
  const [showForgotPass,     setShowForgotPass]     = useState(false);
  const [showForgotConfirm,  setShowForgotConfirm]  = useState(false);
  const [forgotLoading,      setForgotLoading]      = useState(false);
  const [forgotError,        setForgotError]        = useState("");
  const [forgotFieldErrors,  setForgotFieldErrors]  = useState<Record<string, string>>({});
  const [forgotSuccess,      setForgotSuccess]      = useState(false);

  /* ── LGPD ── */
  const [lgpdChecked, setLgpdChecked] = useState(false);
  const [showLGPD,    setShowLGPD]    = useState(false);

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

  /* ── Handlers ── */
  const handleLogin = async () => {
    const errs: Record<string, string> = {};
    const cleanEmail = sanitize(email).toLowerCase().trim();
    const cleanSenha = senha.trim();

    if (!cleanEmail)                      errs.email = "Informe seu e-mail.";
    else if (!EMAIL_RE.test(cleanEmail))  errs.email = "E-mail inválido.";
    if (!cleanSenha)                      errs.senha = "Informe sua senha.";
    else if (cleanSenha.length < 6)       errs.senha = "Senha com no mínimo 6 caracteres.";

    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setApiError("");
    setLoading(true);
    try {
      const loginEmail = IS_DEMO ? (cleanEmail || "ricardo@ajudae.app") : cleanEmail;
      const loginSenha = IS_DEMO ? (cleanSenha || "123456") : cleanSenha;
      await login(loginEmail, loginSenha);
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      // Stale refresh token stored in AsyncStorage — clear and retry once
      if (raw.includes("Invalid Refresh Token") || raw.includes("Refresh Token Not Found")) {
        try {
          await supabase.auth.signOut();
          const loginEmail = IS_DEMO ? (cleanEmail || "ricardo@ajudae.app") : cleanEmail;
          const loginSenha = IS_DEMO ? (cleanSenha || "123456") : cleanSenha;
          await login(loginEmail, loginSenha);
          return;
        } catch (retryErr) {
          setApiError(mapAuthError(retryErr));
          return;
        }
      }
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

    if (!cleanNome)               errs.nome = "Nome completo obrigatório.";
    else if (!isFullName(cleanNome)) errs.nome = "Informe nome e sobrenome (mín. 2 palavras).";
    else if (cleanNome.length > 100) errs.nome = "Nome muito longo (máx. 100 caracteres).";

    if (!cleanCpf)                errs.cpf = "CPF obrigatório.";
    else if (!validateCPF(cleanCpf)) errs.cpf = "CPF inválido.";

    if (!cleanEmail)              errs.email = "Informe seu e-mail.";
    else if (!EMAIL_RE.test(cleanEmail)) errs.email = "E-mail inválido.";

    if (!cleanTel)                errs.telefone = "Informe seu telefone.";
    else if (cleanTel.length < 10 || cleanTel.length > 11)
      errs.telefone = "Telefone inválido — use DDD + número.";

    if (!cleanSenha)              errs.senha = "Crie uma senha.";
    else if (cleanSenha.length < 8) errs.senha = "Senha com no mínimo 8 caracteres.";
    else if (str.score < 4)       errs.senha = "Senha fraca — use maiúscula, minúscula, número e símbolo.";
    else if (cleanSenha.length > 72) errs.senha = "Senha muito longa (máx. 72 caracteres).";

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

  const handleSendRecovery = async () => {
    const clean = sanitize(forgotEmail).toLowerCase().trim();
    if (!clean)                    { setForgotFieldErrors({ email: "Informe seu e-mail." }); return; }
    if (!EMAIL_RE.test(clean))     { setForgotFieldErrors({ email: "E-mail inválido." }); return; }
    setForgotFieldErrors({});
    setForgotError("");
    setForgotLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(clean);
      if (err) throw err;
      setForgotEmail(clean);
      transitionTo("forgot-otp", "forward");
    } catch (e) {
      setForgotError(mapAuthError(e));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (forgotOTP.length < 6) {
      setForgotFieldErrors({ otp: "Digite os 6 dígitos do código." });
      return;
    }
    setForgotFieldErrors({});
    setForgotError("");
    setForgotLoading(true);
    try {
      const { error: err } = await supabase.auth.verifyOtp({
        email: forgotEmail,
        token: forgotOTP,
        type: "recovery",
      });
      if (err) throw err;
      transitionTo("forgot-new-password", "forward");
    } catch (e) {
      setForgotError(mapAuthError(e));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setForgotOTP("");
    setForgotError("");
    setForgotFieldErrors({});
    setForgotLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail);
      if (err) throw err;
    } catch (e) {
      setForgotError(mapAuthError(e));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSetNewPassword = async () => {
    const errs: Record<string, string> = {};
    const str = passwordStrength(forgotNewPass);

    if (!forgotNewPass)               errs.password = "Digite a nova senha.";
    else if (forgotNewPass.length < 8) errs.password = "Mínimo 8 caracteres.";
    else if (str.score < 4)           errs.password = "Senha fraca — use maiúscula, minúscula, número e símbolo.";
    else if (forgotNewPass.length > 72) errs.password = "Senha muito longa (máx. 72 caracteres).";

    if (!forgotConfirm)               errs.confirm = "Confirme a nova senha.";
    else if (forgotConfirm !== forgotNewPass) errs.confirm = "As senhas não coincidem.";

    if (Object.keys(errs).length) { setForgotFieldErrors(errs); return; }
    setForgotFieldErrors({});
    setForgotError("");
    setForgotLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: forgotNewPass });
      if (err) throw err;
      setForgotSuccess(true);
    } catch (e) {
      setForgotError(mapAuthError(e));
    } finally {
      setForgotLoading(false);
    }
  };

  /* ─── Render helpers ─────────────────────────────────────────────────── */

  /** Consistent back-button for all form screens */
  const BackButton = ({ onPress, noMargin }: { onPress: () => void; noMargin?: boolean }) => (
    <Pressable onPress={onPress} style={[s.backBtn, noMargin ? null : { marginBottom: 28 }]} hitSlop={8}>
      <Ionicons name="chevron-back" size={20} color={c.text} />
    </Pressable>
  );

  /** Consistent icon block above titles */
  const ScreenIcon = ({ name, bg, tint }: { name: string; bg: string; tint: string }) => (
    <View style={[s.screenIcon, { backgroundColor: bg }]}>
      <Ionicons name={name as never} size={24} color={tint} />
    </View>
  );

  /* ── Lobby ── */
  const renderLobby = () => (
    <View style={[s.lobbyContainer, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
      {/* Brand */}
      <View style={s.lobbyTop}>
        <View style={[s.lobbyIcon, { backgroundColor: c.primary }]}>
          <Ionicons name="cube" size={24} color="#1A1714" />
        </View>
        <Text style={[s.lobbyWordmark, { color: c.text }]}>Ajudaê!</Text>
        <Text style={[s.lobbyTag, { color: c.sub }]}>Frete · Mudança · Entrega</Text>
      </View>

      {/* Actions */}
      <View style={s.lobbyBottom}>
        <CTAButton
          onPress={() => transitionTo("login", "forward")}
          label="Entrar"
          icon="arrow-forward"
          bgColor={c.primary}
          textColor="#1A1714"
        />
        <Pressable
          onPress={() => transitionTo("signup-role", "forward")}
          style={[s.lobbySecondary, { backgroundColor: c.card, borderColor: c.border }]}
        >
          <Text style={[s.lobbySecondaryText, { color: c.text }]}>Criar conta</Text>
        </Pressable>
        <Text style={[s.terms, { color: c.softMuted, marginTop: 16 }]}>
          Ao continuar, você concorda com os{" "}
          <Text style={{ color: c.sub }}>Termos de Uso</Text> e a{" "}
          <Text style={{ color: c.sub }}>Política de Privacidade</Text>.
        </Text>
      </View>
    </View>
  );

  /* ── Login ── */
  const renderLogin = () => (
    <ScrollView
      contentContainerStyle={[s.formScroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <BackButton onPress={() => transitionTo("lobby", "back")} />
      <View style={s.formHeader}>
        <ScreenIcon name="person-circle-outline" bg={`${c.primary}18`} tint={c.text} />
        <Text style={[s.formTitle, { color: c.text }]}>Entrar</Text>
        <Text style={[s.formSub, { color: c.sub }]}>Bem-vindo de volta.</Text>
      </View>

      <ErrorBanner msg={apiError} onDismiss={() => setApiError("")} />

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
        style={[s.input, { backgroundColor: c.card, borderColor: fieldErrors.email ? ERROR_COLOR : c.border, color: c.text }]}
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
          style={[s.input, { backgroundColor: c.card, borderColor: fieldErrors.senha ? ERROR_COLOR : c.border, color: c.text, paddingRight: 92 }]}
        />
        <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={s.eyeBtn}>
          <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={c.softMuted} />
        </Pressable>
      </View>
      <FieldError msg={fieldErrors.senha} />

      <Pressable
        onPress={() => { setForgotEmail(email); transitionTo("forgot-email", "forward"); }}
        style={{ alignSelf: "flex-end", marginTop: 10 }}
        hitSlop={8}
      >
        <Text style={{ fontSize: 12, fontFamily: fonts.sans.semibold, color: c.sub }}>Esqueceu a senha?</Text>
      </Pressable>

      <CTAButton
        onPress={handleLogin}
        loading={loading}
        label="Entrar"
        icon="arrow-forward"
        bgColor={c.primary}
        textColor="#1A1714"
      />

      <Pressable onPress={() => transitionTo("signup-role", "forward")} style={s.switchLink}>
        <Text style={{ fontSize: 13, fontFamily: fonts.sans.regular, color: c.sub }}>
          Não tem conta?{" "}
          <Text style={{ color: c.text, fontFamily: fonts.sans.bold }}>Criar conta</Text>
        </Text>
      </Pressable>
    </ScrollView>
  );

  /* ── Signup Step 1 — choose role ── */
  const renderSignupRole = () => (
    <View style={[s.formScroll, { flex: 1, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}>
      <BackButton onPress={() => transitionTo("lobby", "back")} />
      <View style={s.formHeader}>
        <ScreenIcon name="people-outline" bg={`${c.primary}18`} tint={c.text} />
        <Text style={[s.formTitle, { color: c.text }]}>Você é</Text>
        <Text style={[s.formSub, { color: c.sub }]}>Escolha como quer usar a plataforma.</Text>
      </View>

      <View style={s.roleRow}>
        {([
          { key: "cliente" as const,   title: "Cliente",    sub: "Solicitar serviços", icon: "person",    color: c.primary, textColor: "#1A1714" },
          { key: "prestador" as const, title: "Prestador",  sub: "Oferecer serviços",  icon: "construct", color: c.blue,    textColor: "#fff"    },
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
                <Ionicons name={r.icon as never} size={20} color={active ? r.textColor : c.softMuted} />
              </View>
              <Text style={[s.roleTitle, { color: c.text }]}>{r.title}</Text>
              <Text style={[s.roleSub, { color: c.softMuted }]}>{r.sub}</Text>
            </Pressable>
          );
        })}
      </View>

      <CTAButton
        onPress={() => { setFieldErrors({}); setApiError(""); transitionTo("signup-form", "forward"); }}
        label="Continuar"
        icon="arrow-forward"
        bgColor={accent}
        textColor={accentText}
        style={{ marginTop: 32 }}
      />

      <Pressable onPress={() => transitionTo("login", "back")} style={s.switchLink}>
        <Text style={{ fontSize: 13, fontFamily: fonts.sans.regular, color: c.sub }}>
          Já tem conta?{" "}
          <Text style={{ color: c.text, fontFamily: fonts.sans.bold }}>Entrar</Text>
        </Text>
      </Pressable>
    </View>
  );

  /* ── Signup Step 2 — fill form ── */
  const renderSignupForm = () => (
    <ScrollView
      contentContainerStyle={[s.formScroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Nav row with back + role pill */}
      <View style={s.formNavRow}>
        <BackButton onPress={() => transitionTo("signup-role", "back")} noMargin />
        <View style={[s.rolePill, { backgroundColor: `${accent}18`, borderColor: `${accent}44` }]}>
          <Ionicons name={role === "cliente" ? "person" : "construct"} size={11} color={role === "cliente" ? "#8B6F00" : c.blue} />
          <Text style={[s.rolePillText, { color: role === "cliente" ? "#8B6F00" : c.blue }]}>
            {role === "cliente" ? "Cliente" : "Prestador"}
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: 24 }}>
        <Text style={[s.formTitle, { color: c.text }]}>Criar conta</Text>
        <Text style={[s.formSub, { color: c.sub, marginBottom: 0 }]}>Preencha seus dados para começar.</Text>
      </View>

      <ErrorBanner msg={apiError} onDismiss={() => setApiError("")} />

      <Text style={[s.label, { color: c.softMuted }]}>NOME COMPLETO</Text>
      <TextInput
        value={nome}
        onChangeText={(t) => { setNome(sanitize(t)); if (fieldErrors.nome) setFieldErrors((p) => ({ ...p, nome: "" })); }}
        placeholder="Nome e sobrenome"
        placeholderTextColor={c.softMuted}
        autoCorrect={false}
        maxLength={100}
        returnKeyType="next"
        style={[s.input, { backgroundColor: c.card, borderColor: fieldErrors.nome ? ERROR_COLOR : c.border, color: c.text }]}
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
        style={[s.input, { backgroundColor: c.card, borderColor: fieldErrors.cpf ? ERROR_COLOR : c.border, color: c.text }]}
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
        style={[s.input, { backgroundColor: c.card, borderColor: fieldErrors.telefone ? ERROR_COLOR : c.border, color: c.text }]}
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
        style={[s.input, { backgroundColor: c.card, borderColor: fieldErrors.email ? ERROR_COLOR : c.border, color: c.text }]}
      />
      <FieldError msg={fieldErrors.email} />

      <Text style={[s.label, { color: c.softMuted }]}>SENHA</Text>
      <View style={{ position: "relative" }}>
        <TextInput
          value={senha}
          onChangeText={(t) => { setSenha(t); if (fieldErrors.senha) setFieldErrors((p) => ({ ...p, senha: "" })); }}
          placeholder="Mínimo 8 caracteres"
          placeholderTextColor={c.softMuted}
          secureTextEntry={!showPassword}
          maxLength={72}
          returnKeyType="done"
          onSubmitEditing={handleSignup}
          style={[s.input, { backgroundColor: c.card, borderColor: fieldErrors.senha ? ERROR_COLOR : c.border, color: c.text, paddingRight: 92 }]}
        />
        <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={s.eyeBtn}>
          <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={c.softMuted} />
        </Pressable>
      </View>
      <PasswordStrengthBar password={senha} />
      <FieldError msg={fieldErrors.senha} />

      <CTAButton
        onPress={handleSignup}
        loading={loading}
        label="Criar conta"
        icon="arrow-forward"
        bgColor={accent}
        textColor={accentText}
      />

      <Text style={[s.terms, { color: c.softMuted }]}>
        Ao continuar, você concorda com os{" "}
        <Text style={{ color: c.sub }}>Termos de Uso</Text> e a{" "}
        <Text style={{ color: c.sub }}>Política de Privacidade</Text>.
      </Text>
    </ScrollView>
  );

  /* ── Forgot — Step 1: enter email ── */
  const renderForgotEmail = () => (
    <ScrollView
      contentContainerStyle={[s.formScroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <BackButton onPress={() => transitionTo("login", "back")} />
      <View style={s.formHeader}>
        <ScreenIcon name="lock-open-outline" bg={`${c.primary}18`} tint={c.text} />
        <Text style={[s.formTitle, { color: c.text }]}>Recuperar senha</Text>
        <Text style={[s.formSub, { color: c.sub }]}>
          Informe seu e-mail — enviaremos um código de 6 dígitos para redefinir a senha.
        </Text>
      </View>

      <ErrorBanner msg={forgotError} onDismiss={() => setForgotError("")} />

      <Text style={[s.label, { color: c.softMuted }]}>EMAIL CADASTRADO</Text>
      <TextInput
        value={forgotEmail}
        onChangeText={(t) => { setForgotEmail(sanitize(t)); setForgotFieldErrors((p) => ({ ...p, email: "" })); }}
        onBlur={() => setForgotEmail((v) => v.toLowerCase().trim())}
        placeholder="voce@email.com"
        placeholderTextColor={c.softMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={254}
        returnKeyType="send"
        onSubmitEditing={handleSendRecovery}
        style={[s.input, { backgroundColor: c.card, borderColor: forgotFieldErrors.email ? ERROR_COLOR : c.border, color: c.text }]}
      />
      <FieldError msg={forgotFieldErrors.email} />

      <CTAButton
        onPress={handleSendRecovery}
        loading={forgotLoading}
        label="Enviar código"
        icon="send"
        bgColor={c.primary}
        textColor="#1A1714"
      />

      <Pressable onPress={() => transitionTo("login", "back")} style={s.switchLink}>
        <Text style={{ fontSize: 13, fontFamily: fonts.sans.regular, color: c.sub }}>
          Lembrou a senha?{" "}
          <Text style={{ color: c.text, fontFamily: fonts.sans.bold }}>Entrar</Text>
        </Text>
      </Pressable>
    </ScrollView>
  );

  /* ── Forgot — Step 2: OTP code ── */
  const renderForgotOTP = () => (
    <ScrollView
      contentContainerStyle={[s.formScroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <BackButton onPress={() => { setForgotOTP(""); transitionTo("forgot-email", "back"); }} />
      <View style={s.formHeader}>
        <ScreenIcon name="mail-open-outline" bg="#DCFCE7" tint="#16A34A" />
        <Text style={[s.formTitle, { color: c.text }]}>Verifique seu e-mail</Text>
        <Text style={[s.formSub, { color: c.sub }]}>
          Enviamos um código de 6 dígitos para{"\n"}
          <Text style={{ fontFamily: fonts.sans.bold, color: c.text }}>{forgotEmail}</Text>
        </Text>
      </View>

      <ErrorBanner msg={forgotError} onDismiss={() => setForgotError("")} />

      <Text style={[s.label, { color: c.softMuted }]}>CÓDIGO DE VERIFICAÇÃO</Text>
      <OTPInput
        value={forgotOTP}
        onChange={(v) => { setForgotOTP(v); setForgotFieldErrors((p) => ({ ...p, otp: "" })); }}
        hasError={!!forgotFieldErrors.otp}
        c={c}
      />
      <FieldError msg={forgotFieldErrors.otp} />

      <Text style={{ fontSize: 12, fontFamily: fonts.sans.regular, color: c.softMuted, marginBottom: 4 }}>
        Não encontrou? Verifique o spam. O código expira em 1 hora.
      </Text>

      <CTAButton
        onPress={handleVerifyOTP}
        loading={forgotLoading}
        label="Verificar código"
        icon="checkmark"
        bgColor={c.primary}
        textColor="#1A1714"
      />

      <Pressable
        onPress={handleResendOTP}
        disabled={forgotLoading}
        style={s.switchLink}
      >
        <Text style={{ fontSize: 13, fontFamily: fonts.sans.regular, color: c.sub, textAlign: "center" }}>
          Não recebeu?{" "}
          <Text style={{ color: c.text, fontFamily: fonts.sans.bold }}>Reenviar código</Text>
        </Text>
      </Pressable>
    </ScrollView>
  );

  /* ── Forgot — Step 3: new password ── */
  const renderForgotNewPassword = () => {
    if (forgotSuccess) {
      return (
        <View style={[s.centerScreen, { paddingTop: insets.top, paddingBottom: insets.bottom + 32, paddingHorizontal: 32 }]}>
          <View style={[s.successIcon, { backgroundColor: "#DCFCE7" }]}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#16A34A" />
          </View>
          <Text style={[s.formTitle, { color: c.text, textAlign: "center", marginBottom: 8 }]}>Senha redefinida!</Text>
          <Text style={[s.formSub, { color: c.sub, textAlign: "center", marginBottom: 0 }]}>
            Sua senha foi atualizada com sucesso. Use-a na próxima vez que fizer login.
          </Text>
          <CTAButton
            onPress={() => {
              setForgotEmail("");
              setForgotOTP("");
              setForgotNewPass("");
              setForgotConfirm("");
              setForgotSuccess(false);
              transitionTo("login", "forward");
            }}
            label="Ir para o login"
            icon="arrow-forward"
            bgColor={c.primary}
            textColor="#1A1714"
            style={{ marginTop: 32, width: "100%" }}
          />
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={[s.formScroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={() => transitionTo("forgot-otp", "back")} />
        <View style={s.formHeader}>
          <ScreenIcon name="key-outline" bg={`${c.primary}18`} tint={c.text} />
          <Text style={[s.formTitle, { color: c.text }]}>Nova senha</Text>
          <Text style={[s.formSub, { color: c.sub }]}>Crie uma senha forte para proteger sua conta.</Text>
        </View>

        <ErrorBanner msg={forgotError} onDismiss={() => setForgotError("")} />

        <Text style={[s.label, { color: c.softMuted }]}>NOVA SENHA</Text>
        <View style={{ position: "relative" }}>
          <TextInput
            value={forgotNewPass}
            onChangeText={(t) => { setForgotNewPass(t); setForgotFieldErrors((p) => ({ ...p, password: "" })); }}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={c.softMuted}
            secureTextEntry={!showForgotPass}
            maxLength={72}
            returnKeyType="next"
            style={[s.input, { backgroundColor: c.card, borderColor: forgotFieldErrors.password ? ERROR_COLOR : c.border, color: c.text, paddingRight: 92 }]}
          />
          <Pressable onPress={() => setShowForgotPass((v) => !v)} hitSlop={8} style={s.eyeBtn}>
            <Ionicons name={showForgotPass ? "eye-off-outline" : "eye-outline"} size={18} color={c.softMuted} />
          </Pressable>
        </View>
        <PasswordStrengthBar password={forgotNewPass} />
        <FieldError msg={forgotFieldErrors.password} />

        <Text style={[s.label, { color: c.softMuted }]}>CONFIRMAR SENHA</Text>
        <View style={{ position: "relative" }}>
          <TextInput
            value={forgotConfirm}
            onChangeText={(t) => { setForgotConfirm(t); setForgotFieldErrors((p) => ({ ...p, confirm: "" })); }}
            placeholder="Repita a senha"
            placeholderTextColor={c.softMuted}
            secureTextEntry={!showForgotConfirm}
            maxLength={72}
            returnKeyType="done"
            onSubmitEditing={handleSetNewPassword}
            style={[s.input, { backgroundColor: c.card, borderColor: forgotFieldErrors.confirm ? ERROR_COLOR : c.border, color: c.text, paddingRight: 92 }]}
          />
          <Pressable onPress={() => setShowForgotConfirm((v) => !v)} hitSlop={8} style={s.eyeBtn}>
            <Ionicons name={showForgotConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={c.softMuted} />
          </Pressable>
        </View>
        <FieldError msg={forgotFieldErrors.confirm} />

        <CTAButton
          onPress={handleSetNewPassword}
          loading={forgotLoading}
          label="Redefinir senha"
          icon="checkmark"
          bgColor={c.primary}
          textColor="#1A1714"
        />
      </ScrollView>
    );
  };

  /* ── Screen switcher ── */
  const renderScreen = () => {
    switch (screen) {
      case "lobby":               return renderLobby();
      case "login":               return renderLogin();
      case "signup-role":         return renderSignupRole();
      case "signup-form":         return renderSignupForm();
      case "forgot-email":        return renderForgotEmail();
      case "forgot-otp":          return renderForgotOTP();
      case "forgot-new-password": return renderForgotNewPassword();
    }
  };

  if (!lgpdChecked) return null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
        >
          {renderScreen()}
        </Animated.View>
      </TouchableWithoutFeedback>

      {showLGPD && (
        <LGPDSheet onAccept={handleLGPDAccept} onDecline={() => setShowLGPD(false)} />
      )}
    </KeyboardAvoidingView>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  /* Lobby */
  lobbyContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  lobbyTop: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 32,
  },
  lobbyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  lobbyWordmark: { fontSize: 32, fontFamily: fonts.serif.extra, marginBottom: 6 },
  lobbyTag: { fontSize: 14, fontFamily: fonts.sans.regular, letterSpacing: 0.4 },
  lobbyBottom: { gap: 10 },
  lobbySecondary: {
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  lobbySecondaryText: { fontSize: 15, fontFamily: fonts.sans.bold },

  /* Shared form */
  formScroll: { paddingHorizontal: 24 },
  formNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
  },
  formHeader: { marginBottom: 24 },
  screenIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
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
  formTitle: { fontSize: 26, fontFamily: fonts.serif.extra, lineHeight: 30, marginBottom: 6 },
  formSub: { fontSize: 13, fontFamily: fonts.sans.regular, lineHeight: 20, marginBottom: 0 },
  label: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8, marginBottom: 6, marginTop: 16 },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: fonts.sans.medium,
  },
  eyeBtn: {
    position: "absolute",
    right: 46,
    top: 0,
    bottom: 0,
    justifyContent: "center",
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
  switchLink: { marginTop: 20, alignSelf: "center" },

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

  /* Misc */
  terms: { fontSize: 11, fontFamily: fonts.sans.regular, textAlign: "center", marginTop: 20, lineHeight: 17 },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
});
