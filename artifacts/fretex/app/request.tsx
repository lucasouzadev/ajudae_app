import React, { useState } from "react";
import { View, StyleSheet, Text, ScrollView, TextInput, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import colors, { fonts, shadows } from "@/constants/colors";
import { PrimaryButton } from "@/components/PrimaryButton";
import { MOCK_PROVIDERS } from "@/constants/mockData";

export default function RequestFlowScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [size, setSize] = useState<string | null>(null);
  const totalSteps = 4;
  const { providerId } = useLocalSearchParams<{ providerId?: string }>();
  const provider = providerId ? MOCK_PROVIDERS.find((p) => p.id === providerId) : null;
  const accent = provider?.color || c.primary;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (step < totalSteps) {
      setStep((s) => s + 1);
    } else {
      router.replace("/payment");
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else router.back();
  };

  const SIZES = [
    { t: "Pequena", d: "Caixas, eletrodoméstico único", icon: "cube" as const, lib: "ion" as const },
    { t: "Média", d: "Quarto completo, sofá e rack", icon: "truck" as const, lib: "mc" as const },
    { t: "Grande", d: "Casa completa 2+ quartos", icon: "home" as const, lib: "ion" as const },
  ];

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Ionicons name="close" size={18} color={c.text} />
        </Pressable>
        <View style={styles.dots}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i + 1 <= step ? accent : c.borderLight },
              ]}
            />
          ))}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {provider ? (
          <View style={[styles.providerStrip, { backgroundColor: `${provider.color}10`, borderColor: `${provider.color}33` }]}>
            <View style={[styles.providerStripIcon, { backgroundColor: provider.color }]}>
              <Text style={styles.providerStripIni}>{provider.ini}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.providerStripLabel, { color: c.softMuted }]}>SOLICITANDO PARA</Text>
              <Text style={[styles.providerStripName, { color: c.text }]}>{provider.name}</Text>
            </View>
            <Text style={[styles.providerStripPrice, { color: provider.color }]}>{provider.price}</Text>
          </View>
        ) : null}

        {step === 1 ? (
          <View>
            <Text style={[styles.title, { color: c.text }]}>Onde será o serviço?</Text>
            <Text style={[styles.subtitle, { color: c.softMuted }]}>
              Confirme os endereços de origem e destino.
            </Text>

            <View style={[styles.addressCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
              <View style={styles.timeline}>
                <View style={[styles.timelineDot, { backgroundColor: c.text }]} />
                <View style={[styles.timelineLine, { backgroundColor: c.border }]} />
                <View style={[styles.timelineSquare, { backgroundColor: accent }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: c.softMuted }]}>COLETA</Text>
                <TextInput
                  style={[styles.input, { color: c.text, borderBottomColor: c.borderLight }]}
                  placeholder="Endereço de coleta"
                  placeholderTextColor={c.softMuted}
                  defaultValue="Rua Conde de Bonfim, 200 — Tijuca"
                />
                <Text style={[styles.label, { color: c.softMuted, marginTop: 16 }]}>ENTREGA</Text>
                <TextInput
                  style={[styles.input, { color: c.text }]}
                  placeholder="Endereço de entrega"
                  placeholderTextColor={c.softMuted}
                  defaultValue="Av. das Américas, 4500 — Barra"
                />
              </View>
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View>
            <Text style={[styles.title, { color: c.text }]}>Qual o tamanho da carga?</Text>
            <Text style={[styles.subtitle, { color: c.softMuted }]}>
              Isso ajuda o prestador a ir preparado.
            </Text>

            <View style={{ gap: 10 }}>
              {SIZES.map((opt) => {
                const active = size === opt.t;
                return (
                  <Pressable
                    key={opt.t}
                    onPress={() => setSize(opt.t)}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: active ? `${accent}10` : c.card,
                        borderColor: active ? accent : c.border,
                      },
                    ]}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: active ? accent : c.background }]}>
                      {opt.lib === "mc" ? (
                        <MaterialCommunityIcons name="truck" size={20} color={active ? "#fff" : c.text} />
                      ) : (
                        <Ionicons name={opt.icon} size={20} color={active ? "#fff" : c.text} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, { color: c.text }]}>{opt.t}</Text>
                      <Text style={[styles.optionDesc, { color: c.softMuted }]}>{opt.d}</Text>
                    </View>
                    {active ? <Ionicons name="checkmark-circle" size={20} color={accent} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View>
            <Text style={[styles.title, { color: c.text }]}>Detalhes importantes</Text>
            <Text style={[styles.subtitle, { color: c.softMuted }]}>
              Conte o que será transportado.
            </Text>

            <Text style={[styles.label, { color: c.softMuted }]}>O QUE SERÁ TRANSPORTADO?</Text>
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: c.card, borderColor: c.border, color: c.text },
              ]}
              placeholder="Ex: 1 geladeira, 1 sofá, 4 caixas..."
              placeholderTextColor={c.softMuted}
              multiline
              numberOfLines={4}
            />

            <Text style={[styles.label, { color: c.softMuted, marginTop: 16 }]}>FOTOS (OPCIONAL)</Text>
            <Pressable style={[styles.photoUpload, { backgroundColor: c.card, borderColor: c.border }]}>
              <Ionicons name="camera" size={22} color={c.softMuted} />
              <Text style={[styles.photoText, { color: c.softMuted }]}>Adicionar fotos da carga</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 4 ? (
          <View>
            <Text style={[styles.title, { color: c.text }]}>Resumo do pedido</Text>
            <Text style={[styles.subtitle, { color: c.softMuted }]}>
              Revise antes de confirmar.
            </Text>

            <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: c.softMuted }]}>Distância</Text>
                <Text style={[styles.summaryValue, { color: c.text }]}>4.2 km</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: c.softMuted }]}>Tempo estimado</Text>
                <Text style={[styles.summaryValue, { color: c.text }]}>30-45 min</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: c.softMuted }]}>Tipo de serviço</Text>
                <Text style={[styles.summaryValue, { color: c.text }]}>{provider?.cat || "Frete"}</Text>
              </View>
              <View style={[styles.summaryTotal, { borderTopColor: c.borderLight }]}>
                <Text style={[styles.totalLabel, { color: c.text }]}>Valor estimado</Text>
                <Text style={[styles.totalValue, { color: accent }]}>{provider?.price || "R$ 150"}</Text>
              </View>
            </View>
          </View>
        ) : null}
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
          title={step === totalSteps ? "Confirmar e pagar" : "Continuar"}
          onPress={handleNext}
          color={accent}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 22, height: 4, borderRadius: 2 },
  content: { padding: 24, paddingBottom: 130 },
  providerStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  providerStripIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  providerStripIni: { color: "#fff", fontSize: 13, fontFamily: fonts.serif.extra },
  providerStripLabel: { fontSize: 9, fontFamily: fonts.sans.bold, letterSpacing: 0.6 },
  providerStripName: { fontSize: 13, fontFamily: fonts.sans.bold, marginTop: 1 },
  providerStripPrice: { fontSize: 16, fontFamily: fonts.serif.extra },
  title: { fontSize: 24, fontFamily: fonts.serif.extra, marginBottom: 4 },
  subtitle: { fontSize: 13, fontFamily: fonts.sans.regular, marginBottom: 22 },
  addressCard: { flexDirection: "row", padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 },
  timeline: { alignItems: "center", paddingTop: 18, paddingBottom: 18 },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },
  timelineLine: { width: 2, flex: 1, marginVertical: 4 },
  timelineSquare: { width: 8, height: 8 },
  label: { fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8, marginBottom: 4 },
  input: { height: 36, fontSize: 14, fontFamily: fonts.sans.semibold, borderBottomWidth: 1 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  optionIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  optionTitle: { fontSize: 15, fontFamily: fonts.sans.bold },
  optionDesc: { fontSize: 12, fontFamily: fonts.sans.regular, marginTop: 2 },
  textArea: {
    minHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    fontFamily: fonts.sans.regular,
    textAlignVertical: "top",
  },
  photoUpload: {
    height: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  photoText: { fontSize: 12, fontFamily: fonts.sans.semibold },
  summaryCard: { padding: 18, borderRadius: 18, borderWidth: 1 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  summaryLabel: { fontSize: 13, fontFamily: fonts.sans.regular },
  summaryValue: { fontSize: 13, fontFamily: fonts.sans.bold },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 14,
    marginTop: 4,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 15, fontFamily: fonts.sans.bold },
  totalValue: { fontSize: 22, fontFamily: fonts.serif.extra },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    borderTopWidth: 1,
  },
});
