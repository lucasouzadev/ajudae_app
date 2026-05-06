/**
 * reset-password.tsx
 *
 * Tela ativada pelo deep link: ajuda://reset-password?access_token=...&type=recovery
 * Supabase envia esse link por e-mail quando o usuário solicita recuperação de senha.
 *
 * Fluxo:
 *  1. Supabase JS detecta os tokens na URL automaticamente via onAuthStateChange
 *  2. Usuário digita e confirma a nova senha
 *  3. supabase.auth.updateUser() salva a nova senha
 *  4. Redireciona para a home
 */
import React, { useEffect, useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import colors, { fonts, shadows } from "@/constants/colors";

const ERROR_COLOR = "#DC2626";
const EMAIL_RECOVERY = "recovery";

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

type ResetState = "waiting" | "form" | "success" | "invalid";

export default function ResetPasswordScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [state, setState] = useState<ResetState>("waiting");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Supabase auto-detecta o token do deep link via onAuthStateChange
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === EMAIL_RECOVERY) {
        // Token válido — mostra formulário de nova senha
        setState("form");
      }
    });

    // Timeout: se após 8s não veio o evento, o link é inválido/expirado
    const timeout = setTimeout(() => {
      setState((prev) => prev === "waiting" ? "invalid" : prev);
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleUpdate = async () => {
    const errs: Record<string, string> = {};
    const str = passwordStrength(password);

    if (!password)                 errs.password = "Digite a nova senha.";
    else if (password.length < 8)  errs.password = "Mínimo 8 caracteres.";
    else if (str.score < 4)        errs.password = "Senha fraca — use maiúscula, minúscula, número e símbolo.";
    else if (password.length > 72) errs.password = "Senha muito longa (máx. 72 caracteres).";

    if (!confirm)                  errs.confirm = "Confirme a nova senha.";
    else if (confirm !== password)  errs.confirm = "As senhas não coincidem.";

    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setError("");
    setLoading(true);

    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setState("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível redefinir a senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ── Aguardando token ──
  if (state === "waiting") {
    return (
      <View style={[s.center, { backgroundColor: c.background }]}>
        <Ionicons name="hourglass-outline" size={40} color={c.sub} />
        <Text style={[s.waitingText, { color: c.sub }]}>Verificando link…</Text>
      </View>
    );
  }

  // ── Link inválido ou expirado ──
  if (state === "invalid") {
    return (
      <View style={[s.center, { backgroundColor: c.background, paddingHorizontal: 32 }]}>
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Ionicons name="alert-circle-outline" size={38} color="#DC2626" />
        </View>
        <Text style={[s.invalidTitle, { color: c.text }]}>Link inválido ou expirado</Text>
        <Text style={[s.invalidSub, { color: c.sub }]}>
          O link de recuperação expirou (validade de 1 hora) ou já foi utilizado. Solicite um novo link.
        </Text>
        <Pressable
          onPress={() => router.replace("/auth")}
          style={[s.cta, { backgroundColor: c.primary, marginTop: 32 }, shadows.md]}
        >
          <Text style={[s.ctaText, { color: "#1A1714" }]}>Voltar para o login</Text>
        </Pressable>
      </View>
    );
  }

  // ── Sucesso ──
  if (state === "success") {
    return (
      <View style={[s.center, { backgroundColor: c.background, paddingHorizontal: 32 }]}>
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Ionicons name="checkmark-circle-outline" size={38} color="#16A34A" />
        </View>
        <Text style={[s.invalidTitle, { color: c.text }]}>Senha redefinida!</Text>
        <Text style={[s.invalidSub, { color: c.sub }]}>
          Sua senha foi atualizada com sucesso. Use-a na próxima vez que fizer login.
        </Text>
        <Pressable
          onPress={() => router.replace("/")}
          style={[s.cta, { backgroundColor: c.primary, marginTop: 32 }, shadows.md]}
        >
          <Text style={[s.ctaText, { color: "#1A1714" }]}>Continuar para o app</Text>
          <Ionicons name="arrow-forward" size={16} color="#1A1714" />
        </Pressable>
      </View>
    );
  }

  // ── Formulário de nova senha ──
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: `${c.primary}18`, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <Ionicons name="key-outline" size={24} color={c.text} />
          </View>

          <Text style={[s.formTitle, { color: c.text }]}>Nova senha</Text>
          <Text style={[s.formSub, { color: c.sub }]}>
            Crie uma senha forte para proteger sua conta.
          </Text>

          {error ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <Ionicons name="warning" size={16} color="#DC2626" />
              <Text style={{ flex: 1, fontSize: 13, fontFamily: fonts.sans.medium, color: "#991B1B" }}>{error}</Text>
            </View>
          ) : null}

          {/* Nova senha */}
          <Text style={[s.label, { color: c.softMuted }]}>NOVA SENHA</Text>
          <View style={{ position: "relative" }}>
            <TextInput
              value={password}
              onChangeText={(t) => { setPassword(t); setFieldErrors((p) => ({ ...p, password: "" })); }}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={c.softMuted}
              secureTextEntry={!showPass}
              maxLength={72}
              returnKeyType="next"
              style={[s.input, { backgroundColor: c.card, borderColor: fieldErrors.password ? ERROR_COLOR : c.border, color: c.text, paddingRight: 48 }]}
            />
            <Pressable
              onPress={() => setShowPass((v) => !v)}
              hitSlop={8}
              style={{ position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" }}
            >
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={c.softMuted} />
            </Pressable>
          </View>
          <PasswordStrengthBar password={password} />
          {fieldErrors.password ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 }}>
              <Ionicons name="alert-circle" size={12} color={ERROR_COLOR} />
              <Text style={{ fontSize: 11, fontFamily: fonts.sans.medium, color: ERROR_COLOR }}>{fieldErrors.password}</Text>
            </View>
          ) : null}

          {/* Confirmar senha */}
          <Text style={[s.label, { color: c.softMuted }]}>CONFIRMAR SENHA</Text>
          <View style={{ position: "relative" }}>
            <TextInput
              value={confirm}
              onChangeText={(t) => { setConfirm(t); setFieldErrors((p) => ({ ...p, confirm: "" })); }}
              placeholder="Repita a senha"
              placeholderTextColor={c.softMuted}
              secureTextEntry={!showConfirm}
              maxLength={72}
              returnKeyType="done"
              onSubmitEditing={handleUpdate}
              style={[s.input, { backgroundColor: c.card, borderColor: fieldErrors.confirm ? ERROR_COLOR : c.border, color: c.text, paddingRight: 48 }]}
            />
            <Pressable
              onPress={() => setShowConfirm((v) => !v)}
              hitSlop={8}
              style={{ position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" }}
            >
              <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={c.softMuted} />
            </Pressable>
          </View>
          {fieldErrors.confirm ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 }}>
              <Ionicons name="alert-circle" size={12} color={ERROR_COLOR} />
              <Text style={{ fontSize: 11, fontFamily: fonts.sans.medium, color: ERROR_COLOR }}>{fieldErrors.confirm}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleUpdate}
            disabled={loading}
            style={[s.cta, { backgroundColor: c.primary }, shadows.md, { shadowColor: c.primary, shadowOpacity: 0.3 }]}
          >
            <Text style={[s.ctaText, { color: "#1A1714" }]}>
              {loading ? "Salvando..." : "Redefinir senha"}
            </Text>
            <Ionicons name="checkmark" size={16} color="#1A1714" />
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  waitingText: { marginTop: 16, fontSize: 14, fontFamily: fonts.sans.regular },
  invalidTitle: { fontSize: 22, fontFamily: fonts.serif.extra, textAlign: "center", marginBottom: 12 },
  invalidSub: { fontSize: 14, fontFamily: fonts.sans.regular, textAlign: "center", lineHeight: 21 },
  formTitle: { fontSize: 26, fontFamily: fonts.serif.extra, lineHeight: 30, marginBottom: 4 },
  formSub: { fontSize: 13, fontFamily: fonts.sans.regular, marginBottom: 24 },
  label: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8, marginBottom: 6, marginTop: 14 },
  input: {
    height: 50, borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 16, fontSize: 14, fontFamily: fonts.sans.medium,
  },
  cta: {
    height: 54, borderRadius: 16, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24,
  },
  ctaText: { fontSize: 15, fontFamily: fonts.sans.extra },
});
