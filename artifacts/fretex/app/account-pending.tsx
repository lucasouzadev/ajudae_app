import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors, { fonts, shadows } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { AuthOtpSheet } from "@/components/AuthOtpSheet";

export default function AccountPendingScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { pendingAccount, confirmSignupOtp, resendSignupOtp, clearPendingAccount } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!pendingAccount) {
    return (
      <View style={[styles.screen, { backgroundColor: c.background, paddingTop: insets.top + 24 }]}>
        <Text style={[styles.title, { color: c.text }]}>Nenhuma conta pendente</Text>
        <Pressable
          onPress={() => router.replace("/auth")}
          style={[styles.primaryButton, { backgroundColor: c.primary }]}
        >
          <Text style={[styles.primaryButtonText, { color: "#1A1714" }]}>Voltar ao login</Text>
        </Pressable>
      </View>
    );
  }

  const currentPending = pendingAccount;

  const isProvider = currentPending.role === "prestador";
  const accent = isProvider ? c.blue : c.primary;
  const accentText = isProvider ? "#fff" : "#1A1714";

  async function handleConfirm(code: string) {
    setLoading(true);

    try {
      await confirmSignupOtp(code, currentPending.email);
      setSheetOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    await resendSignupOtp(currentPending.email);
  }

  async function handleBackToAuth() {
    await clearPendingAccount();
    router.replace("/auth");
  }

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: c.background,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <Pressable onPress={handleBackToAuth} style={styles.backButton}>
        <Ionicons name="chevron-back" size={18} color={c.text} />
      </Pressable>

      <View style={styles.content}>
        <LinearGradient
          colors={[accent, isProvider ? "#60A5FA" : c.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.iconWrap, shadows.md]}
        >
          <Ionicons name="time-outline" size={34} color={accentText} />
        </LinearGradient>

        <Text style={[styles.eyebrow, { color: accent }]}>STATUS DA CONTA</Text>
        <Text style={[styles.title, { color: c.text }]}>Conta em pendência</Text>
        <Text style={[styles.subtitle, { color: c.sub }]}>
          Sua conta foi criada, mas ainda falta confirmar seu e-mail para liberar acesso.
        </Text>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <View style={styles.row}>
            <Ionicons name="mail-outline" size={16} color={accent} />
            <Text style={[styles.rowText, { color: c.text }]}>{currentPending.email}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name={isProvider ? "construct-outline" : "person-outline"} size={16} color={accent} />
            <Text style={[styles.rowText, { color: c.text }]}>
              {isProvider ? "Prestador" : "Cliente"}
            </Text>
          </View>
        </View>

        <View style={[styles.infoBox, { backgroundColor: `${accent}14`, borderColor: `${accent}30` }]}>
          <Ionicons name="information-circle-outline" size={16} color={accent} />
          <Text style={[styles.infoText, { color: c.text }]}>
            Se você tentar entrar antes da confirmação, vamos trazer você de volta para esta etapa.
          </Text>
        </View>

        <Pressable
          onPress={() => setSheetOpen(true)}
          style={[
            styles.primaryButton,
            { backgroundColor: accent },
            shadows.md,
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: accentText }]}>Confirmar conta</Text>
          <Ionicons name="arrow-forward" size={16} color={accentText} />
        </Pressable>
      </View>

      <AuthOtpSheet
        visible={sheetOpen}
        email={currentPending.email}
        loading={loading}
        onClose={() => setSheetOpen(false)}
        onConfirm={handleConfirm}
        onResend={handleResend}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: fonts.sans.bold,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  title: {
    fontSize: 34,
    fontFamily: fonts.serif.extra,
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.sans.regular,
    lineHeight: 22,
    marginBottom: 22,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 12,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.sans.medium,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.sans.medium,
    lineHeight: 18,
  },
  primaryButton: {
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: fonts.sans.extra,
  },
});
