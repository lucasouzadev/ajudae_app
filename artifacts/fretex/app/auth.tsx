import React, { useState } from "react";
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
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import colors, { fonts, shadows } from "@/constants/colors";

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
  const [loading, setLoading] = useState(false);

  const accent = role === "cliente" ? c.primary : c.blue;
  const accentText = role === "cliente" ? "#1A1714" : "#fff";

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login(email || "ricardo@ajudae.app", senha || "123456");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    try {
      await signup(
        nome || "Novo Usuário",
        email || "novo@ajudae.app",
        telefone || "21999999999",
        senha || "123456",
        role,
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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

        {/* Providers */}
        <View style={s.dividerRow}>
          <View style={[s.divider, { backgroundColor: c.border }]} />
          <Text style={[s.dividerText, { color: c.softMuted }]}>OU</Text>
          <View style={[s.divider, { backgroundColor: c.border }]} />
        </View>
        <View style={s.providersRow}>
          <Pressable style={[s.provBtn, { backgroundColor: c.card, borderColor: c.border }]}>
            <FontAwesome name="google" size={17} color={c.text} />
          </Pressable>
          <Pressable style={[s.provBtn, { backgroundColor: c.card, borderColor: c.border }]}>
            <FontAwesome name="apple" size={19} color={c.text} />
          </Pressable>
          <Pressable style={[s.provBtn, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="chatbubbles" size={17} color={c.text} />
          </Pressable>
        </View>

        <Text style={[s.terms, { color: c.softMuted }]}>
          Ao continuar, você concorda com os{" "}
          <Text style={{ color: c.sub }}>Termos de Uso</Text> e a{" "}
          <Text style={{ color: c.sub }}>Política de Privacidade</Text>.
        </Text>
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
              <Pressable onPress={() => setScreen("lobby")} style={s.backBtn}>
                <Ionicons name="chevron-back" size={18} color={c.text} />
              </Pressable>

              <Text style={[s.formTitle, { color: c.text }]}>Entrar</Text>
              <Text style={[s.formSub, { color: c.sub }]}>Bem-vindo de volta.</Text>

              <Text style={[s.label, { color: c.softMuted }]}>EMAIL</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="voce@email.com"
                placeholderTextColor={c.softMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                style={[s.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
              />

              <Text style={[s.label, { color: c.softMuted }]}>SENHA</Text>
              <TextInput
                value={senha}
                onChangeText={setSenha}
                placeholder="••••••"
                placeholderTextColor={c.softMuted}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                style={[s.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
              />

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

              <View style={s.dividerRow}>
                <View style={[s.divider, { backgroundColor: c.border }]} />
                <Text style={[s.dividerText, { color: c.softMuted }]}>PROVEDORES</Text>
                <View style={[s.divider, { backgroundColor: c.border }]} />
              </View>
              <View style={s.providersRow}>
                <Pressable style={[s.provBtn, { backgroundColor: c.card, borderColor: c.border }]}>
                  <FontAwesome name="google" size={17} color={c.text} />
                </Pressable>
                <Pressable style={[s.provBtn, { backgroundColor: c.card, borderColor: c.border }]}>
                  <FontAwesome name="apple" size={19} color={c.text} />
                </Pressable>
                <Pressable style={[s.provBtn, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Ionicons name="chatbubbles" size={17} color={c.text} />
                </Pressable>
              </View>

              <Pressable onPress={() => setScreen("signup-role")} style={{ marginTop: 20, alignSelf: "center" }}>
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
          onPress={() => setScreen("signup-form")}
          style={[s.cta, { backgroundColor: accent, marginTop: 32 }, shadows.md, { shadowColor: accent, shadowOpacity: 0.3 }]}
        >
          <Text style={[s.ctaText, { color: accentText }]}>Continuar</Text>
          <Ionicons name="arrow-forward" size={16} color={accentText} />
        </Pressable>

        <Pressable onPress={() => setScreen("login")} style={{ marginTop: 20, alignSelf: "center" }}>
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
              <Pressable onPress={() => setScreen("signup-role")} style={s.backBtn}>
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

            <Text style={[s.label, { color: c.softMuted }]}>NOME COMPLETO</Text>
            <TextInput
              value={nome}
              onChangeText={setNome}
              placeholder="Seu nome"
              placeholderTextColor={c.softMuted}
              returnKeyType="next"
              style={[s.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
            />

            <Text style={[s.label, { color: c.softMuted }]}>TELEFONE</Text>
            <TextInput
              value={telefone}
              onChangeText={setTelefone}
              placeholder="(21) 99999-9999"
              placeholderTextColor={c.softMuted}
              keyboardType="phone-pad"
              returnKeyType="next"
              style={[s.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
            />

            <Text style={[s.label, { color: c.softMuted }]}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="voce@email.com"
              placeholderTextColor={c.softMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              style={[s.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
            />

            <Text style={[s.label, { color: c.softMuted }]}>SENHA</Text>
            <TextInput
              value={senha}
              onChangeText={setSenha}
              placeholder="••••••"
              placeholderTextColor={c.softMuted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignup}
              style={[s.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
            />

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

            <View style={s.dividerRow}>
              <View style={[s.divider, { backgroundColor: c.border }]} />
              <Text style={[s.dividerText, { color: c.softMuted }]}>PROVEDORES</Text>
              <View style={[s.divider, { backgroundColor: c.border }]} />
            </View>
            <View style={s.providersRow}>
              <Pressable style={[s.provBtn, { backgroundColor: c.card, borderColor: c.border }]}>
                <FontAwesome name="google" size={17} color={c.text} />
              </Pressable>
              <Pressable style={[s.provBtn, { backgroundColor: c.card, borderColor: c.border }]}>
                <FontAwesome name="apple" size={19} color={c.text} />
              </Pressable>
              <Pressable style={[s.provBtn, { backgroundColor: c.card, borderColor: c.border }]}>
                <Ionicons name="chatbubbles" size={17} color={c.text} />
              </Pressable>
            </View>

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
});
