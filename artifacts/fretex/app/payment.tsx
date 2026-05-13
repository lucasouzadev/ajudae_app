import React, { useState } from "react";
import { Share, View, StyleSheet, Text, ScrollView, Pressable, Image } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import colors, { fonts, shadows } from "@/constants/colors";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TopNav } from "@/components/TopNav";
import { useService } from "@/contexts/ServiceContext";
import { createPayment, type CreatedPayment } from "@/lib/payments";

type Method = "pix" | "card";

const METHODS: { key: Method; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: "pix", label: "Pix", sub: "QR Code e copia-e-cola via Mercado Pago", icon: "qr-code", color: "#16A34A" },
  { key: "card", label: "Cartão", sub: "Checkout seguro via Stripe", icon: "card", color: "#2563EB" },
];

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PaymentScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { active } = useService();
  const [method, setMethod] = useState<Method>("pix");
  const [payment, setPayment] = useState<CreatedPayment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const sharePixCode = async (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await Share.share({ message: code });
    } catch {
      // User cancelled share sheet
    }
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 3000);
  };

  const amount = active?.estimatedPrice ?? payment?.amount ?? 0;
  const total = formatBRL(amount);

  const openCheckout = async (url?: string | null) => {
    if (!url) return;
    await WebBrowser.openBrowserAsync(url);
  };

  const handlePay = async () => {
    if (!active || loading) return;

    setLoading(true);
    setError(null);

    try {
      const next = await createPayment({
        request_id: active.id,
        method,
        provider: method === "pix" ? "mercado_pago" : "stripe",
        success_url: "ajuda://payment?status=success",
        cancel_url: "ajuda://payment?status=cancel",
      });

      setPayment(next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      if (method === "card" && next.checkout_url) {
        await openCheckout(next.checkout_url);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar o pagamento");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  if (!active) {
    return (
      <View style={[styles.emptyWrap, { backgroundColor: c.background }]}>
        <TopNav title="Pagamento" onBack={() => router.back()} />
        <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Ionicons name="receipt-outline" size={32} color={c.softMuted} />
          <Text style={[styles.emptyTitle, { color: c.text }]}>Nenhum pedido ativo</Text>
          <Text style={[styles.emptyText, { color: c.softMuted }]}>Inicie ou selecione um serviço para pagar.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <TopNav title="Pagamento" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Text style={[styles.summaryLabel, { color: c.softMuted }]}>VALOR TOTAL</Text>
          <Text style={[styles.amount, { color: c.primary }]}>{total}</Text>
          <View style={[styles.summaryDivider, { borderTopColor: c.borderLight }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryK, { color: c.softMuted }]}>Serviço</Text>
              <Text style={[styles.summaryV, { color: c.text }]}>{active.category}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryK, { color: c.softMuted }]}>Prestador</Text>
              <Text style={[styles.summaryV, { color: c.text }]}>{active.providerName ?? "A definir"}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryK, { color: c.softMuted }]}>Status</Text>
              <Text style={[styles.summaryV, { color: c.text }]}>{active.status}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.section, { color: c.text }]}>Forma de pagamento</Text>
        <View style={{ gap: 10 }}>
          {METHODS.map((m) => {
            const selected = method === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => {
                  setMethod(m.key);
                  setPayment(null);
                  setError(null);
                }}
                style={[
                  styles.methodCard,
                  {
                    backgroundColor: selected ? `${m.color}10` : c.card,
                    borderColor: selected ? m.color : c.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.radio,
                    { borderColor: selected ? m.color : c.border, backgroundColor: selected ? m.color : "transparent" },
                  ]}
                >
                  {selected ? <Ionicons name="checkmark" size={11} color="#fff" /> : null}
                </View>
                <View style={[styles.methodIcon, { backgroundColor: `${m.color}18` }]}>
                  <Ionicons name={m.icon} size={18} color={m.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodLabel, { color: c.text }]}>{m.label}</Text>
                  <Text style={[styles.methodSub, { color: c.softMuted }]}>{m.sub}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <View style={[styles.errorCard, { backgroundColor: "#FFF1F2", borderColor: c.destructive }]}>
            <Ionicons name="alert-circle" size={18} color={c.destructive} />
            <Text style={[styles.errorText, { color: c.destructive }]}>{error}</Text>
          </View>
        ) : null}

        {payment ? (
          <View style={[styles.paymentCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.paymentHeader}>
              <View style={[styles.securityIcon, { backgroundColor: c.warningLight }]}>
                <Ionicons name="time" size={18} color={c.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.securityTitle, { color: c.text }]}>Pagamento pendente</Text>
                <Text style={[styles.securitySub, { color: c.softMuted }]}>
                  A confirmação será atualizada após retorno do provedor.
                </Text>
              </View>
            </View>

            {payment.qr_code_base64 ? (
              <View style={[styles.qrBox, { backgroundColor: c.background, borderColor: c.borderLight }]}>
                <Image source={{ uri: `data:image/png;base64,${payment.qr_code_base64}` }} style={styles.qrImage} />
              </View>
            ) : null}

            {payment.qr_code ? (
              <View style={[styles.pixCodeBox, { backgroundColor: c.background, borderColor: c.borderLight }]}>
                <Text selectable style={[styles.pixCode, { color: c.text }]}>
                  {payment.qr_code}
                </Text>
                <Pressable
                  onPress={() => sharePixCode(payment.qr_code!)}
                  style={[styles.copyBtn, { backgroundColor: codeCopied ? `${c.success}18` : `${c.success}10`, borderColor: c.success }]}
                >
                  <Ionicons name={codeCopied ? "checkmark-circle" : "copy-outline"} size={15} color={c.success} />
                  <Text style={[styles.copyBtnText, { color: c.success }]}>
                    {codeCopied ? "Copiado!" : "Copiar código Pix"}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {payment.checkout_url ? (
              <PrimaryButton
                title={payment.provider === "stripe" ? "Abrir checkout" : "Abrir Pix"}
                onPress={() => openCheckout(payment.checkout_url)}
                icon="open-outline"
                variant="outline"
                color={payment.provider === "stripe" ? c.blue : c.success}
                style={{ marginTop: 12 }}
              />
            ) : null}
          </View>
        ) : null}

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
          title={method === "pix" ? `Gerar Pix · ${total}` : `Pagar com cartão · ${total}`}
          onPress={handlePay}
          icon="lock-closed"
          loading={loading}
          disabled={amount <= 0}
          color={method === "pix" ? c.success : c.blue}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyWrap: { flex: 1, padding: 20 },
  emptyCard: {
    marginTop: 96,
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontFamily: fonts.serif.extra },
  emptyText: { fontSize: 13, fontFamily: fonts.sans.regular, textAlign: "center" },
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
  content: { padding: 20, paddingBottom: 132 },
  summaryCard: { padding: 20, borderRadius: 18, borderWidth: 1, alignItems: "center", marginBottom: 22 },
  summaryLabel: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8 },
  amount: { fontSize: 38, fontFamily: fonts.serif.extra, marginTop: 4 },
  summaryDivider: { width: "100%", borderTopWidth: 1, paddingTop: 14, marginTop: 14, gap: 6 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  summaryK: { fontSize: 12, fontFamily: fonts.sans.regular },
  summaryV: { fontSize: 12, fontFamily: fonts.sans.bold, flexShrink: 1, textAlign: "right" },
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
  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  errorText: { flex: 1, fontSize: 12, fontFamily: fonts.sans.semibold, lineHeight: 17 },
  paymentCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 18 },
  paymentHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  qrBox: { alignSelf: "center", padding: 12, borderRadius: 16, borderWidth: 1, marginTop: 16 },
  qrImage: { width: 212, height: 212, borderRadius: 8 },
  pixCodeBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 12, gap: 10 },
  pixCode: { fontSize: 11, fontFamily: fonts.sans.medium, lineHeight: 16 },
  copyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 38, borderRadius: 10, borderWidth: 1 },
  copyBtnText: { fontSize: 12, fontFamily: fonts.sans.bold },
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
