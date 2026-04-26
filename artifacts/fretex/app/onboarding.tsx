import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import colors, { fonts, shadows } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

type Step = "welcome" | "name" | "phone" | "gps" | "done";

const STEPS: Step[] = ["welcome", "name", "phone", "gps", "done"];

export default function OnboardingScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { user, completeOnboarding } = useAuth();

  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [gpsGranted, setGpsGranted] = useState<boolean | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const isProvider = user?.role === "prestador";
  const stepIndex = STEPS.indexOf(step);
  const progress = (stepIndex / (STEPS.length - 1)) * 100;

  const transition = (next: Step, direction: 1 | -1 = 1) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -24 * direction, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(24 * direction);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  };

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return raw;
  };

  const validateName = () => {
    if (name.trim().length < 3) {
      setNameError("O nome precisa ter pelo menos 3 caracteres.");
      return false;
    }
    setNameError(null);
    return true;
  };

  const validatePhone = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) {
      setPhoneError("Digite um número válido com DDD (ex: 21 99999-0000).");
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const requestGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      setGpsGranted(granted);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      transition("done");
    } catch {
      setGpsGranted(false);
      transition("done");
    }
  };

  const skipGps = () => {
    setGpsGranted(false);
    transition("done");
  };

  const finish = async () => {
    if (submitting) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await completeOnboarding(name.trim(), phone.replace(/\D/g, ""), gpsGranted === true);
    router.replace("/");
  };

  const goBack = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) transition(prev, -1);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* Progress bar */}
          {step !== "welcome" && step !== "done" && (
            <View style={[styles.progressTrack, { backgroundColor: c.borderLight }]}>
              <Animated.View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: c.primary }]} />
            </View>
          )}

          {/* Back button */}
          {step !== "welcome" && step !== "done" && (
            <Pressable onPress={goBack} style={[styles.backBtn, { backgroundColor: c.card, borderColor: c.border }]}>
              <Ionicons name="chevron-back" size={18} color={c.text} />
            </Pressable>
          )}

          <Animated.View
            style={[styles.content, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}
          >
            {/* ─── Welcome ─── */}
            {step === "welcome" && (
              <View style={styles.centerSection}>
                <LinearGradient
                  colors={[c.primary, "#E8B400"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.logo, shadows.md]}
                >
                  <Text style={styles.logoText}>A</Text>
                </LinearGradient>

                <Text style={[styles.brand, { color: c.text }]}>Ajudaê</Text>
                <Text style={[styles.tagline, { color: c.sub }]}>
                  Serviços de confiança,{"\n"}perto de você.
                </Text>

                <View style={[styles.featureList, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
                  <FeatureRow icon="shield-checkmark" text="Prestadores verificados e avaliados" c={c} />
                  <FeatureRow icon="navigate" text="Localização em tempo real do serviço" c={c} />
                  <FeatureRow icon="lock-closed" text="Pagamento seguro com PIN de confirmação" c={c} />
                </View>

                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    transition("name");
                  }}
                  style={[styles.primaryBtn, { backgroundColor: c.primary }, shadows.md]}
                >
                  <Text style={styles.primaryBtnTxt}>Começar configuração</Text>
                  <Ionicons name="arrow-forward" size={16} color="#1A1714" />
                </Pressable>
              </View>
            )}

            {/* ─── Name ─── */}
            {step === "name" && (
              <View style={styles.formSection}>
                <View style={[styles.stepIcon, { backgroundColor: `${c.primary}18` }]}>
                  <Ionicons name="person" size={26} color={c.primary} />
                </View>
                <Text style={[styles.stepTitle, { color: c.text }]}>Como você se chama?</Text>
                <Text style={[styles.stepSub, { color: c.softMuted }]}>
                  Seu nome é exibido para os prestadores ao fazer um pedido.
                </Text>

                <TextInput
                  value={name}
                  onChangeText={(v) => { setName(v); setNameError(null); }}
                  placeholder="Seu nome completo"
                  placeholderTextColor={c.softMuted}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={() => { if (validateName()) transition("phone"); }}
                  style={[
                    styles.input,
                    { backgroundColor: c.card, borderColor: nameError ? c.destructive : c.border, color: c.text },
                  ]}
                />
                {nameError && (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={13} color={c.destructive} />
                    <Text style={[styles.errorTxt, { color: c.destructive }]}>{nameError}</Text>
                  </View>
                )}

                <Pressable
                  onPress={() => { if (validateName()) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); transition("phone"); } }}
                  style={[styles.primaryBtn, { backgroundColor: c.primary, marginTop: 24 }, shadows.md]}
                >
                  <Text style={styles.primaryBtnTxt}>Continuar</Text>
                  <Ionicons name="arrow-forward" size={16} color="#1A1714" />
                </Pressable>
              </View>
            )}

            {/* ─── Phone ─── */}
            {step === "phone" && (
              <View style={styles.formSection}>
                <View style={[styles.stepIcon, { backgroundColor: `${c.blue}18` }]}>
                  <Ionicons name="call" size={26} color={c.blue} />
                </View>
                <Text style={[styles.stepTitle, { color: c.text }]}>Seu número de telefone</Text>
                <Text style={[styles.stepSub, { color: c.softMuted }]}>
                  Usado pelo prestador para entrar em contato após o aceite do pedido.
                </Text>

                <TextInput
                  value={phone}
                  onChangeText={(v) => { setPhone(formatPhone(v)); setPhoneError(null); }}
                  placeholder="(21) 99999-0000"
                  placeholderTextColor={c.softMuted}
                  keyboardType="phone-pad"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => { if (validatePhone()) transition("gps"); }}
                  style={[
                    styles.input,
                    { backgroundColor: c.card, borderColor: phoneError ? c.destructive : c.border, color: c.text },
                  ]}
                />
                {phoneError && (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={13} color={c.destructive} />
                    <Text style={[styles.errorTxt, { color: c.destructive }]}>{phoneError}</Text>
                  </View>
                )}

                <Pressable
                  onPress={() => { if (validatePhone()) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); transition("gps"); } }}
                  style={[styles.primaryBtn, { backgroundColor: c.primary, marginTop: 24 }, shadows.md]}
                >
                  <Text style={styles.primaryBtnTxt}>Continuar</Text>
                  <Ionicons name="arrow-forward" size={16} color="#1A1714" />
                </Pressable>
              </View>
            )}

            {/* ─── GPS ─── */}
            {step === "gps" && (
              <View style={styles.centerSection}>
                <LinearGradient
                  colors={[c.blue, "#1D4ED8"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.gpsIcon, shadows.md]}
                >
                  <Ionicons name="navigate" size={36} color="#fff" />
                </LinearGradient>

                <Text style={[styles.stepTitle, { color: c.text }]}>Permitir localização?</Text>
                <Text style={[styles.stepSub, { color: c.softMuted }]}>
                  Para encontrar prestadores perto de você e calcular distâncias em tempo real.
                </Text>

                <View style={[styles.gpsCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
                  <FeatureRow icon="map" text="Veja prestadores próximos no mapa" c={c} />
                  <FeatureRow icon="time" text="Estimativa de tempo de chegada precisa" c={c} />
                  <FeatureRow icon="trending-up" text="Resultados mais relevantes para você" c={c} />
                </View>

                <Pressable
                  onPress={requestGps}
                  style={[styles.primaryBtn, { backgroundColor: c.blue }, shadows.md]}
                >
                  <Ionicons name="navigate" size={16} color="#fff" />
                  <Text style={[styles.primaryBtnTxt, { color: "#fff" }]}>Permitir localização</Text>
                </Pressable>

                <Pressable onPress={skipGps} style={styles.skipBtn}>
                  <Text style={[styles.skipTxt, { color: c.sub }]}>Pular por agora</Text>
                  <Text style={[styles.skipNote, { color: c.softMuted }]}>Os resultados serão menos precisos</Text>
                </Pressable>
              </View>
            )}

            {/* ─── Done ─── */}
            {step === "done" && (
              <View style={styles.centerSection}>
                <LinearGradient
                  colors={[c.success, "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.doneIcon, shadows.md]}
                >
                  <Ionicons name="checkmark-circle" size={44} color="#fff" />
                </LinearGradient>

                <Text style={[styles.doneTitle, { color: c.text }]}>Tudo pronto!</Text>
                <Text style={[styles.doneSub, { color: c.softMuted }]}>
                  {isProvider
                    ? "Seu cadastro foi enviado para análise. Você receberá um aviso em até 24h após a aprovação."
                    : "Bem-vindo ao Ajudaê. Encontre prestadores verificados perto de você agora."}
                </Text>

                {gpsGranted === false && (
                  <View style={[styles.gpsWarnBox, { backgroundColor: c.warningLight, borderColor: `${c.warning}66` }]}>
                    <Ionicons name="alert-circle" size={14} color={c.warning} />
                    <Text style={[styles.gpsWarnTxt, { color: c.text }]}>
                      Localização não habilitada. Os resultados serão menos precisos. Você pode ativar depois em Configurações.
                    </Text>
                  </View>
                )}

                {isProvider && (
                  <View style={[styles.providerBox, { backgroundColor: `${c.blue}10`, borderColor: `${c.blue}33` }]}>
                    <Ionicons name="time" size={14} color={c.blue} />
                    <Text style={[styles.gpsWarnTxt, { color: c.text }]}>
                      Aguardando aprovação manual pela equipe Ajudaê. Você ficará invisível no mapa até ser verificado.
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={finish}
                  disabled={submitting}
                  style={[styles.primaryBtn, { backgroundColor: c.primary, opacity: submitting ? 0.7 : 1, marginTop: 32 }, shadows.md]}
                >
                  <Text style={styles.primaryBtnTxt}>{submitting ? "Entrando..." : "Ir para o app"}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#1A1714" />
                </Pressable>
              </View>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

function FeatureRow({ icon, text, c }: { icon: any; text: string; c: any }) {
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIconWrap, { backgroundColor: `${c.primary}18` }]}>
        <Ionicons name={icon} size={14} color={c.primary} />
      </View>
      <Text style={[styles.featureTxt, { color: c.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  progressTrack: { height: 3, marginHorizontal: 24, marginTop: 16, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 2 },
  backBtn: {
    position: "absolute",
    top: 52,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },

  centerSection: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 24 },
  formSection: { flex: 1, paddingTop: 48, paddingBottom: 24 },

  logo: { width: 80, height: 80, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  logoText: { fontSize: 42, fontFamily: "Fraunces_900Black", color: "#1A1714" },
  brand: { fontSize: 32, fontFamily: "Fraunces_800ExtraBold", marginBottom: 8 },
  tagline: { fontSize: 16, fontFamily: "Figtree_400Regular", textAlign: "center", lineHeight: 23, marginBottom: 28 },

  featureList: { borderRadius: 16, borderWidth: 1, padding: 16, alignSelf: "stretch", marginBottom: 28, gap: 2 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 7 },
  featureIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  featureTxt: { flex: 1, fontSize: 13, fontFamily: "Figtree_500Medium" },

  stepIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  stepTitle: { fontSize: 26, fontFamily: "Fraunces_800ExtraBold", marginBottom: 8, lineHeight: 31 },
  stepSub: { fontSize: 13, fontFamily: "Figtree_400Regular", lineHeight: 19, marginBottom: 24 },

  input: { height: 52, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, fontSize: 15, fontFamily: "Figtree_500Medium" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  errorTxt: { fontSize: 12, fontFamily: "Figtree_600SemiBold" },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    alignSelf: "stretch",
  },
  primaryBtnTxt: { fontSize: 15, fontFamily: "Figtree_700Bold", color: "#1A1714" },

  gpsIcon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  gpsCard: { borderRadius: 16, borderWidth: 1, padding: 16, alignSelf: "stretch", marginBottom: 20, gap: 2 },
  skipBtn: { alignItems: "center", marginTop: 14, gap: 2 },
  skipTxt: { fontSize: 13, fontFamily: "Figtree_600SemiBold" },
  skipNote: { fontSize: 11, fontFamily: "Figtree_400Regular" },

  doneIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  doneTitle: { fontSize: 30, fontFamily: "Fraunces_800ExtraBold", marginBottom: 10 },
  doneSub: { fontSize: 14, fontFamily: "Figtree_400Regular", textAlign: "center", lineHeight: 21, marginBottom: 20, paddingHorizontal: 8 },
  gpsWarnBox: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 12, borderRadius: 12, borderWidth: 1, alignSelf: "stretch", marginBottom: 10 },
  providerBox: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 12, borderRadius: 12, borderWidth: 1, alignSelf: "stretch" },
  gpsWarnTxt: { flex: 1, fontSize: 12, fontFamily: "Figtree_500Medium", lineHeight: 17 },
});
