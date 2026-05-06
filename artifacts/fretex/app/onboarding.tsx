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
  ScrollView,
  Image,
  Alert,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import colors, { fonts, shadows } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function sanitize(raw: string): string {
  return raw.replace(/<[^>]*>/g, "").replace(/[<>"'`\\]/g, "").trimStart();
}

function maskCPF(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function maskDate(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return d
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d)/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}

function maskPlate(raw: string): string {
  const v = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  if (v.length <= 3) return v;
  return v.slice(0, 3) + "-" + v.slice(3);
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

function validateDate(v: string): boolean {
  if (v.length < 10) return false;
  const day = parseInt(v.slice(0, 2));
  const month = parseInt(v.slice(3, 5));
  const year = parseInt(v.slice(6, 10));
  const dt = new Date(year, month - 1, day);
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
}

function validatePlate(raw: string): boolean {
  const v = raw.replace("-", "");
  return /^[A-Z]{3}\d{4}$/.test(v) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(v);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ERROR_COLOR = "#DC2626";

/* ─── Sub-components ───────────────────────────────────────────────────── */

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 }}>
      <Ionicons name="alert-circle" size={12} color={ERROR_COLOR} />
      <Text style={{ fontSize: 11, fontFamily: fonts.sans.medium, color: ERROR_COLOR }}>{msg}</Text>
    </View>
  );
}

function FieldSuccess({ show }: { show: boolean }) {
  const c = colors.light;
  if (!show) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 }}>
      <Ionicons name="checkmark-circle" size={12} color={c.success} />
      <Text style={{ fontSize: 11, fontFamily: fonts.sans.medium, color: c.success }}>OK</Text>
    </View>
  );
}

function Label({ text, required }: { text: string; required?: boolean }) {
  const c = colors.light;
  return (
    <Text style={{ fontSize: 10, fontFamily: fonts.sans.bold, letterSpacing: 0.8, color: c.softMuted, marginTop: 14, marginBottom: 6 }}>
      {text}
      {required && <Text style={{ color: ERROR_COLOR }}> *</Text>}
    </Text>
  );
}

function Input({
  value, onChangeText, placeholder, keyboardType, maxLength, secureTextEntry, error, success, hint, style, autoCapitalize,
}: {
  value: string; onChangeText: (t: string) => void; placeholder?: string;
  keyboardType?: any; maxLength?: number; secureTextEntry?: boolean;
  error?: string; success?: boolean; hint?: string; style?: any; autoCapitalize?: any;
}) {
  const c = colors.light;
  const borderColor = error ? ERROR_COLOR : success ? c.success : c.border;
  return (
    <>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.softMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? "none"}
        autoCorrect={false}
        style={[{
          height: 50, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16,
          fontSize: 14, fontFamily: fonts.sans.medium,
          backgroundColor: c.card, borderColor, color: c.text,
        }, style]}
      />
      {hint && !error && !success && (
        <Text style={{ fontSize: 10, fontFamily: fonts.sans.regular, color: c.softMuted, marginTop: 4 }}>{hint}</Text>
      )}
      {error ? <FieldError msg={error} /> : <FieldSuccess show={!!success && value.length > 0} />}
    </>
  );
}

