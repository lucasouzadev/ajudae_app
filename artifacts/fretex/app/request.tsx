import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Text, ScrollView, TextInput, Pressable, Switch, Image, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import colors, { fonts, shadows } from "@/constants/colors";
import { PrimaryButton } from "@/components/PrimaryButton";
import { CATEGORY_COLORS, type Provider } from "@/constants/mockData";
import type { Category } from "@/constants/mockData";
import { fetchProviderById } from "@/lib/providers";
import { useAuth } from "@/contexts/AuthContext";
import { useService } from "@/contexts/ServiceContext";
import { usePortfolio } from "@/contexts/PortfolioContext";

const PHOTO_MOCKS = [
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=400&q=80",
  "https://images.unsplash.com/photo-1582719188393-bb71ca45dbb9?w=400&q=80",
  "https://images.unsplash.com/photo-1558959356-2f3631030929?w=400&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80",
  "https://images.unsplash.com/photo-1494178270175-e96de2971df9?w=400&q=80",
];

const SCHEDULE_OPTIONS = [
  { id: "1h", label: "Em 1 hora", offset: 60 },
  { id: "3h", label: "Em 3 horas", offset: 180 },
  { id: "tomorrow", label: "Amanhã 9h", offset: 24 * 60 },
  { id: "weekend", label: "Sábado 10h", offset: 3 * 24 * 60 },
];

