import React, { useState } from "react";
import { View, StyleSheet, Text, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import colors, { fonts, shadows } from "@/constants/colors";
import { PrimaryButton } from "@/components/PrimaryButton";

type Method = "pix" | "card" | "cash";

const METHODS: { key: Method; label: string; sub: string; icon: any; lib: "ion" | "mc"; color: string }[] = [
  { key: "pix", label: "Pix", sub: "Aprovação instantânea", icon: "qr-code", lib: "ion", color: "#16A34A" },
  { key: "card", label: "Cartão Visa •••• 4242", sub: "Crédito · Em até 12x", icon: "card", lib: "ion", color: "#2563EB" },
  { key: "cash", label: "Dinheiro na entrega", sub: "Pague direto ao prestador", icon: "cash", lib: "mc", color: "#D97706" },
];

export default function PaymentScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<Method>("pix");
  const [success, setSuccess] = useState(false);

  const handlePay = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSuccess(true);
    setTimeout(() => router.dismissAll(), 1800);
  };

  if (success) {
    return (
      <View style={[styles.successWrap, { backgroundColor: c.background }]}>
        <View style={[styles.successIcon, { backgroundColor: c.successLight }]}>
          <Ionicons name="checkmark" size={48} color={c.success} />
        </View>
        <Text style={[styles.successTitle, { color: c.text }]}>Pedido confirmado!</Text>
        <Text style={[styles.successText, { color: c.softMuted }]}>O prestador já foi notificado.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}
        >
          <Ionicons name="close" size={18} color={c.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>Pagamento</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary card */}
        <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Text style={[styles.summaryLabel, { color: c.softMuted }]}>VALOR TOTAL</Text>
          <Text style={[styles.amount, { color: c.primary }]}>R$ 150,00</Text>
          <View style={[styles.summaryDivider, { borderTopColor: c.borderLight }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryK, { color: c.softMuted }]}>Serviço</Text>
              <Text style={[styles.summaryV, { color: c.text }]}>Mudança</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryK, { color: c.softMuted }]}>Prestador</Text>
              <Text style={[styles.summaryV, { color: c.text }]}>Carlos Oliveira</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryK, { color: c.softMuted }]}>Distância</Text>
              <Text style={[styles.summaryV, { color: c.text }]}>4.2 km</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.section, { color: c.text }]}>Forma de pagamento</Text>
        <View style={{ gap: 10 }}>
          {METHODS.map((m) => {
            const active = method === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setMethod(m.key)}
                style={[
                  styles.methodCard,
                  {
                    backgroundColor: active ? `${m.color}10` : c.card,
                    borderColor: active ? m.color : c.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.radio,
                    { borderColor: active ? m.color : c.border, backgroundColor: active ? m.color : "transparent" },
                  ]}
                >
                  {active ? <Ionicons name="checkmark" size={11} color="#fff" /> : null}
                </View>
                <View style={[styles.methodIcon, { backgroundColor: `${m.color}18` }]}>
                  {m.lib === "mc" ? (
                    <MaterialCommunityIcons name="cash" size={18} color={m.color} />
                  ) : (
                    <Ionicons name={m.icon} size={18} color={m.color} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodLabel, { color: c.text }]}>{m.label}</Text>
                  <Text style={[styles.methodSub, { color: c.softMuted }]}>{m.sub}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.securityCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.securityIcon, { backgroundColor: c.successLight }]}>
            <Ionicons name="shield-checkmark" size={18} color={c.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.securityTitle, { color: c.text }]}>Pagamento protegido</Text>
            <Text style={[styles.securitySub, { color: c.softMuted }]}>
              O valor só é liberado após você confirmar o serviço com o PIN de 6 dígitos.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: c.card,
            borderTopColor: c.borderLight,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <PrimaryButton
          title={method === "pix" ? "Pagar com Pix · R$ 150,00" : "Confirmar pagamento"}
          onPress={handlePay}
          icon="lock-closed"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  successWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  successIcon: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  successTitle: { fontSize: 22, fontFamily: fonts.serif.extra },
  successText: { fontSize: 13, fontFamily: fonts.sans.regular, textAlign: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontFamily: fonts.serif.extra },
  content: { padding: 20, paddingBottom: 120 },

  summaryCard: { padding: 20, borderRadius: 18, borderWidth: 1, alignItems: "center", marginBottom: 22 },
  summaryLabel: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8 },
  amount: { fontSize: 38, fontFamily: fonts.serif.extra, marginTop: 4 },
  summaryDivider: { width: "100%", borderTopWidth: 1, paddingTop: 14, marginTop: 14, gap: 6 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryK: { fontSize: 12, fontFamily: fonts.sans.regular },
  summaryV: { fontSize: 12, fontFamily: fonts.sans.bold },
  section: { fontSize: 16, fontFamily: fonts.serif.extra, marginBottom: 12 },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  methodIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  methodLabel: { fontSize: 13, fontFamily: fonts.sans.bold },
  methodSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 1 },
  securityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
  },
  securityIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  securityTitle: { fontSize: 12, fontFamily: fonts.sans.bold },
  securitySub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2, lineHeight: 16 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
});