/* ─── Progress stepper ─────────────────────────────────────────────────── */
function StepProgress({ step, total }: { step: number; total: number }) {
  const c = colors.light;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 24, marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <React.Fragment key={n}>
            <View style={{
              width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center",
              backgroundColor: done ? c.blue : active ? c.primary : c.borderLight,
            }}>
              {done
                ? <Ionicons name="checkmark" size={13} color="#fff" />
                : <Text style={{ fontSize: 11, fontFamily: fonts.sans.bold, color: active ? "#1A1714" : c.softMuted }}>{n}</Text>
              }
            </View>
            {i < total - 1 && (
              <View style={{ flex: 1, height: 2, backgroundColor: done ? c.blue : c.borderLight, marginHorizontal: 4 }} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

/* ─── Doc Picker Row ───────────────────────────────────────────────────── */
function DocPickerRow({
  label, required, uri, onPick, hint,
}: {
  label: string; required?: boolean; uri?: string; onPick: () => void; hint?: string;
}) {
  const c = colors.light;
  return (
    <View style={{ marginBottom: 4 }}>
      <Label text={label} required={required} />
      <Pressable
        onPress={onPick}
        style={{
          height: 52, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed",
          borderColor: uri ? c.blue : c.border, backgroundColor: uri ? `${c.blue}0F` : c.card,
          flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10,
        }}
      >
        <Ionicons name={uri ? "checkmark-circle" : "document-outline"} size={18} color={uri ? c.blue : c.softMuted} />
        <Text style={{ flex: 1, fontSize: 13, fontFamily: fonts.sans.medium, color: uri ? c.blue : c.softMuted }} numberOfLines={1}>
          {uri ? uri.split("/").pop()?.slice(0, 36) || "Arquivo selecionado" : "Toque para selecionar"}
        </Text>
        {uri && <Ionicons name="checkmark" size={14} color={c.blue} />}
      </Pressable>
      {hint && !uri && (
        <Text style={{ fontSize: 10, fontFamily: fonts.sans.regular, color: c.softMuted, marginTop: 4 }}>{hint}</Text>
      )}
    </View>
  );
}

/* ─── Type ─────────────────────────────────────────────────────────────── */
interface ProviderFormData {
  nome: string;
  cpf: string;
  dataNasc: string;
  telefone: string;
  email: string;
  fotoUri?: string;
  tipoServico: "frete" | "mudanca" | "";
  categoria: string;
  docRgUri?: string;
  docResidenciaUri?: string;
  docCnhUri?: string;
  docCrlvUri?: string;
  qualityChecks: boolean[];
  veiculoModelo: string;
  veiculoAno: string;
  veiculoPlaca: string;
  veiculoTipo: string;
  contatoMetodo: "ligacao" | "whatsapp" | "";
  contatoDisponibilidade: string;
}

const INITIAL_FORM: ProviderFormData = {
  nome: "", cpf: "", dataNasc: "", telefone: "", email: "",
  tipoServico: "", categoria: "", qualityChecks: [false, false, false, false],
  veiculoModelo: "", veiculoAno: "", veiculoPlaca: "", veiculoTipo: "",
  contatoMetodo: "", contatoDisponibilidade: "",
};

const CATEGORIAS: Record<"frete" | "mudanca", { value: string; label: string }[]> = {
  frete: [
    { value: "frete-leve", label: "Frete leve" },
    { value: "frete-medio", label: "Frete médio" },
  ],
  mudanca: [
    { value: "mudanca-pequena", label: "Mudança pequena" },
    { value: "mudanca-media", label: "Mudança média" },
    { value: "mudanca-grande", label: "Mudança grande" },
  ],
};

const VEHICLE_TYPES = [
  { value: "car", label: "Carro utilitário / pickup pequena" },
  { value: "utility", label: "Pickup média" },
  { value: "van", label: "Furgão / Van de carga" },
  { value: "truck_small", label: "Van grande / Caminhão pequeno" },
  { value: "truck_large", label: "Caminhão" },
];

const DISPONIBILIDADE = [
  { value: "manha", label: "Manhã (8h–12h)" },
  { value: "tarde", label: "Tarde (13h–18h)" },
  { value: "noite", label: "Noite (18h–21h)" },
  { value: "qualquer", label: "Qualquer horário" },
];

/* ══════════════════════════════════════════════════════════════════════════
   PRESTADOR ONBOARDING — 5 steps
   ══════════════════════════════════════════════════════════════════════════ */
function ProviderOnboarding() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { user, completeOnboarding } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ProviderFormData>({
    ...INITIAL_FORM,
    nome: user?.name || "",
    telefone: user?.phone ? maskPhone(user.phone) : "",
    email: user?.email || "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProviderFormData | "foto" | "qualityChecks", string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPhotoSource, setShowPhotoSource] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const set = (k: keyof ProviderFormData, v: any) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const transition = (next: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  /* ── Validation ── */
  const validateStep1 = (): boolean => {
    const errs: typeof errors = {};
    if (!form.nome.trim())
      errs.nome = "Nome completo é obrigatório.";
    else if (form.nome.trim().split(/\s+/).filter((w) => w.length >= 2).length < 2)
      errs.nome = "Informe nome e sobrenome (mínimo 2 palavras).";
    if (!validateCPF(form.cpf))
      errs.cpf = "CPF inválido — verifique os dígitos informados.";
    if (!validateDate(form.dataNasc))
      errs.dataNasc = "Data inválida. Use o formato DD/MM/AAAA.";
    if (form.telefone.replace(/\D/g, "").length < 10)
      errs.telefone = "Telefone inválido. Inclua o DDD (ex: 21 99999-0000).";
    if (!EMAIL_RE.test(form.email.trim()))
      errs.email = "E-mail inválido (ex: nome@dominio.com).";
    if (!form.fotoUri)
      errs.foto = "Foto de perfil obrigatória — use galeria ou câmera.";
    if (Object.keys(errs).length) { setErrors(errs); return false; }
    return true;
  };

  const validateStep2 = (): boolean => {
    const errs: typeof errors = {};
    if (!form.tipoServico) errs.tipoServico = "Selecione o tipo de serviço que você oferece.";
    if (!form.categoria) errs.categoria = "Selecione a categoria do serviço.";
    if (Object.keys(errs).length) { setErrors(errs); return false; }
    return true;
  };

  const validateStep3 = (): boolean => {
    const errs: typeof errors = {};
    if (!form.docRgUri) errs.docRgUri = "RG ou documento de identidade é obrigatório.";
    if (!form.docResidenciaUri) errs.docResidenciaUri = "Comprovante de residência (máx. 90 dias) é obrigatório.";
    if (!form.docCnhUri) errs.docCnhUri = "CNH dentro da validade é obrigatória.";
    if (!form.qualityChecks.every(Boolean)) errs.qualityChecks = "Confirme todos os 4 critérios de qualidade para continuar.";
    if (Object.keys(errs).length) { setErrors(errs); return false; }
    return true;
  };

  const validateStep4 = (): boolean => {
    const errs: typeof errors = {};
    if (!form.veiculoModelo.trim())
      errs.veiculoModelo = "Modelo do veículo é obrigatório (ex: Fiat Strada).";
    if (!form.veiculoAno || parseInt(form.veiculoAno) < 1990 || parseInt(form.veiculoAno) > new Date().getFullYear() + 1)
      errs.veiculoAno = `Ano inválido — informe entre 1990 e ${new Date().getFullYear() + 1}.`;
    if (!validatePlate(form.veiculoPlaca))
      errs.veiculoPlaca = "Placa inválida. Use ABC-1234 (antiga) ou ABC1D23 (Mercosul).";
    if (!form.veiculoTipo)
      errs.veiculoTipo = "Selecione o tipo do veículo utilizado.";
    if (!form.contatoMetodo)
      errs.contatoMetodo = "Selecione como prefere ser contactado pela equipe.";
    if (!form.contatoDisponibilidade)
      errs.contatoDisponibilidade = "Selecione seu horário disponível para contato.";
    if (Object.keys(errs).length) { setErrors(errs); return false; }
    return true;
  };

  const goNext = () => {
    const validators: Record<number, () => boolean> = {
      1: validateStep1, 2: validateStep2, 3: validateStep3, 4: validateStep4,
    };
    if (step < 5 && !validators[step]?.()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    transition(step + 1);
  };

  const goBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    transition(step - 1);
  };

  /* ── Image pickers ── */
  const pickPhotoFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Precisamos de acesso à galeria para selecionar sua foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      set("fotoUri", result.assets[0].uri);
    }
  };

  const pickPhotoFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Precisamos de acesso à câmera para tirar a foto.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      set("fotoUri", result.assets[0].uri);
    }
  };

  const pickDoc = async (field: "docRgUri" | "docResidenciaUri" | "docCnhUri" | "docCrlvUri") => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Precisamos de acesso à galeria para selecionar documentos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      set(field, result.assets[0].uri);
      setErrors((p) => ({ ...p, [field]: "" }));
    }
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      if (user?.id) {
        // Update profile
        await supabase.from("profiles").update({
          name: form.nome.trim(),
          phone: form.telefone.replace(/\D/g, ""),
          cpf: form.cpf.replace(/\D/g, ""),
        }).eq("id", user.id);

        // Update providers row
        await supabase.from("providers").update({
          vehicle_model: form.veiculoModelo.trim(),
          vehicle_year: parseInt(form.veiculoAno),
          vehicle_plate: form.veiculoPlaca.replace("-", ""),
          vehicle_type: form.veiculoTipo,
          contact_method: form.contatoMetodo,
          contact_availability: form.contatoDisponibilidade,
          onboarding_status: "submitted",
        }).eq("id", user.id);
      }
      // completeOnboarding syncs local state
      await completeOnboarding(form.nome.trim(), form.telefone.replace(/\D/g, ""), false);
      router.replace("/");
    } catch {
      Alert.alert("Erro", "Não foi possível enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── SelectRow helper ── */
  const SelectRow = ({ options, value, onSelect }: {
    options: { value: string; label: string }[];
    value: string;
    onSelect: (v: string) => void;
  }) => (
    <View style={{ gap: 8 }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 12,
              padding: 14, borderRadius: 12, borderWidth: 1,
              borderColor: active ? c.blue : c.border,
              backgroundColor: active ? `${c.blue}0F` : c.card,
            }}
          >
            <View style={{
              width: 18, height: 18, borderRadius: 9, borderWidth: 2,
              borderColor: active ? c.blue : c.border,
              alignItems: "center", justifyContent: "center",
            }}>
              {active && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.blue }} />}
            </View>
            <Text style={{ fontSize: 13, fontFamily: active ? fonts.sans.bold : fonts.sans.regular, color: c.text }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 24, marginBottom: 16 }}>
          {step > 1 && (
            <Pressable onPress={goBack} style={[prov.backBtn, { backgroundColor: c.card, borderColor: c.border }]}>
              <Ionicons name="chevron-back" size={18} color={c.text} />
            </Pressable>
          )}
          <View style={{ flex: 1, marginLeft: step > 1 ? 12 : 0 }}>
            <Text style={{ fontSize: 11, fontFamily: fonts.sans.bold, color: c.softMuted, letterSpacing: 0.8 }}>CADASTRO DE PRESTADOR</Text>
            <Text style={{ fontSize: 13, fontFamily: fonts.sans.medium, color: c.sub }}>Etapa {step} de 5</Text>
          </View>
          <View style={[prov.badge, { backgroundColor: `${c.blue}14`, borderColor: `${c.blue}44` }]}>
            <Ionicons name="construct" size={11} color={c.blue} />
            <Text style={{ fontSize: 11, fontFamily: fonts.sans.bold, color: c.blue }}>Prestador</Text>
          </View>
        </View>

        <StepProgress step={step} total={5} />

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 80 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* ── STEP 1: Dados pessoais ── */}
            {step === 1 && (
              <View>
                <Text style={[prov.title, { color: c.text }]}>Dados pessoais</Text>
                <Text style={[prov.sub, { color: c.sub }]}>Preencha suas informações básicas. Campos com * são obrigatórios.</Text>

                <Label text="NOME COMPLETO" required />
                <Input
                  value={form.nome}
                  onChangeText={(t) => set("nome", sanitize(t))}
                  placeholder="Ex.: João da Silva"
                  autoCapitalize="words"
                  maxLength={100}
                  error={errors.nome}
                  success={!errors.nome && form.nome.trim().split(/\s+/).filter((w) => w.length >= 2).length >= 2}
                  hint="Como aparece nos documentos oficiais"
                />

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Label text="CPF" required />
                    <Input
                      value={form.cpf}
                      onChangeText={(t) => set("cpf", maskCPF(t))}
                      placeholder="000.000.000-00"
                      keyboardType="numeric"
                      maxLength={14}
                      error={errors.cpf}
                      success={!errors.cpf && validateCPF(form.cpf)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Label text="NASCIMENTO" required />
                    <Input
                      value={form.dataNasc}
                      onChangeText={(t) => set("dataNasc", maskDate(t))}
                      placeholder="DD/MM/AAAA"
                      keyboardType="numeric"
                      maxLength={10}
                      error={errors.dataNasc}
                      success={!errors.dataNasc && validateDate(form.dataNasc)}
                      hint="+18 anos"
                    />
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Label text="TELEFONE / WHATSAPP" required />
                    <Input
                      value={form.telefone}
                      onChangeText={(t) => set("telefone", maskPhone(t))}
                      placeholder="(00) 00000-0000"
                      keyboardType="phone-pad"
                      maxLength={15}
                      error={errors.telefone}
                      success={!errors.telefone && form.telefone.replace(/\D/g, "").length >= 10}
                      hint="Com DDD"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Label text="EMAIL" required />
                    <Input
                      value={form.email}
                      onChangeText={(t) => set("email", sanitize(t).toLowerCase())}
                      placeholder="email@exemplo.com"
                      keyboardType="email-address"
                      maxLength={100}
                      error={errors.email}
                      success={!errors.email && EMAIL_RE.test(form.email.trim())}
                    />
                  </View>
                </View>

                {/* Foto de perfil */}
                <View style={[prov.sectionDivider, { borderColor: c.border }]} />
                <Text style={[prov.sectionTitle, { color: c.text }]}>Foto de perfil</Text>
                <Text style={{ fontSize: 11, fontFamily: fonts.sans.regular, color: c.softMuted, marginBottom: 12 }}>
                  Use a câmera frontal para uma selfie ou escolha da galeria.
                </Text>

                <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
                  <Pressable
                    onPress={() => setShowPhotoSource(true)}
                    style={[prov.photoCircle, {
                      borderColor: errors.foto ? ERROR_COLOR : form.fotoUri ? c.blue : c.border,
                      backgroundColor: form.fotoUri ? "transparent" : c.card,
                    }]}
                  >
                    {form.fotoUri
                      ? <Image source={{ uri: form.fotoUri }} style={{ width: 72, height: 72, borderRadius: 36 }} />
                      : <Ionicons name="camera" size={28} color={errors.foto ? ERROR_COLOR : c.softMuted} />
                    }
                  </Pressable>
                  <View style={{ flex: 1, gap: 8 }}>
                    <Pressable
                      onPress={() => { setShowPhotoSource(false); setTimeout(pickPhotoFromCamera, 100); }}
                      style={[prov.photoBtn, { borderColor: c.blue, backgroundColor: `${c.blue}0F` }]}
                    >
                      <Ionicons name="camera" size={15} color={c.blue} />
                      <Text style={{ fontSize: 12, fontFamily: fonts.sans.medium, color: c.blue }}>Tirar foto agora</Text>
                    </Pressable>
                    <Pressable
                      onPress={pickPhotoFromGallery}
                      style={[prov.photoBtn, { borderColor: form.fotoUri ? c.blue : c.border, backgroundColor: form.fotoUri ? `${c.blue}0F` : c.card }]}
                    >
                      <Ionicons name={form.fotoUri ? "checkmark-circle" : "image-outline"} size={15} color={form.fotoUri ? c.blue : c.softMuted} />
                      <Text style={{ fontSize: 12, fontFamily: fonts.sans.medium, color: form.fotoUri ? c.blue : c.softMuted }}>
                        {form.fotoUri ? "Foto selecionada ✓" : "Selecionar da galeria"}
                      </Text>
                    </Pressable>
                    {[
                      "Rosto visível e centralizado",
                      "Nítida e bem iluminada",
                    ].map((r) => (
                      <View key={r} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Ionicons name="checkmark-circle" size={12} color={form.fotoUri ? c.blue : c.softMuted} />
                        <Text style={{ fontSize: 10, fontFamily: fonts.sans.regular, color: c.softMuted }}>{r}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <FieldError msg={errors.foto} />
              </View>
            )}

            {/* ── STEP 2: Tipo de serviço ── */}
            {step === 2 && (
              <View>
                <Text style={[prov.title, { color: c.text }]}>Tipo de serviço</Text>
                <Text style={[prov.sub, { color: c.sub }]}>Selecione o tipo e a categoria do serviço que você irá oferecer.</Text>

                <Text style={[prov.sectionTitle, { color: c.text, marginTop: 0 }]}>Tipo de serviço *</Text>
                <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
                  {[
                    { value: "frete" as const, icon: "🚚", label: "Frete", desc: "Transporte leve a médio" },
                    { value: "mudanca" as const, icon: "📦", label: "Mudança", desc: "Pequena, média ou grande" },
                  ].map((opt) => {
                    const active = form.tipoServico === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => { set("tipoServico", opt.value); set("categoria", ""); }}
                        style={[
                          prov.svcCard,
                          { borderColor: active ? c.blue : c.border, backgroundColor: active ? `${c.blue}0F` : c.card },
                          active && { borderWidth: 2 },
                        ]}
                      >
                        <Text style={{ fontSize: 28 }}>{opt.icon}</Text>
                        <Text style={{ fontSize: 14, fontFamily: fonts.sans.bold, color: c.text }}>{opt.label}</Text>
                        <Text style={{ fontSize: 11, fontFamily: fonts.sans.regular, color: c.softMuted, textAlign: "center" }}>{opt.desc}</Text>
                        {active && (
                          <View style={[prov.svcCheck, { backgroundColor: c.blue }]}>
                            <Ionicons name="checkmark" size={10} color="#fff" />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
                <FieldError msg={errors.tipoServico} />

                {form.tipoServico !== "" && (
                  <>
                    <View style={[prov.sectionDivider, { borderColor: c.border }]} />
                    <Text style={[prov.sectionTitle, { color: c.text }]}>Categoria *</Text>
                    <SelectRow
                      options={CATEGORIAS[form.tipoServico]}
                      value={form.categoria}
                      onSelect={(v) => set("categoria", v)}
                    />
                    <FieldError msg={errors.categoria} />
                  </>
                )}
              </View>
            )}

            {/* ── STEP 3: Documentos ── */}
            {step === 3 && (
              <View>
                <Text style={[prov.title, { color: c.text }]}>Documentos</Text>
                <Text style={[prov.sub, { color: c.sub }]}>
                  Envie seus documentos. Devem estar legíveis, completos e com boa iluminação.
                </Text>

                <Text style={[prov.sectionTitle, { color: c.text, marginTop: 0 }]}>Documentos obrigatórios</Text>

                <DocPickerRow
                  label="DOCUMENTO DE IDENTIDADE (RG OU EQUIVALENTE)"
                  required
                  uri={form.docRgUri}
                  onPick={() => pickDoc("docRgUri")}
                  hint="JPG ou PNG · máx. 10 MB"
                />
                <FieldError msg={errors.docRgUri} />

                <DocPickerRow
                  label="COMPROVANTE DE RESIDÊNCIA"
                  required
                  uri={form.docResidenciaUri}
                  onPick={() => pickDoc("docResidenciaUri")}
                  hint="Emitido há no máx. 90 dias · JPG ou PNG · máx. 10 MB"
                />
                <FieldError msg={errors.docResidenciaUri} />

                <View style={[prov.sectionDivider, { borderColor: c.border }]} />
                <Text style={[prov.sectionTitle, { color: c.text }]}>Para motoristas</Text>

                <DocPickerRow
                  label="CNH — CARTEIRA NACIONAL DE HABILITAÇÃO"
                  required
                  uri={form.docCnhUri}
                  onPick={() => pickDoc("docCnhUri")}
                  hint="Dentro da validade · JPG ou PNG · máx. 10 MB"
                />
                <FieldError msg={errors.docCnhUri} />

                <DocPickerRow
                  label="CRLV — DOCUMENTO DO VEÍCULO"
                  uri={form.docCrlvUri}
                  onPick={() => pickDoc("docCrlvUri")}
                  hint="Opcional · JPG ou PNG · máx. 10 MB"
                />

                <View style={[prov.sectionDivider, { borderColor: c.border }]} />
                <Text style={[prov.sectionTitle, { color: c.text }]}>Critérios de qualidade</Text>

                {[
                  "Documentos legíveis — texto e dados claramente visíveis",
                  "Documentos completos — todas as páginas relevantes incluídas",
                  "Nome compatível com o cadastro — igual ao nome informado",
                  "Documentos dentro da validade — CNH, CRLV e comprovante",
                ].map((txt, i) => {
                  const checked = form.qualityChecks[i];
                  return (
                    <Pressable
                      key={i}
                      onPress={() => {
                        const next = [...form.qualityChecks];
                        next[i] = !next[i];
                        set("qualityChecks", next);
                        setErrors((p) => ({ ...p, qualityChecks: "" }));
                      }}
                      style={{
                        flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 10,
                        borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: c.borderLight,
                      }}
                    >
                      <View style={{
                        width: 20, height: 20, borderRadius: 6, borderWidth: 2, marginTop: 1,
                        borderColor: checked ? c.blue : c.border,
                        backgroundColor: checked ? c.blue : "transparent",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, fontFamily: fonts.sans.regular, color: c.text, lineHeight: 19 }}>{txt}</Text>
                    </Pressable>
                  );
                })}
                <FieldError msg={errors.qualityChecks} />
              </View>
            )}

            {/* ── STEP 4: Dados do veículo ── */}
            {step === 4 && (
              <View>
                <Text style={[prov.title, { color: c.text }]}>Dados do veículo</Text>
                <Text style={[prov.sub, { color: c.sub }]}>
                  Informe os dados do veículo utilizado. Ele deve ser compatível com a categoria selecionada.
                </Text>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 2 }}>
                    <Label text="MODELO" required />
                    <Input
                      value={form.veiculoModelo}
                      onChangeText={(t) => set("veiculoModelo", sanitize(t))}
                      placeholder="Ex.: Fiat Strada"
                      autoCapitalize="words"
                      maxLength={60}
                      error={errors.veiculoModelo}
                      success={!errors.veiculoModelo && form.veiculoModelo.trim().length > 0}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Label text="ANO" required />
                    <Input
                      value={form.veiculoAno}
                      onChangeText={(t) => set("veiculoAno", t.replace(/\D/g, "").slice(0, 4))}
                      placeholder="AAAA"
                      keyboardType="numeric"
                      maxLength={4}
                      error={errors.veiculoAno}
                      success={!errors.veiculoAno && form.veiculoAno.length === 4 && parseInt(form.veiculoAno) >= 1990}
                    />
                  </View>
                </View>

                <Label text="PLACA" required />
                <Input
                  value={form.veiculoPlaca}
                  onChangeText={(t) => set("veiculoPlaca", maskPlate(t))}
                  placeholder="ABC-1234"
                  autoCapitalize="characters"
                  maxLength={8}
                  error={errors.veiculoPlaca}
                  success={!errors.veiculoPlaca && validatePlate(form.veiculoPlaca)}
                  hint="Formato antigo (ABC-1234) ou Mercosul (ABC1D23)"
                />

                <Label text="TIPO DO VEÍCULO" required />
                <SelectRow
                  options={VEHICLE_TYPES}
                  value={form.veiculoTipo}
                  onSelect={(v) => set("veiculoTipo", v)}
                />
                <FieldError msg={errors.veiculoTipo} />

                <View style={[prov.sectionDivider, { borderColor: c.border }]} />
                <Text style={[prov.sectionTitle, { color: c.text }]}>Verificação de identidade</Text>
                <Text style={[prov.sub, { color: c.sub, marginBottom: 12 }]}>
                  Você será contatado antes da aprovação.
                </Text>

                <Label text="MÉTODO PREFERIDO" required />
                <SelectRow
                  options={[
                    { value: "ligacao", label: "Ligação telefônica" },
                    { value: "whatsapp", label: "WhatsApp" },
                  ]}
                  value={form.contatoMetodo}
                  onSelect={(v) => { set("contatoMetodo", v); }}
                />
                {errors.contatoMetodo && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                    <Ionicons name="alert-circle" size={12} color={ERROR_COLOR} />
                    <Text style={{ fontSize: 11, fontFamily: fonts.sans.medium, color: ERROR_COLOR }}>{errors.contatoMetodo}</Text>
                  </View>
                )}

                <Label text="DISPONIBILIDADE PARA CONTATO" required />
                <SelectRow
                  options={DISPONIBILIDADE}
                  value={form.contatoDisponibilidade}
                  onSelect={(v) => { set("contatoDisponibilidade", v); }}
                />
                {errors.contatoDisponibilidade && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                    <Ionicons name="alert-circle" size={12} color={ERROR_COLOR} />
                    <Text style={{ fontSize: 11, fontFamily: fonts.sans.medium, color: ERROR_COLOR }}>{errors.contatoDisponibilidade}</Text>
                  </View>
                )}
              </View>
            )}

            {/* ── STEP 5: Revisão ── */}
            {step === 5 && (
              <View>
                <Text style={[prov.title, { color: c.text }]}>Revise seu cadastro</Text>
                <Text style={[prov.sub, { color: c.sub }]}>Confira todas as informações antes de enviar. Volte a qualquer etapa para corrigir.</Text>

                {[
                  {
                    icon: "👤", title: "Dados pessoais",
                    rows: [
                      ["Nome", form.nome],
                      ["CPF", form.cpf],
                      ["Nascimento", form.dataNasc],
                      ["Telefone", form.telefone],
                      ["E-mail", form.email],
                      ["Foto de perfil", form.fotoUri ? "✓ Enviada" : "—"],
                    ],
                  },
                  {
                    icon: "🚚", title: "Tipo de serviço",
                    rows: [
                      ["Tipo", form.tipoServico === "frete" ? "Frete" : form.tipoServico === "mudanca" ? "Mudança" : "—"],
                      ["Categoria", (CATEGORIAS[form.tipoServico as "frete" | "mudanca"] ?? []).find((o) => o.value === form.categoria)?.label || form.categoria || "—"],
                    ],
                  },
                  {
                    icon: "📄", title: "Documentos",
                    rows: [
                      ["RG / Identidade", form.docRgUri ? "✓ Enviado" : "—"],
                      ["Comprovante", form.docResidenciaUri ? "✓ Enviado" : "—"],
                      ["CNH", form.docCnhUri ? "✓ Enviada" : "—"],
                      ["CRLV", form.docCrlvUri ? "✓ Enviado" : "—"],
                    ],
                  },
                  {
                    icon: "🚗", title: "Veículo",
                    rows: [
                      ["Modelo", form.veiculoModelo],
                      ["Ano", form.veiculoAno],
                      ["Placa", form.veiculoPlaca],
                      ["Tipo", VEHICLE_TYPES.find((v) => v.value === form.veiculoTipo)?.label || "—"],
                    ],
                  },
                  {
                    icon: "📞", title: "Verificação de identidade",
                    rows: [
                      ["Método", form.contatoMetodo === "ligacao" ? "Ligação telefônica" : form.contatoMetodo === "whatsapp" ? "WhatsApp" : "—"],
                      ["Disponibilidade", DISPONIBILIDADE.find((d) => d.value === form.contatoDisponibilidade)?.label || "—"],
                    ],
                  },
                ].map((card) => (
                  <View key={card.title} style={[prov.reviewCard, { backgroundColor: c.card, borderColor: c.border }]}>
                    <Text style={{ fontSize: 13, fontFamily: fonts.sans.bold, color: c.text, marginBottom: 10 }}>
                      {card.icon} {card.title}
                    </Text>
                    {card.rows.map(([label, value]) => (
                      <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: c.borderLight }}>
                        <Text style={{ fontSize: 12, fontFamily: fonts.sans.regular, color: c.softMuted }}>{label}</Text>
                        <Text style={{ fontSize: 12, fontFamily: fonts.sans.medium, color: c.text, maxWidth: "60%", textAlign: "right" }} numberOfLines={1}>{value || "—"}</Text>
                      </View>
                    ))}
                  </View>
                ))}

                <View style={[prov.infoBox, { backgroundColor: `${c.blue}0F`, borderColor: `${c.blue}33` }]}>
                  <Ionicons name="time-outline" size={14} color={c.blue} />
                  <Text style={{ flex: 1, fontSize: 12, fontFamily: fonts.sans.regular, color: c.text, lineHeight: 17 }}>
                    Nossa equipe irá analisar seu cadastro em até <Text style={{ fontFamily: fonts.sans.bold }}>24 horas</Text>.
                    Você receberá um aviso quando for aprovado.
                  </Text>
                </View>
              </View>
            )}

          </ScrollView>
        </Animated.View>

        {/* Bottom CTA */}
        <View style={[prov.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: c.background, borderColor: c.border }]}>
          <Pressable
            onPress={step < 5 ? goNext : handleSubmit}
            disabled={submitting}
            style={[prov.ctaBtn, { backgroundColor: c.blue, opacity: submitting ? 0.7 : 1 }, shadows.md]}
          >
            <Text style={{ fontSize: 15, fontFamily: fonts.sans.extra, color: "#fff" }}>
              {submitting ? "Enviando..." : step < 5 ? "Continuar" : "Enviar cadastro"}
            </Text>
            <Ionicons name={step < 5 ? "arrow-forward" : "checkmark-circle"} size={16} color="#fff" />
          </Pressable>
        </View>

        {/* Photo source picker */}
        <Modal visible={showPhotoSource} transparent animationType="fade" onRequestClose={() => setShowPhotoSource(false)}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }} onPress={() => setShowPhotoSource(false)}>
            <View style={{ backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 }}>
              <Text style={{ fontSize: 16, fontFamily: fonts.sans.bold, color: c.text, textAlign: "center", marginBottom: 4 }}>
                Foto de perfil
              </Text>
              <Pressable
                onPress={() => { setShowPhotoSource(false); setTimeout(pickPhotoFromCamera, 300); }}
                style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.border }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${c.blue}18`, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="camera" size={22} color={c.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: fonts.sans.bold, color: c.text }}>Tirar foto agora</Text>
                  <Text style={{ fontSize: 11, fontFamily: fonts.sans.regular, color: c.softMuted }}>Use a câmera frontal para a selfie de perfil</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.softMuted} />
              </Pressable>
              <Pressable
                onPress={() => { setShowPhotoSource(false); setTimeout(pickPhotoFromGallery, 300); }}
                style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.border }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${c.blue}18`, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="images" size={22} color={c.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: fonts.sans.bold, color: c.text }}>Escolher da galeria</Text>
                  <Text style={{ fontSize: 11, fontFamily: fonts.sans.regular, color: c.softMuted }}>Selecione uma foto existente</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.softMuted} />
              </Pressable>
              <Pressable onPress={() => setShowPhotoSource(false)} style={{ padding: 14, borderRadius: 14, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontFamily: fonts.sans.medium, color: c.softMuted }}>Cancelar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const prov = StyleSheet.create({
  backBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  title: { fontSize: 24, fontFamily: fonts.serif.extra, lineHeight: 28, marginBottom: 6 },
  sub: { fontSize: 13, fontFamily: fonts.sans.regular, lineHeight: 19, marginBottom: 20 },
  sectionDivider: { borderTopWidth: 1, marginVertical: 20 },
  sectionTitle: { fontSize: 13, fontFamily: fonts.sans.bold, marginBottom: 12 },
  photoCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photoBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  svcCard: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 6, position: "relative" },
  svcCheck: { position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  reviewCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  infoBox: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  bottomBar: { borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 24 },
  ctaBtn: { height: 54, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});

/* ══════════════════════════════════════════════════════════════════════════
   CLIENTE ONBOARDING — simple 4-step flow (preserved)
   ══════════════════════════════════════════════════════════════════════════ */
type ClientStep = "welcome" | "name" | "phone" | "gps" | "done";
const CLIENT_STEPS: ClientStep[] = ["welcome", "name", "phone", "gps", "done"];

function ClienteOnboarding() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { user, completeOnboarding } = useAuth();

  const [step, setStep] = useState<ClientStep>("welcome");
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [gpsGranted, setGpsGranted] = useState<boolean | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const stepIndex = CLIENT_STEPS.indexOf(step);
  const progress = (stepIndex / (CLIENT_STEPS.length - 1)) * 100;

  const transition = (next: ClientStep, direction: 1 | -1 = 1) => {
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

  const formatPhone = (raw: string) => maskPhone(raw);

  const validateName = () => {
    if (name.trim().length < 3) { setNameError("O nome precisa ter pelo menos 3 caracteres."); return false; }
    setNameError(null); return true;
  };

  const validatePhone = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) { setPhoneError("Digite um número válido com DDD (ex: 21 99999-0000)."); return false; }
    setPhoneError(null); return true;
  };

  const requestGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setGpsGranted(status === "granted");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      transition("done");
    } catch {
      setGpsGranted(false);
      transition("done");
    }
  };

  const finish = async () => {
    if (submitting) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await completeOnboarding(name.trim(), phone.replace(/\D/g, ""), gpsGranted === true);
    router.replace("/");
  };

  const goBack = () => {
    const prev = CLIENT_STEPS[stepIndex - 1];
    if (prev) transition(prev, -1);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[cli.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {step !== "welcome" && step !== "done" && (
            <View style={[cli.progressTrack, { backgroundColor: c.borderLight }]}>
              <Animated.View style={[cli.progressFill, { width: `${progress}%`, backgroundColor: c.primary }]} />
            </View>
          )}
          {step !== "welcome" && step !== "done" && (
            <Pressable onPress={goBack} style={[cli.backBtn, { backgroundColor: c.card, borderColor: c.border }]}>
              <Ionicons name="chevron-back" size={18} color={c.text} />
            </Pressable>
          )}

          <Animated.View style={[cli.content, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
            {step === "welcome" && (
              <View style={cli.centerSection}>
                <LinearGradient colors={[c.primary, "#E8B400"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[cli.logo, shadows.md]}>
                  <Text style={cli.logoText}>A</Text>
                </LinearGradient>
                <Text style={[cli.brand, { color: c.text }]}>Ajudaê</Text>
                <Text style={[cli.tagline, { color: c.sub }]}>Serviços de confiança,{"\n"}perto de você.</Text>
                <View style={[cli.featureList, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
                  <FeatureRow icon="shield-checkmark" text="Prestadores verificados e avaliados" c={c} />
                  <FeatureRow icon="navigate" text="Localização em tempo real do serviço" c={c} />
                  <FeatureRow icon="lock-closed" text="Pagamento seguro com PIN de confirmação" c={c} />
                </View>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); transition("name"); }}
                  style={[cli.primaryBtn, { backgroundColor: c.primary }, shadows.md]}
                >
                  <Text style={cli.primaryBtnTxt}>Começar configuração</Text>
                  <Ionicons name="arrow-forward" size={16} color="#1A1714" />
                </Pressable>
              </View>
            )}

            {step === "name" && (
              <View style={cli.formSection}>
                <View style={[cli.stepIcon, { backgroundColor: `${c.primary}18` }]}>
                  <Ionicons name="person" size={26} color={c.primary} />
                </View>
                <Text style={[cli.stepTitle, { color: c.text }]}>Como você se chama?</Text>
                <Text style={[cli.stepSub, { color: c.softMuted }]}>Seu nome é exibido para os prestadores ao fazer um pedido.</Text>
                <TextInput
                  value={name}
                  onChangeText={(v) => { setName(v); setNameError(null); }}
                  placeholder="Seu nome completo"
                  placeholderTextColor={c.softMuted}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={() => { if (validateName()) transition("phone"); }}
                  style={[cli.input, { backgroundColor: c.card, borderColor: nameError ? c.destructive : c.border, color: c.text }]}
                />
                {nameError && (
                  <View style={cli.errorRow}>
                    <Ionicons name="alert-circle" size={13} color={c.destructive} />
                    <Text style={[cli.errorTxt, { color: c.destructive }]}>{nameError}</Text>
                  </View>
                )}
                <Pressable
                  onPress={() => { if (validateName()) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); transition("phone"); } }}
                  style={[cli.primaryBtn, { backgroundColor: c.primary, marginTop: 24 }, shadows.md]}
                >
                  <Text style={cli.primaryBtnTxt}>Continuar</Text>
                  <Ionicons name="arrow-forward" size={16} color="#1A1714" />
                </Pressable>
              </View>
            )}

            {step === "phone" && (
              <View style={cli.formSection}>
                <View style={[cli.stepIcon, { backgroundColor: `${c.blue}18` }]}>
                  <Ionicons name="call" size={26} color={c.blue} />
                </View>
                <Text style={[cli.stepTitle, { color: c.text }]}>Seu número de telefone</Text>
                <Text style={[cli.stepSub, { color: c.softMuted }]}>Usado pelo prestador para entrar em contato após o aceite do pedido.</Text>
                <TextInput
                  value={phone}
                  onChangeText={(v) => { setPhone(formatPhone(v)); setPhoneError(null); }}
                  placeholder="(21) 99999-0000"
                  placeholderTextColor={c.softMuted}
                  keyboardType="phone-pad"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={() => { if (validatePhone()) transition("gps"); }}
                  style={[cli.input, { backgroundColor: c.card, borderColor: phoneError ? c.destructive : c.border, color: c.text }]}
                />
                {phoneError && (
                  <View style={cli.errorRow}>
                    <Ionicons name="alert-circle" size={13} color={c.destructive} />
                    <Text style={[cli.errorTxt, { color: c.destructive }]}>{phoneError}</Text>
                  </View>
                )}
                <Pressable
                  onPress={() => { if (validatePhone()) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); transition("gps"); } }}
                  style={[cli.primaryBtn, { backgroundColor: c.primary, marginTop: 24 }, shadows.md]}
                >
                  <Text style={cli.primaryBtnTxt}>Continuar</Text>
                  <Ionicons name="arrow-forward" size={16} color="#1A1714" />
                </Pressable>
              </View>
            )}

            {step === "gps" && (
              <View style={cli.centerSection}>
                <LinearGradient colors={[c.blue, "#1D4ED8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[cli.gpsIcon, shadows.md]}>
                  <Ionicons name="navigate" size={36} color="#fff" />
                </LinearGradient>
                <Text style={[cli.stepTitle, { color: c.text }]}>Permitir localização?</Text>
                <Text style={[cli.stepSub, { color: c.softMuted }]}>Para encontrar prestadores perto de você e calcular distâncias em tempo real.</Text>
                <View style={[cli.gpsCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
                  <FeatureRow icon="map" text="Veja prestadores próximos no mapa" c={c} />
                  <FeatureRow icon="time" text="Estimativa de tempo de chegada precisa" c={c} />
                  <FeatureRow icon="trending-up" text="Resultados mais relevantes para você" c={c} />
                </View>
                <Pressable onPress={requestGps} style={[cli.primaryBtn, { backgroundColor: c.blue }, shadows.md]}>
                  <Ionicons name="navigate" size={16} color="#fff" />
                  <Text style={[cli.primaryBtnTxt, { color: "#fff" }]}>Permitir localização</Text>
                </Pressable>
                <Pressable onPress={() => { setGpsGranted(false); transition("done"); }} style={cli.skipBtn}>
                  <Text style={[cli.skipTxt, { color: c.sub }]}>Pular por agora</Text>
                  <Text style={[cli.skipNote, { color: c.softMuted }]}>Os resultados serão menos precisos</Text>
                </Pressable>
              </View>
            )}

            {step === "done" && (
              <View style={cli.centerSection}>
                <LinearGradient colors={[c.success, "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[cli.doneIcon, shadows.md]}>
                  <Ionicons name="checkmark-circle" size={44} color="#fff" />
                </LinearGradient>
                <Text style={[cli.doneTitle, { color: c.text }]}>Tudo pronto!</Text>
                <Text style={[cli.doneSub, { color: c.softMuted }]}>Bem-vindo ao Ajudaê. Encontre prestadores verificados perto de você agora.</Text>
                {gpsGranted === false && (
                  <View style={[cli.gpsWarnBox, { backgroundColor: c.warningLight, borderColor: `${c.warning}66` }]}>
                    <Ionicons name="alert-circle" size={14} color={c.warning} />
                    <Text style={[cli.gpsWarnTxt, { color: c.text }]}>Localização não habilitada. Os resultados serão menos precisos. Você pode ativar depois em Configurações.</Text>
                  </View>
                )}
                <Pressable
                  onPress={finish}
                  disabled={submitting}
                  style={[cli.primaryBtn, { backgroundColor: c.primary, opacity: submitting ? 0.7 : 1, marginTop: 32 }, shadows.md]}
                >
                  <Text style={cli.primaryBtnTxt}>{submitting ? "Entrando..." : "Ir para o app"}</Text>
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
    <View style={cli.featureRow}>
      <View style={[cli.featureIconWrap, { backgroundColor: `${c.primary}18` }]}>
        <Ionicons name={icon} size={14} color={c.primary} />
      </View>
      <Text style={[cli.featureTxt, { color: c.text }]}>{text}</Text>
    </View>
  );
}

const cli = StyleSheet.create({
  wrap: { flex: 1 },
  progressTrack: { height: 3, marginHorizontal: 24, marginTop: 16, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 2 },
  backBtn: { position: "absolute", top: 52, left: 16, width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", zIndex: 10 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  centerSection: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 24 },
  formSection: { flex: 1, paddingTop: 48, paddingBottom: 24 },
  logo: { width: 80, height: 80, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  logoText: { fontSize: 42, fontFamily: fonts.serif.extra, color: "#1A1714" },
  brand: { fontSize: 32, fontFamily: fonts.serif.extra, marginBottom: 8 },
  tagline: { fontSize: 16, fontFamily: fonts.sans.regular, textAlign: "center", lineHeight: 23, marginBottom: 28 },
  featureList: { borderRadius: 16, borderWidth: 1, padding: 16, alignSelf: "stretch", marginBottom: 28, gap: 2 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 7 },
  featureIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  featureTxt: { flex: 1, fontSize: 13, fontFamily: fonts.sans.medium },
  stepIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  stepTitle: { fontSize: 26, fontFamily: fonts.serif.extra, marginBottom: 8, lineHeight: 31 },
  stepSub: { fontSize: 13, fontFamily: fonts.sans.regular, lineHeight: 19, marginBottom: 24 },
  input: { height: 52, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, fontSize: 15, fontFamily: fonts.sans.medium },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  errorTxt: { fontSize: 12, fontFamily: fonts.sans.semibold },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 14, alignSelf: "stretch" },
  primaryBtnTxt: { fontSize: 15, fontFamily: fonts.sans.bold, color: "#1A1714" },
  gpsIcon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  gpsCard: { borderRadius: 16, borderWidth: 1, padding: 16, alignSelf: "stretch", marginBottom: 20, gap: 2 },
  skipBtn: { alignItems: "center", marginTop: 14, gap: 2 },
  skipTxt: { fontSize: 13, fontFamily: fonts.sans.semibold },
  skipNote: { fontSize: 11, fontFamily: fonts.sans.regular },
  doneIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  doneTitle: { fontSize: 30, fontFamily: fonts.serif.extra, marginBottom: 10 },
  doneSub: { fontSize: 14, fontFamily: fonts.sans.regular, textAlign: "center", lineHeight: 21, marginBottom: 20, paddingHorizontal: 8 },
  gpsWarnBox: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 12, borderRadius: 12, borderWidth: 1, alignSelf: "stretch" },
  gpsWarnTxt: { flex: 1, fontSize: 12, fontFamily: fonts.sans.medium, lineHeight: 17 },
});

/* ══════════════════════════════════════════════════════════════════════════
   Root — branches on role
   ══════════════════════════════════════════════════════════════════════════ */
export default function OnboardingScreen() {
  const { role } = useAuth();
  const isProvider = role === "prestador";
  return isProvider ? <ProviderOnboarding /> : <ClienteOnboarding />;
}