export default function RequestFlowScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { createService } = useService();
  const { portfolio } = usePortfolio();
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  const { providerId } = useLocalSearchParams<{ providerId?: string }>();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(!!providerId);
  const [providerNotFound, setProviderNotFound] = useState(false);

  useEffect(() => {
    if (!providerId) return;
    setLoadingProvider(true);
    setProviderNotFound(false);
    fetchProviderById(providerId).then((data) => {
      setProvider(data);
      setLoadingProvider(false);
      if (!data) setProviderNotFound(true);
    });
  }, [providerId]);

  const accent = provider?.color || c.primary;
  const category: Category = provider?.cat || "Frete";
  // Use portfolio data for own provider (logged-in user), otherwise fall back to fetched helpers count
  const isOwnProviderProfile = provider?.id === user?.id;
  const providerSupportsHelpers = provider
    ? (isOwnProviderProfile ? portfolio.supportsHelpers : provider.helpers > 0)
    : true; // quando sem prestador fixo, mostra a opção
  const catColor = CATEGORY_COLORS[category];

  const [origin, setOrigin] = useState("Rua Conde de Bonfim, 200 — Tijuca");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [needsHelper, setNeedsHelper] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [scheduleId, setScheduleId] = useState<string>("1h");
  const [submitting, setSubmitting] = useState(false);

  const phoneValid = (user?.phone || "").replace(/\D/g, "").length >= 10;
  const originValid = origin.trim().length > 6;
  const descriptionValid = description.trim().length >= 10;

  const canContinue = useMemo(() => {
    if (step === 1) return originValid;
    if (step === 2) return descriptionValid;
    if (step === 3) return true;
    return true;
  }, [step, originValid, descriptionValid]);

  const estimatedPrice = useMemo(() => {
    const base = provider?.priceFrom ?? (category === "Mudança" ? 150 : category === "Frete" ? 120 : 35);
    const extras = needsHelper ? 35 : 0;
    return base + extras;
  }, [provider, category, needsHelper]);

  const scheduledFor = useMemo(() => {
    if (!scheduled) return undefined;
    const opt = SCHEDULE_OPTIONS.find((o) => o.id === scheduleId);
    if (!opt) return undefined;
    const d = new Date(Date.now() + opt.offset * 60 * 1000);
    return d.toISOString();
  }, [scheduled, scheduleId]);

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!canContinue) return;
    if (step < totalSteps) {
      setStep((s) => s + 1);
      return;
    }
    // submit
    setSubmitting(true);
    try {
      const customerName = user?.name || "Cliente Ajudaê";
      const initials = customerName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
      await createService({
        customerId: user?.id || "u-demo",
        customerName,
        customerInitials: initials,
        customerColor: c.blue,
        customerRating: 4.9,
        category,
        origin,
        destination: destination.trim() || undefined,
        description,
        photos,
        needsHelper,
        scheduled,
        scheduledFor,
        estimatedPrice,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace("/otp-modal");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else router.back();
  };

  const togglePhoto = (uri: string) => {
    setPhotos((prev) => (prev.includes(uri) ? prev.filter((p) => p !== uri) : prev.length >= 5 ? prev : [...prev, uri]));
  };

  // ── Loading / error guards (only when a specific providerId was requested) ─
  if (loadingProvider) {
    return (
      <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={{ marginTop: 12, color: c.textSecondary, fontSize: 14 }}>Carregando prestador…</Text>
      </View>
    );
  }

  if (providerNotFound) {
    return (
      <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={c.error ?? "#FF3B30"} />
        <Text style={{ marginTop: 16, fontSize: 18, fontWeight: "700", color: c.text, textAlign: "center" }}>
          Prestador não encontrado
        </Text>
        <Text style={{ marginTop: 8, fontSize: 14, color: c.textSecondary, textAlign: "center" }}>
          Este prestador pode estar offline ou não está mais disponível.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{ marginTop: 24, backgroundColor: c.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Ionicons name={step > 1 ? "chevron-back" : "close"} size={18} color={c.text} />
        </Pressable>
        <View style={styles.dots}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i + 1 <= step ? accent : c.borderLight }]} />
          ))}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
        ) : (
          <View style={[styles.providerStrip, { backgroundColor: `${catColor}10`, borderColor: `${catColor}33` }]}>
            <View style={[styles.providerStripIcon, { backgroundColor: catColor }]}>
              {category === "Mudança" ? (
                <Ionicons name="home" size={16} color="#fff" />
              ) : category === "Frete" ? (
                <MaterialCommunityIcons name="truck" size={18} color="#fff" />
              ) : (
                <Ionicons name="cube" size={16} color="#fff" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.providerStripLabel, { color: c.softMuted }]}>CATEGORIA</Text>
              <Text style={[styles.providerStripName, { color: c.text }]}>{category}</Text>
            </View>
            <Text style={[styles.providerStripPrice, { color: catColor }]}>R${estimatedPrice}</Text>
          </View>
        )}

        {/* STEP 1 — Endereços */}
        {step === 1 ? (
          <View>
            <Text style={[styles.title, { color: c.text }]}>Onde será o serviço?</Text>
            <Text style={[styles.subtitle, { color: c.softMuted }]}>Origem é obrigatório. Destino é opcional.</Text>

            <View style={[styles.addressCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
              <View style={styles.timeline}>
                <View style={[styles.timelineDot, { backgroundColor: c.text }]} />
                <View style={[styles.timelineLine, { backgroundColor: c.border }]} />
                <View style={[styles.timelineSquare, { backgroundColor: accent }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: c.softMuted }]}>ORIGEM <Text style={{ color: c.destructive }}>*</Text></Text>
                <TextInput
                  style={[styles.input, { color: c.text, borderBottomColor: c.borderLight }]}
                  placeholder="Endereço de coleta"
                  placeholderTextColor={c.softMuted}
                  value={origin}
                  onChangeText={setOrigin}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
                <Text style={[styles.label, { color: c.softMuted, marginTop: 16 }]}>DESTINO (OPCIONAL)</Text>
                <TextInput
                  style={[styles.input, { color: c.text }]}
                  placeholder="Para onde vai?"
                  placeholderTextColor={c.softMuted}
                  value={destination}
                  onChangeText={setDestination}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>
            </View>

            {!phoneValid ? (
              <View style={[styles.warnBox, { backgroundColor: c.warningLight, borderColor: `${c.warning}66` }]}>
                <Ionicons name="alert-circle" size={14} color={c.warning} />
                <Text style={[styles.warnText, { color: c.text }]}>
                  Cadastre seu telefone no perfil para o prestador entrar em contato.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* STEP 2 — Descrição + fotos */}
        {step === 2 ? (
          <View>
            <Text style={[styles.title, { color: c.text }]}>Descreva o serviço</Text>
            <Text style={[styles.subtitle, { color: c.softMuted }]}>Conte o que será transportado e qualquer detalhe importante.</Text>

            <Text style={[styles.label, { color: c.softMuted }]}>DESCRIÇÃO <Text style={{ color: c.destructive }}>*</Text></Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: c.card, borderColor: descriptionValid || description.length === 0 ? c.border : c.destructive, color: c.text }]}
              placeholder="Ex: 1 geladeira, 1 sofá, 4 caixas. Sobe pelo elevador de serviço."
              placeholderTextColor={c.softMuted}
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
            />
            <Text style={[styles.helper, { color: description.length >= 10 ? c.softMuted : c.destructive }]}>
              {description.length}/300 · mínimo 10 caracteres
            </Text>

            <Text style={[styles.label, { color: c.softMuted, marginTop: 16 }]}>FOTOS (OPCIONAL · MÁX 5)</Text>
            <View style={styles.photoGrid}>
              {PHOTO_MOCKS.map((uri) => {
                const selected = photos.includes(uri);
                return (
                  <Pressable
                    key={uri}
                    onPress={() => togglePhoto(uri)}
                    style={[
                      styles.photoTile,
                      { borderColor: selected ? accent : c.border, borderWidth: selected ? 2 : 1 },
                    ]}
                  >
                    <Image source={{ uri }} style={styles.photoImg} />
                    {selected ? (
                      <View style={[styles.photoCheck, { backgroundColor: accent }]}>
                        <Ionicons name="checkmark" size={11} color="#fff" />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.helper, { color: c.softMuted, marginTop: 8 }]}>
              Toque para selecionar · {photos.length}/5 escolhidas
            </Text>
          </View>
        ) : null}

        {/* STEP 3 — Ajudante + agendar */}
        {step === 3 ? (
          <View>
            <Text style={[styles.title, { color: c.text }]}>Opções extras</Text>
            <Text style={[styles.subtitle, { color: c.softMuted }]}>Personalize o pedido conforme sua necessidade.</Text>

            {providerSupportsHelpers ? (
              <View style={[styles.toggleCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
                <View style={[styles.toggleIcon, { backgroundColor: needsHelper ? `${accent}18` : c.background }]}>
                  <Ionicons name="people" size={18} color={needsHelper ? accent : c.softMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: c.text }]}>Precisa de ajudante?</Text>
                  <Text style={[styles.toggleSub, { color: c.softMuted }]}>+ R$35 · alguém para carregar com você</Text>
                </View>
                <Switch
                  value={needsHelper}
                  onValueChange={setNeedsHelper}
                  trackColor={{ true: accent, false: c.border }}
                  thumbColor="#fff"
                />
              </View>
            ) : (
              <View style={[styles.toggleCard, { backgroundColor: c.background, borderColor: c.borderLight, opacity: 0.7 }, shadows.sm]}>
                <View style={[styles.toggleIcon, { backgroundColor: c.background }]}>
                  <Ionicons name="people" size={18} color={c.softMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: c.softMuted }]}>Ajudante não disponível</Text>
                  <Text style={[styles.toggleSub, { color: c.softMuted }]}>Este prestador não trabalha com ajudantes</Text>
                </View>
                <Ionicons name="close-circle" size={18} color={c.softMuted} />
              </View>
            )}

            <View style={[styles.toggleCard, { backgroundColor: c.card, borderColor: c.border, marginTop: 10 }, shadows.sm]}>
              <View style={[styles.toggleIcon, { backgroundColor: scheduled ? `${accent}18` : c.background }]}>
                <Ionicons name="calendar" size={18} color={scheduled ? accent : c.softMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleTitle, { color: c.text }]}>Agendar para depois?</Text>
                <Text style={[styles.toggleSub, { color: c.softMuted }]}>
                  {scheduled ? "Escolha um horário abaixo" : "Padrão: agora (mínimo +1h)"}
                </Text>
              </View>
              <Switch
                value={scheduled}
                onValueChange={setScheduled}
                trackColor={{ true: accent, false: c.border }}
                thumbColor="#fff"
              />
            </View>

            {scheduled ? (
              <View style={styles.scheduleGrid}>
                {SCHEDULE_OPTIONS.map((opt) => {
                  const sel = scheduleId === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setScheduleId(opt.id)}
                      style={[
                        styles.scheduleChip,
                        { backgroundColor: sel ? accent : c.card, borderColor: sel ? accent : c.border },
                      ]}
                    >
                      <Text style={[styles.scheduleTxt, { color: sel ? "#fff" : c.text }]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* STEP 4 — Resumo */}
        {step === 4 ? (
          <View>
            <Text style={[styles.title, { color: c.text }]}>Resumo do pedido</Text>
            <Text style={[styles.subtitle, { color: c.softMuted }]}>Revise antes de confirmar.</Text>

            <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
              <SummaryRow label="Categoria" value={category} c={c} />
              <SummaryRow label="Origem" value={origin} c={c} />
              {destination ? <SummaryRow label="Destino" value={destination} c={c} /> : null}
              <SummaryRow label="Descrição" value={description.length > 50 ? description.slice(0, 50) + "…" : description} c={c} />
              <SummaryRow label="Fotos" value={photos.length > 0 ? `${photos.length} anexadas` : "Sem fotos"} c={c} />
              <SummaryRow label="Ajudante" value={needsHelper ? "Sim (+R$35)" : "Não"} c={c} />
              <SummaryRow
                label="Quando"
                value={
                  scheduled
                    ? SCHEDULE_OPTIONS.find((o) => o.id === scheduleId)?.label || "Agendado"
                    : "Agora (assim que prestador aceitar)"
                }
                c={c}
              />

              <View style={[styles.summaryTotal, { borderTopColor: c.borderLight }]}>
                <Text style={[styles.totalLabel, { color: c.text }]}>Valor estimado</Text>
                <Text style={[styles.totalValue, { color: accent }]}>R${estimatedPrice}</Text>
              </View>
            </View>

            <View style={[styles.warnBox, { backgroundColor: c.primaryLight, borderColor: `${accent}33` }]}>
              <Ionicons name="key" size={14} color={accent} />
              <Text style={[styles.warnText, { color: c.text }]}>
                Após confirmar, mostraremos um código PIN único. Guarde-o — você vai precisar no final do serviço.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: c.card, borderTopColor: c.borderLight, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PrimaryButton
          title={step === totalSteps ? (submitting ? "Enviando..." : "Confirmar Pedido") : "Continuar"}
          onPress={handleNext}
          color={accent}
          disabled={!canContinue || submitting}
        />
      </View>
    </View>
    </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value, c }: { label: string; value: string; c: ReturnType<typeof colorsLightShim> }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: c.softMuted }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: c.text }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// shim used only for typing
const colorsLightShim = () => colors.light;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 22, height: 4, borderRadius: 2 },
  content: { padding: 24, paddingBottom: 130 },
  providerStrip: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 18 },
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
  helper: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 6 },
  input: { height: 36, fontSize: 14, fontFamily: fonts.sans.semibold, borderBottomWidth: 1 },
  textArea: { minHeight: 110, borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 14, fontFamily: fonts.sans.regular, textAlignVertical: "top" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoTile: { width: 70, height: 70, borderRadius: 12, overflow: "hidden" },
  photoImg: { width: "100%", height: "100%" },
  photoCheck: { position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  toggleCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  toggleIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  toggleTitle: { fontSize: 14, fontFamily: fonts.sans.bold },
  toggleSub: { fontSize: 11, fontFamily: fonts.sans.regular, marginTop: 2 },
  scheduleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  scheduleChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  scheduleTxt: { fontSize: 12, fontFamily: fonts.sans.bold },
  summaryCard: { padding: 18, borderRadius: 18, borderWidth: 1 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10, gap: 12 },
  summaryLabel: { fontSize: 12, fontFamily: fonts.sans.regular, flexShrink: 0 },
  summaryValue: { fontSize: 12, fontFamily: fonts.sans.bold, flex: 1, textAlign: "right" },
  summaryTotal: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 14, marginTop: 4, borderTopWidth: 1 },
  totalLabel: { fontSize: 15, fontFamily: fonts.sans.bold },
  totalValue: { fontSize: 22, fontFamily: fonts.serif.extra },
  warnBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 14 },
  warnText: { flex: 1, fontSize: 11, fontFamily: fonts.sans.medium, lineHeight: 15 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 14, borderTopWidth: 1 },
});
