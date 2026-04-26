import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, FontAwesome } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import colors, { fonts, shadows } from "@/constants/colors";

const FEATURES = [
  { icon: "flash" as const, title: "Resposta", sub: "em 5 min" },
  { icon: "shield-checkmark" as const, title: "Seguro", sub: "PIN + foto" },
  { icon: "cash" as const, title: "Pague no app", sub: "Pix · Cartão", lib: "mc" as const },
  { icon: "star" as const, title: "Avaliações", sub: "Reais e públicas" },
];

export default function AuthScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { login, signup } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"cliente" | "prestador">("cliente");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);

  const accent = role === "cliente" ? c.primary : c.blue;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (tab === "login") {
        await login(email || "ricardo@ajudae.app", senha || "123456");
      } else {
        await signup(
          nome || "Novo Usuário",
          email || "novo@ajudae.app",
          telefone || "21999999999",
          senha || "123456",
          role
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#1C1917" }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Dark hero */}
        <LinearGradient
          colors={["#1C1917", "#2A2522", "#1C1917"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 36 }]}
        >
          <View style={styles.brandRow}>
            <LinearGradient
              colors={[c.primary, c.primaryDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.brandIcon}
            >
              <Ionicons name="cube" size={20} color="#fff" />
            </LinearGradient>
            <Text style={styles.brandName}>Ajudaê!</Text>
          </View>

          <Text style={styles.heroTitle}>
            Frete, mudança e entrega <Text style={{ color: c.primary }}>na sua mão</Text>
          </Text>
          <Text style={styles.heroSub}>
            Conecte-se a prestadores verificados na sua região. Tudo no app, com segurança e preço justo.
          </Text>

          <View style={styles.featureGrid}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.featureCell}>
                <View style={styles.featureIcon}>
                  {f.lib === "mc" ? (
                    <MaterialCommunityIcons name="cash" size={16} color={c.primaryDeep} />
                  ) : (
                    <Ionicons name={f.icon} size={16} color={c.primaryDeep} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureSub}>{f.sub}</Text>
                </View>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Form card */}
        <View style={[styles.formCard, { backgroundColor: c.card }]}>
          {/* Tabs */}
          <View style={[styles.tabsBar, { backgroundColor: c.background }]}>
            {(["login", "signup"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[
                  styles.tabBtn,
                  tab === t && { backgroundColor: c.card, ...shadows.sm },
                ]}
              >
                <Text
                  style={{
                    color: tab === t ? c.text : c.softMuted,
                    fontFamily: tab === t ? fonts.sans.bold : fonts.sans.medium,
                    fontSize: 13,
                  }}
                >
                  {t === "login" ? "Entrar" : "Criar conta"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Role chooser (signup only) */}
          {tab === "signup" ? (
            <>
              <Text style={[styles.label, { color: c.softMuted }]}>VOCÊ É</Text>
              <View style={styles.roleRow}>
                {(
                  [
                    { key: "cliente" as const, title: "Cliente", sub: "Solicitar serviços", color: c.primary, icon: "person" as const },
                    { key: "prestador" as const, title: "Prestador", sub: "Oferecer serviços", color: c.blue, icon: "construct" as const },
                  ]
                ).map((r) => {
                  const active = role === r.key;
                  return (
                    <Pressable
                      key={r.key}
                      onPress={() => setRole(r.key)}
                      style={[
                        styles.roleCard,
                        {
                          backgroundColor: active ? `${r.color}10` : c.background,
                          borderColor: active ? r.color : c.border,
                        },
                      ]}
                    >
                      <View style={[styles.roleIcon, { backgroundColor: active ? r.color : c.borderLight }]}>
                        <Ionicons name={r.icon} size={18} color={active ? "#fff" : c.softMuted} />
                      </View>
                      <Text style={[styles.roleTitle, { color: c.text }]}>{r.title}</Text>
                      <Text style={[styles.roleSub, { color: c.softMuted }]}>{r.sub}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: c.softMuted }]}>NOME COMPLETO</Text>
              <TextInput
                value={nome}
                onChangeText={setNome}
                placeholder="Seu nome"
                placeholderTextColor={c.softMuted}
                style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              />
              <Text style={[styles.label, { color: c.softMuted }]}>TELEFONE</Text>
              <TextInput
                value={telefone}
                onChangeText={setTelefone}
                placeholder="(21) 99999-9999"
                placeholderTextColor={c.softMuted}
                keyboardType="phone-pad"
                style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              />
            </>
          ) : null}

          <Text style={[styles.label, { color: c.softMuted }]}>EMAIL</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="voce@email.com"
            placeholderTextColor={c.softMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
          />
          <Text style={[styles.label, { color: c.softMuted }]}>SENHA</Text>
          <TextInput
            value={senha}
            onChangeText={setSenha}
            placeholder="••••••"
            placeholderTextColor={c.softMuted}
            secureTextEntry
            style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
          />

          {/* CTA */}
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={[
              styles.cta,
              { backgroundColor: tab === "signup" ? accent : c.primary },
              shadows.md,
              { shadowColor: tab === "signup" ? accent : c.primary, shadowOpacity: 0.4 },
            ]}
          >
            <Text style={styles.ctaText}>
              {loading ? "..." : tab === "login" ? "Entrar" : "Criar conta"}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <Text style={[styles.dividerText, { color: c.softMuted }]}>PROVEDORES</Text>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
          </View>

          <View style={styles.providersRow}>
            <Pressable style={[styles.provBtn, { backgroundColor: c.background, borderColor: c.border }]}>
              <FontAwesome name="google" size={16} color={c.text} />
            </Pressable>
            <Pressable style={[styles.provBtn, { backgroundColor: c.background, borderColor: c.border }]}>
              <FontAwesome name="apple" size={18} color={c.text} />
            </Pressable>
            <Pressable style={[styles.provBtn, { backgroundColor: c.background, borderColor: c.border }]}>
              <Ionicons name="chatbubbles" size={16} color={c.text} />
            </Pressable>
          </View>

          <Text style={[styles.terms, { color: c.softMuted }]}>
            Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 24, paddingBottom: 40 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 26 },
  brandIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  brandName: { color: "#fff", fontSize: 20, fontFamily: fonts.serif.extra },
  heroTitle: { color: "#fff", fontSize: 28, fontFamily: fonts.serif.extra, lineHeight: 32 },
  heroSub: { color: "rgba(250,250,249,0.7)", fontSize: 13, fontFamily: fonts.sans.regular, lineHeight: 19, marginTop: 10 },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 20 },
  featureCell: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 10,
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(255,140,90,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: { color: "#fff", fontSize: 12, fontFamily: fonts.sans.bold },
  featureSub: { color: "rgba(250,250,249,0.55)", fontSize: 10, fontFamily: fonts.sans.regular },

  formCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    padding: 22,
  },
  tabsBar: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    marginBottom: 18,
  },
  tabBtn: {
    flex: 1,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },
  roleRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  roleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  roleIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  roleTitle: { fontSize: 13, fontFamily: fonts.sans.bold },
  roleSub: { fontSize: 10, fontFamily: fonts.sans.regular, textAlign: "center", marginTop: 2 },
  input: {
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: fonts.sans.medium,
  },
  cta: {
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 22,
  },
  ctaText: { color: "#fff", fontSize: 14, fontFamily: fonts.sans.extra },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 1 },
  providersRow: { flexDirection: "row", gap: 10 },
  provBtn: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  terms: { fontSize: 11, fontFamily: fonts.sans.regular, textAlign: "center", marginTop: 18, lineHeight: 16 },
});
