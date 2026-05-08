import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import colors, { fonts, shadows } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/* ─── Types ────────────────────────────────────────────────────────────────── */
type ServiceType = "frete" | "mudanca" | "entrega";
type ContactMethod = "ligacao" | "whatsapp";
type VehicleType = "car" | "utility" | "van" | "truck_small" | "truck_large";
type Availability = "manha" | "tarde" | "noite" | "qualquer";

interface FormState {
  fullName: string;
  cpf: string;
  birthDate: string;
  phone: string;
  serviceType: ServiceType | "";
  serviceCategory: string;
  vehicleType: VehicleType | "";
  vehicleModel: string;
  vehicleYear: string;
  vehiclePlate: string;
  contactMethod: ContactMethod | "";
  contactAvailability: Availability | "";
  notes: string;
  docRg: string;
  docResidence: string;
  docCnh: string;
  docCrlv: string;
  docSelfie: string;
}

/* ─── Constants ────────────────────────────────────────────────────────────── */
const SERVICE_TYPES = [
  { value: "frete" as ServiceType, icon: "🚚", label: "Frete", desc: "Transporte leve a médio" },
  { value: "mudanca" as ServiceType, icon: "📦", label: "Mudança", desc: "Residencial ou comercial" },
  { value: "entrega" as ServiceType, icon: "📬", label: "Entrega", desc: "Entregas urbanas" },
];

const SERVICE_CATEGORIES: Record<ServiceType, { value: string; label: string }[]> = {
  frete: [
    { value: "frete-leve", label: "Frete leve" },
    { value: "frete-medio", label: "Frete médio" },
  ],
  mudanca: [
    { value: "mudanca-pequena", label: "Mudança pequena" },
    { value: "mudanca-media", label: "Mudança média" },
    { value: "mudanca-grande", label: "Mudança grande" },
  ],
  entrega: [
    { value: "entrega-moto", label: "Motoboy" },
    { value: "entrega-carro", label: "De carro" },
  ],
};

const VEHICLE_TYPES = [
  { value: "car" as VehicleType, icon: "🚗", label: "Carro utilitário / pickup pequena" },
  { value: "utility" as VehicleType, icon: "🛻", label: "Pickup média" },
  { value: "van" as VehicleType, icon: "🚐", label: "Furgão / Van de carga" },
  { value: "truck_small" as VehicleType, icon: "🚌", label: "Van grande / Caminhão pequeno" },
  { value: "truck_large" as VehicleType, icon: "🚛", label: "Caminhão" },
];

const AVAILABILITY_OPTIONS = [
  { value: "manha" as Availability, label: "Manhã (8h–12h)" },
  { value: "tarde" as Availability, label: "Tarde (13h–18h)" },
  { value: "noite" as Availability, label: "Noite (18h–21h)" },
  { value: "qualquer" as Availability, label: "Qualquer horário" },
];

const CONTACT_METHODS = [
  { value: "whatsapp" as ContactMethod, icon: "logo-whatsapp", label: "WhatsApp" },
  { value: "ligacao" as ContactMethod, icon: "call", label: "Ligação telefônica" },
];

/* ─── Masks & validators ───────────────────────────────────────────────────── */
function sanitize(raw: string) {
  return raw.replace(/<[^>]*>/g, "").replace(/[<>"'`\\]/g, "").trimStart();
}

function maskCPF(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function maskPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d)/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}

function maskDate(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return d
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}

function maskPlate(raw: string) {
  const v = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  if (v.length <= 3) return v;
  return `${v.slice(0, 3)}-${v.slice(3)}`;
}

function validateCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(c[i]) * (10 - i);
  let rem = sum % 11;
  const d1 = rem < 2 ? 0 : 11 - rem;
  if (d1 !== Number(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(c[i]) * (11 - i);
  rem = sum % 11;
  return (rem < 2 ? 0 : 11 - rem) === Number(c[10]);
}

function validateDate(v: string): boolean {
  if (v.length < 10) return false;
  const day = parseInt(v.slice(0, 2));
  const month = parseInt(v.slice(3, 5));
  const year = parseInt(v.slice(6, 10));
  if (year < 1900 || year > new Date().getFullYear()) return false;
  const dt = new Date(year, month - 1, day);
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
}

function validatePlate(raw: string): boolean {
  const v = raw.replace("-", "");
  return /^[A-Z]{3}\d{4}$/.test(v) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(v);
}

/* ─── Sub-components ───────────────────────────────────────────────────────── */
const ERROR_COLOR = "#DC2626";

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

function StyledInput({
  value, onChangeText, placeholder, keyboardType, maxLength, autoCapitalize,
  error, success, hint, onFocus,
}: {
  value: string; onChangeText: (t: string) => void; placeholder?: string;
  keyboardType?: any; maxLength?: number; autoCapitalize?: any;
  error?: string; success?: boolean; hint?: string; onFocus?: () => void;
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
        autoCapitalize={autoCapitalize ?? "none"}
        autoCorrect={false}
        onFocus={onFocus}
        style={{
          height: 52, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16,
          fontSize: 14, fontFamily: fonts.sans.medium,
          backgroundColor: c.card, borderColor, color: c.text,
        }}
      />
      {hint && !error && !success && (
        <Text style={{ fontSize: 10, fontFamily: fonts.sans.regular, color: c.softMuted, marginTop: 4 }}>{hint}</Text>
      )}
      {error ? <FieldError msg={error} /> : <FieldSuccess show={!!success && value.length > 0} />}
    </>
  );
}

function RadioRow({ options, value, onSelect, error }: {
  options: { value: string; label: string; icon?: string }[];
  value: string; onSelect: (v: string) => void; error?: string;
}) {
  const c = colors.light;
  return (
    <>
      <View style={{ gap: 8 }}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              style={{
                flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                borderRadius: 14, borderWidth: 1.5,
                borderColor: active ? c.blue : c.border,
                backgroundColor: active ? `${c.blue}0E` : c.card,
              }}
            >
              <View style={{
                width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                borderColor: active ? c.blue : c.border,
                alignItems: "center", justifyContent: "center",
              }}>
                {active && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.blue }} />}
              </View>
              {opt.icon && (
                <Ionicons name={opt.icon as any} size={18} color={active ? c.blue : c.softMuted} />
              )}
              <Text style={{ fontSize: 13, fontFamily: active ? fonts.sans.bold : fonts.sans.regular, color: c.text }}>
                {opt.label}
              </Text>
              {active && <Ionicons name="checkmark-circle" size={16} color={c.blue} style={{ marginLeft: "auto" }} />}
            </Pressable>
          );
        })}
      </View>
      {error && <FieldError msg={error} />}
    </>
  );
}

function ServiceTypeCard({ options, value, onSelect, error }: {
  options: { value: string; icon: string; label: string; desc: string }[];
  value: string; onSelect: (v: string) => void; error?: string;
}) {
  const c = colors.light;
  return (
    <>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              style={{
                flex: 1, padding: 14, borderRadius: 16, borderWidth: 1.5,
                borderColor: active ? c.blue : c.border,
                backgroundColor: active ? `${c.blue}0E` : c.card,
                alignItems: "center", gap: 6, position: "relative",
              }}
            >
              <Text style={{ fontSize: 26 }}>{opt.icon}</Text>
              <Text style={{ fontSize: 13, fontFamily: fonts.sans.bold, color: c.text }}>{opt.label}</Text>
              <Text style={{ fontSize: 10, fontFamily: fonts.sans.regular, color: c.softMuted, textAlign: "center" }}>{opt.desc}</Text>
              {active && (
                <View style={{
                  position: "absolute", top: 8, right: 8, width: 18, height: 18,
                  borderRadius: 9, backgroundColor: c.blue, alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name="checkmark" size={11} color="#fff" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      {error && <FieldError msg={error} />}
    </>
  );
}

function DocPickerRow({
  label, required, uri, onPickGallery, onPickCamera, hint, error, isCamera,
}: {
  label: string; required?: boolean; uri?: string;
  onPickGallery: () => void; onPickCamera?: () => void;
  hint?: string; error?: string; isCamera?: boolean;
}) {
  const c = colors.light;
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  const handlePress = () => {
    if (isCamera && onPickCamera) {
      setShowSourcePicker(true);
    } else {
      onPickGallery();
    }
  };

  return (
    <View style={{ marginBottom: 2 }}>
      <Label text={label} required={required} />
      <Pressable
        onPress={handlePress}
        style={{
          minHeight: 58, borderRadius: 14, borderWidth: 1.5, borderStyle: uri ? "solid" : "dashed",
          borderColor: error ? ERROR_COLOR : uri ? c.blue : c.border,
          backgroundColor: error ? `${ERROR_COLOR}08` : uri ? `${c.blue}0F` : c.card,
          flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 10,
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: 38, height: 38, borderRadius: 8 }} resizeMode="cover" />
        ) : (
          <View style={{
            width: 38, height: 38, borderRadius: 10, backgroundColor: `${c.blue}18`,
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name={isCamera ? "camera" : "document-outline"} size={18} color={c.blue} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontFamily: fonts.sans.medium, color: uri ? c.blue : c.text }}>
            {uri ? "Enviado ✓" : "Toque para selecionar"}
          </Text>
          {hint && !uri && (
            <Text style={{ fontSize: 10, fontFamily: fonts.sans.regular, color: c.softMuted, marginTop: 2 }}>{hint}</Text>
          )}
          {isCamera && !uri && (
            <Text style={{ fontSize: 10, fontFamily: fonts.sans.regular, color: c.blue, marginTop: 2 }}>
              Galeria ou câmera
            </Text>
          )}
        </View>
        <Ionicons name={uri ? "checkmark-circle" : "chevron-forward"} size={16} color={uri ? c.blue : c.softMuted} />
      </Pressable>
      {error && <FieldError msg={error} />}

      {/* Source picker modal for selfie */}
      <Modal visible={showSourcePicker} transparent animationType="fade" onRequestClose={() => setShowSourcePicker(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }} onPress={() => setShowSourcePicker(false)}>
          <View style={{ backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 }}>
            <Text style={{ fontSize: 16, fontFamily: fonts.sans.bold, color: c.text, textAlign: "center", marginBottom: 4 }}>
              Escolher origem da foto
            </Text>
            <Pressable
              onPress={() => { setShowSourcePicker(false); setTimeout(onPickCamera!, 300); }}
              style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.border }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${c.blue}18`, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="camera" size={22} color={c.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: fonts.sans.bold, color: c.text }}>Tirar foto agora</Text>
                <Text style={{ fontSize: 11, fontFamily: fonts.sans.regular, color: c.softMuted }}>Use a câmera frontal para a selfie</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.softMuted} />
            </Pressable>
            <Pressable
              onPress={() => { setShowSourcePicker(false); setTimeout(onPickGallery, 300); }}
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
            <Pressable
              onPress={() => setShowSourcePicker(false)}
              style={{ padding: 14, borderRadius: 14, alignItems: "center" }}
            >
              <Text style={{ fontSize: 14, fontFamily: fonts.sans.medium, color: c.softMuted }}>Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function StepProgress({ step, total }: { step: number; total: number }) {
  const c = colors.light;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 24, marginBottom: 20 }}>
      {Array.from({ length: total }).map((_, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <React.Fragment key={n}>
            <View style={{
              width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center",
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

/* ─── Step labels ──────────────────────────────────────────────────────────── */
const STEP_LABELS = ["Dados pessoais", "Serviço e veículo", "Contato", "Documentos", "Revisão"];

/* ══════════════════════════════════════════════════════════════════════════════
   Main screen
   ══════════════════════════════════════════════════════════════════════════════ */
export default function ProviderValidationScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { user, role, refreshUser } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);
  const fieldPositions = useRef<Record<string, number>>({});

  const initialForm = useMemo<FormState>(() => ({
    fullName: user?.name || "",
    cpf: user?.cpf ? maskCPF(user.cpf) : "",
    birthDate: user?.provider?.birth_date ? user.provider.birth_date.split("-").reverse().join("/") : "",
    phone: user?.phone ? maskPhone(user.phone) : "",
    serviceType: (user?.provider?.service_type as ServiceType) || "",
    serviceCategory: user?.provider?.service_category || "",
    vehicleType: (user?.provider?.vehicle_type as VehicleType) || "",
    vehicleModel: user?.provider?.vehicle_model || "",
    vehicleYear: user?.provider?.vehicle_year ? String(user.provider.vehicle_year) : "",
    vehiclePlate: user?.provider?.vehicle_plate ? maskPlate(user.provider.vehicle_plate) : "",
    contactMethod: (user?.provider?.contact_method as ContactMethod) || "",
    contactAvailability: (user?.provider?.contact_availability as Availability) || "",
    docRg: user?.provider?.doc_rg_url || "",
    docResidence: user?.provider?.doc_residence_url || "",
    docCnh: user?.provider?.doc_cnh_url || "",
    docCrlv: user?.provider?.doc_crlv_url || "",
    docSelfie: user?.provider?.doc_selfie_url || "",
    notes: user?.provider?.validation_notes || "",
  }), [user]);

  const [form, setForm] = useState<FormState>(initialForm);

  if (!user || role !== "prestador") {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 24, paddingHorizontal: 24 }}>
        <Text style={[st.title, { color: c.text }]}>Acesso indisponível</Text>
        <Pressable onPress={() => router.replace("/")} style={[st.submitBtn, { backgroundColor: c.blue, marginTop: 24 }]}>
          <Text style={st.submitBtnTxt}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const providerUser = user;

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: "" }));
  }

  function rememberFieldPosition(field: string, y: number) {
    fieldPositions.current[field] = y;
  }

  function focusField(field: string) {
    const y = fieldPositions.current[field];
    if (typeof y !== "number") return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(y - 110, 0), animated: true });
    });
  }

  const transition = (next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setStep(next);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      });
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  /* ── Step validators ── */
  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!form.fullName.trim() || form.fullName.trim().split(/\s+/).filter((w) => w.length >= 2).length < 2)
      e.fullName = "Informe nome e sobrenome completos.";
    if (!validateCPF(form.cpf))
      e.cpf = "CPF inválido. Verifique os dígitos.";
    if (!validateDate(form.birthDate))
      e.birthDate = "Data inválida. Use DD/MM/AAAA.";
    else {
      const year = parseInt(form.birthDate.slice(6, 10));
      const age = new Date().getFullYear() - year;
      if (age < 18) e.birthDate = "Você precisa ter ao menos 18 anos.";
    }
    if (form.phone.replace(/\D/g, "").length < 10)
      e.phone = "Telefone inválido. Inclua o DDD.";
    if (Object.keys(e).length) { setErrors(e); return false; }
    return true;
  }

  function validateStep2(): boolean {
    const e: Record<string, string> = {};
    if (!form.serviceType) e.serviceType = "Selecione o tipo de serviço.";
    if (!form.serviceCategory) e.serviceCategory = "Selecione a categoria.";
    if (!form.vehicleType) e.vehicleType = "Selecione o tipo de veículo.";
    if (!form.vehicleModel.trim()) e.vehicleModel = "Informe o modelo do veículo.";
    if (!form.vehicleYear.trim() || parseInt(form.vehicleYear) < 1990 || parseInt(form.vehicleYear) > new Date().getFullYear() + 1)
      e.vehicleYear = "Ano inválido (1990–" + (new Date().getFullYear() + 1) + ").";
    if (!validatePlate(form.vehiclePlate)) e.vehiclePlate = "Placa inválida. Ex: ABC-1234 ou ABC1D23.";
    if (Object.keys(e).length) { setErrors(e); return false; }
    return true;
  }

  function validateStep3(): boolean {
    const e: Record<string, string> = {};
    if (!form.contactMethod) e.contactMethod = "Selecione o método de contato.";
    if (!form.contactAvailability) e.contactAvailability = "Selecione sua disponibilidade.";
    if (Object.keys(e).length) { setErrors(e); return false; }
    return true;
  }

  function validateStep4(): boolean {
    const e: Record<string, string> = {};
    if (!form.docRg) e.docRg = "Envie o documento de identidade (RG).";
    if (!form.docResidence) e.docResidence = "Envie o comprovante de residência.";
    if (!form.docCnh) e.docCnh = "Envie a CNH dentro da validade.";
    if (!form.docSelfie) e.docSelfie = "Envie a selfie com rosto visível.";
    if (Object.keys(e).length) { setErrors(e); return false; }
    return true;
  }

  const validators: Record<number, () => boolean> = { 1: validateStep1, 2: validateStep2, 3: validateStep3, 4: validateStep4 };

  function goNext() {
    if (step < 5 && !validators[step]?.()) return;
    transition(step + 1);
  }

  function goBack() {
    if (step > 1) transition(step - 1);
    else router.back();
  }

  /* ── Image pickers ── */
  async function pickFromGallery(field: keyof Pick<FormState, "docRg" | "docResidence" | "docCnh" | "docCrlv" | "docSelfie">) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permissão necessária", "Precisamos de acesso à galeria para anexar documentos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setField(field, result.assets[0].uri);
    }
  }

  async function pickSelfieFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permissão necessária", "Precisamos de acesso à câmera para tirar a selfie.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setField("docSelfie", result.assets[0].uri);
    }
  }

  /* ── Submit ── */
  async function uploadDocument(name: string, value: string) {
    if (!/^(file|content|ph):/i.test(value)) return value;
    let response: Response;
    try {
      response = await fetch(value);
    } catch {
      throw new Error(`Não foi possível ler o arquivo "${name}". Selecione novamente.`);
    }
    const blob = await response.blob();
    const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const path = `${providerUser.id}/${Date.now()}-${name}.${ext}`;
    const { error } = await supabase.storage.from("provider-docs").upload(path, blob, {
      contentType: blob.type || "image/jpeg",
      upsert: true,
    });
    if (error) throw error;
    return path;
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      const [docRg, docResidence, docCnh, docCrlv, docSelfie] = await Promise.all([
        uploadDocument("rg", form.docRg),
        uploadDocument("residence", form.docResidence),
        uploadDocument("cnh", form.docCnh),
        form.docCrlv ? uploadDocument("crlv", form.docCrlv) : Promise.resolve(""),
        uploadDocument("selfie", form.docSelfie),
      ]);

      const { error } = await supabase.functions.invoke("provider_validation_submit", {
        body: {
          full_name: form.fullName.trim(),
          cpf: form.cpf.replace(/\D/g, ""),
          birth_date: form.birthDate.split("/").reverse().join("-"),
          phone: form.phone.replace(/\D/g, ""),
          service_type: form.serviceType,
          service_category: form.serviceCategory,
          vehicle_type: form.vehicleType,
          vehicle_model: form.vehicleModel.trim(),
          vehicle_year: Number(form.vehicleYear),
          vehicle_plate: form.vehiclePlate,
          contact_method: form.contactMethod,
          contact_availability: form.contactAvailability,
          doc_rg_url: docRg,
          doc_residence_url: docResidence,
          doc_cnh_url: docCnh,
          doc_crlv_url: docCrlv,
          doc_selfie_url: docSelfie,
          validation_notes: form.notes.trim(),
        },
      });

      if (error) throw error;
      await refreshUser();
      Alert.alert("Validação enviada", "Recebemos seus documentos. Você será notificado por e-mail em até 24h.");
      router.replace("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível enviar. Tente novamente.";
      Alert.alert("Erro", msg);
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Review helper ── */
  const reviewSections = [
    {
      icon: "👤", title: "Dados pessoais",
      rows: [
        ["Nome", form.fullName],
        ["CPF", form.cpf],
        ["Nascimento", form.birthDate],
        ["Telefone", form.phone],
      ],
    },
    {
      icon: "🚚", title: "Serviço e veículo",
      rows: [
        ["Tipo", SERVICE_TYPES.find((s) => s.value === form.serviceType)?.label || "—"],
        ["Categoria", SERVICE_CATEGORIES[form.serviceType as ServiceType]?.find((s) => s.value === form.serviceCategory)?.label || form.serviceCategory || "—"],
        ["Veículo", VEHICLE_TYPES.find((v) => v.value === form.vehicleType)?.label || "—"],
        ["Modelo", form.vehicleModel],
        ["Ano", form.vehicleYear],
        ["Placa", form.vehiclePlate],
      ],
    },
    {
      icon: "📞", title: "Contato",
      rows: [
        ["Método", CONTACT_METHODS.find((m) => m.value === form.contactMethod)?.label || "—"],
        ["Disponibilidade", AVAILABILITY_OPTIONS.find((a) => a.value === form.contactAvailability)?.label || "—"],
      ],
    },
    {
      icon: "📄", title: "Documentos",
      rows: [
        ["RG", form.docRg ? "✓ Enviado" : "—"],
        ["Comprovante", form.docResidence ? "✓ Enviado" : "—"],
        ["CNH", form.docCnh ? "✓ Enviada" : "—"],
        ["CRLV", form.docCrlv ? "✓ Enviado" : "Não enviado"],
        ["Selfie", form.docSelfie ? "✓ Enviada" : "—"],
      ],
    },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 24, marginBottom: 16 }}>
          <Pressable onPress={goBack} style={[st.backBtn, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="chevron-back" size={18} color={c.text} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 11, fontFamily: fonts.sans.bold, color: c.softMuted, letterSpacing: 0.8 }}>VALIDAÇÃO DE PRESTADOR</Text>
            <Text style={{ fontSize: 13, fontFamily: fonts.sans.medium, color: c.sub }}>{STEP_LABELS[step - 1]} · Etapa {step} de 5</Text>
          </View>
          <View style={[st.pill, { backgroundColor: `${c.blue}14`, borderColor: `${c.blue}44` }]}>
            <Ionicons name="shield-checkmark-outline" size={11} color={c.blue} />
            <Text style={{ fontSize: 11, fontFamily: fonts.sans.bold, color: c.blue }}>Verificação</Text>
          </View>
        </View>

        <StepProgress step={step} total={5} />

        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 90 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* ── STEP 1: Dados pessoais ── */}
            {step === 1 && (
              <View>
                <Text style={[st.title, { color: c.text }]}>Dados pessoais</Text>
                <Text style={[st.sub, { color: c.sub }]}>Informe seus dados para identificação. Devem coincidir com os documentos.</Text>

                <View style={[st.readonlyCard, { backgroundColor: `${c.blue}0A`, borderColor: `${c.blue}30` }]}>
                  <Ionicons name="mail-outline" size={14} color={c.blue} />
                  <Text style={{ flex: 1, fontSize: 13, fontFamily: fonts.sans.medium, color: c.text }}>{user.email}</Text>
                  <Text style={{ fontSize: 10, fontFamily: fonts.sans.bold, color: c.blue }}>CONTA</Text>
                </View>

                <View onLayout={(e) => rememberFieldPosition("fullName", e.nativeEvent.layout.y)}>
                  <Label text="NOME COMPLETO" required />
                  <StyledInput
                    value={form.fullName}
                    onChangeText={(t) => setField("fullName", sanitize(t))}
                    placeholder="Nome e sobrenome"
                    autoCapitalize="words"
                    maxLength={100}
                    error={errors.fullName}
                    success={!errors.fullName && form.fullName.trim().split(/\s+/).filter((w) => w.length >= 2).length >= 2}
                    hint="Como aparece nos seus documentos"
                    onFocus={() => focusField("fullName")}
                  />
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }} onLayout={(e) => rememberFieldPosition("cpf", e.nativeEvent.layout.y)}>
                    <Label text="CPF" required />
                    <StyledInput
                      value={form.cpf}
                      onChangeText={(t) => setField("cpf", maskCPF(t))}
                      placeholder="000.000.000-00"
                      keyboardType="numeric"
                      maxLength={14}
                      error={errors.cpf}
                      success={!errors.cpf && validateCPF(form.cpf)}
                      onFocus={() => focusField("cpf")}
                    />
                  </View>
                  <View style={{ flex: 1 }} onLayout={(e) => rememberFieldPosition("birthDate", e.nativeEvent.layout.y)}>
                    <Label text="NASCIMENTO" required />
                    <StyledInput
                      value={form.birthDate}
                      onChangeText={(t) => setField("birthDate", maskDate(t))}
                      placeholder="DD/MM/AAAA"
                      keyboardType="numeric"
                      maxLength={10}
                      error={errors.birthDate}
                      success={!errors.birthDate && validateDate(form.birthDate)}
                      hint="Mínimo 18 anos"
                      onFocus={() => focusField("birthDate")}
                    />
                  </View>
                </View>

                <View onLayout={(e) => rememberFieldPosition("phone", e.nativeEvent.layout.y)}>
                  <Label text="TELEFONE / WHATSAPP" required />
                  <StyledInput
                    value={form.phone}
                    onChangeText={(t) => setField("phone", maskPhone(t))}
                    placeholder="(00) 00000-0000"
                    keyboardType="phone-pad"
                    maxLength={15}
                    error={errors.phone}
                    success={!errors.phone && form.phone.replace(/\D/g, "").length >= 10}
                    hint="Com DDD — usado para contato de verificação"
                    onFocus={() => focusField("phone")}
                  />
                </View>
              </View>
            )}

            {/* ── STEP 2: Serviço e veículo ── */}
            {step === 2 && (
              <View>
                <Text style={[st.title, { color: c.text }]}>Serviço e veículo</Text>
                <Text style={[st.sub, { color: c.sub }]}>Defina o tipo de serviço que você oferece e os dados do seu veículo.</Text>

                <Label text="TIPO DE SERVIÇO" required />
                <ServiceTypeCard
                  options={SERVICE_TYPES}
                  value={form.serviceType}
                  onSelect={(v) => { setField("serviceType", v as ServiceType); setField("serviceCategory", ""); }}
                  error={errors.serviceType}
                />

                {form.serviceType && (
                  <>
                    <Label text="CATEGORIA" required />
                    <RadioRow
                      options={SERVICE_CATEGORIES[form.serviceType as ServiceType] || []}
                      value={form.serviceCategory}
                      onSelect={(v) => setField("serviceCategory", v)}
                      error={errors.serviceCategory}
                    />
                  </>
                )}

                <View style={[st.divider, { borderColor: c.border }]} />

                <Label text="TIPO DE VEÍCULO" required />
                <RadioRow
                  options={VEHICLE_TYPES.map((v) => ({ ...v, icon: undefined, label: `${v.icon} ${v.label}` }))}
                  value={form.vehicleType}
                  onSelect={(v) => setField("vehicleType", v as VehicleType)}
                  error={errors.vehicleType}
                />

                <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                  <View style={{ flex: 2 }} onLayout={(e) => rememberFieldPosition("vehicleModel", e.nativeEvent.layout.y)}>
                    <Label text="MODELO" required />
                    <StyledInput
                      value={form.vehicleModel}
                      onChangeText={(t) => setField("vehicleModel", sanitize(t))}
                      placeholder="Ex.: Fiat Strada"
                      autoCapitalize="words"
                      maxLength={60}
                      error={errors.vehicleModel}
                      success={!errors.vehicleModel && form.vehicleModel.trim().length > 0}
                      onFocus={() => focusField("vehicleModel")}
                    />
                  </View>
                  <View style={{ flex: 1 }} onLayout={(e) => rememberFieldPosition("vehicleYear", e.nativeEvent.layout.y)}>
                    <Label text="ANO" required />
                    <StyledInput
                      value={form.vehicleYear}
                      onChangeText={(t) => setField("vehicleYear", t.replace(/\D/g, "").slice(0, 4))}
                      placeholder="AAAA"
                      keyboardType="numeric"
                      maxLength={4}
                      error={errors.vehicleYear}
                      success={!errors.vehicleYear && form.vehicleYear.length === 4 && parseInt(form.vehicleYear) >= 1990}
                      onFocus={() => focusField("vehicleYear")}
                    />
                  </View>
                </View>

                <View onLayout={(e) => rememberFieldPosition("vehiclePlate", e.nativeEvent.layout.y)}>
                  <Label text="PLACA" required />
                  <StyledInput
                    value={form.vehiclePlate}
                    onChangeText={(t) => setField("vehiclePlate", maskPlate(t))}
                    placeholder="ABC-1234"
                    autoCapitalize="characters"
                    maxLength={8}
                    error={errors.vehiclePlate}
                    success={!errors.vehiclePlate && validatePlate(form.vehiclePlate)}
                    hint="Formato antigo (ABC-1234) ou Mercosul (ABC1D23)"
                    onFocus={() => focusField("vehiclePlate")}
                  />
                </View>
              </View>
            )}

            {/* ── STEP 3: Contato ── */}
            {step === 3 && (
              <View>
                <Text style={[st.title, { color: c.text }]}>Contato e disponibilidade</Text>
                <Text style={[st.sub, { color: c.sub }]}>Como prefere ser contatado pela nossa equipe antes da aprovação?</Text>

                <Label text="MÉTODO PREFERIDO" required />
                <RadioRow
                  options={CONTACT_METHODS.map((m) => ({ ...m, icon: m.icon }))}
                  value={form.contactMethod}
                  onSelect={(v) => setField("contactMethod", v as ContactMethod)}
                  error={errors.contactMethod}
                />

                <Label text="DISPONIBILIDADE PARA CONTATO" required />
                <RadioRow
                  options={AVAILABILITY_OPTIONS}
                  value={form.contactAvailability}
                  onSelect={(v) => setField("contactAvailability", v as Availability)}
                  error={errors.contactAvailability}
                />

                <View onLayout={(e) => rememberFieldPosition("notes", e.nativeEvent.layout.y)}>
                  <Label text="OBSERVAÇÕES" />
                  <TextInput
                    value={form.notes}
                    onChangeText={(t) => setField("notes", sanitize(t))}
                    onFocus={() => focusField("notes")}
                    placeholder="Informações adicionais para a equipe de validação (opcional)"
                    placeholderTextColor={c.softMuted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={{
                      minHeight: 110, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14,
                      fontSize: 14, fontFamily: fonts.sans.medium,
                      backgroundColor: c.card, borderColor: c.border, color: c.text,
                    }}
                  />
                </View>
              </View>
            )}

            {/* ── STEP 4: Documentos ── */}
            {step === 4 && (
              <View>
                <Text style={[st.title, { color: c.text }]}>Documentos</Text>
                <Text style={[st.sub, { color: c.sub }]}>Envie fotos claras e legíveis. Os arquivos ficam seguros e criptografados.</Text>

                <View style={[st.infoBox, { backgroundColor: `${c.blue}0A`, borderColor: `${c.blue}30` }]}>
                  <Ionicons name="shield-checkmark" size={14} color={c.blue} />
                  <Text style={{ flex: 1, fontSize: 12, fontFamily: fonts.sans.regular, color: c.text, lineHeight: 17 }}>
                    Documentos com boa iluminação, sem cortes, dentro da validade e com nome idêntico ao cadastro.
                  </Text>
                </View>

                <DocPickerRow
                  label="RG OU DOCUMENTO DE IDENTIDADE"
                  required
                  uri={form.docRg}
                  onPickGallery={() => pickFromGallery("docRg")}
                  hint="Frente e verso · JPG ou PNG"
                  error={errors.docRg}
                />

                <DocPickerRow
                  label="COMPROVANTE DE RESIDÊNCIA"
                  required
                  uri={form.docResidence}
                  onPickGallery={() => pickFromGallery("docResidence")}
                  hint="Emitido há no máx. 90 dias"
                  error={errors.docResidence}
                />

                <DocPickerRow
                  label="CNH — CARTEIRA NACIONAL DE HABILITAÇÃO"
                  required
                  uri={form.docCnh}
                  onPickGallery={() => pickFromGallery("docCnh")}
                  hint="Dentro da validade — frente e verso"
                  error={errors.docCnh}
                />

                <DocPickerRow
                  label="CRLV — DOCUMENTO DO VEÍCULO"
                  uri={form.docCrlv}
                  onPickGallery={() => pickFromGallery("docCrlv")}
                  hint="Opcional · Documento do veículo atual"
                  error={errors.docCrlv}
                />

                <View style={[st.divider, { borderColor: c.border }]} />
                <Text style={{ fontSize: 13, fontFamily: fonts.sans.bold, color: c.text, marginBottom: 4 }}>Selfie de verificação</Text>
                <Text style={{ fontSize: 12, fontFamily: fonts.sans.regular, color: c.softMuted, marginBottom: 8, lineHeight: 17 }}>
                  Foto do seu rosto para confirmar sua identidade. Pode tirar com a câmera frontal agora ou selecionar da galeria.
                </Text>

                <DocPickerRow
                  label="SELFIE COM ROSTO VISÍVEL"
                  required
                  uri={form.docSelfie}
                  onPickGallery={() => pickFromGallery("docSelfie")}
                  onPickCamera={pickSelfieFromCamera}
                  hint="Rosto centralizado, bem iluminado"
                  error={errors.docSelfie}
                  isCamera
                />

                {form.docSelfie && (
                  <View style={{ alignItems: "center", marginTop: 12 }}>
                    <Image
                      source={{ uri: form.docSelfie }}
                      style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: c.blue }}
                    />
                    <Text style={{ fontSize: 11, fontFamily: fonts.sans.regular, color: c.softMuted, marginTop: 6 }}>
                      Selfie selecionada
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── STEP 5: Revisão ── */}
            {step === 5 && (
              <View>
                <Text style={[st.title, { color: c.text }]}>Revise e envie</Text>
                <Text style={[st.sub, { color: c.sub }]}>Confira as informações antes de enviar. Use o botão Voltar para corrigir.</Text>

                {reviewSections.map((section) => (
                  <View key={section.title} style={[st.reviewCard, { backgroundColor: c.card, borderColor: c.border }]}>
                    <Text style={{ fontSize: 13, fontFamily: fonts.sans.bold, color: c.text, marginBottom: 10 }}>
                      {section.icon} {section.title}
                    </Text>
                    {section.rows.map(([label, value]) => (
                      <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.borderLight }}>
                        <Text style={{ fontSize: 12, fontFamily: fonts.sans.regular, color: c.softMuted }}>{label}</Text>
                        <Text style={{ fontSize: 12, fontFamily: fonts.sans.medium, color: c.text, maxWidth: "60%", textAlign: "right" }} numberOfLines={1}>
                          {value || "—"}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}

                <View style={[st.infoBox, { backgroundColor: `${c.blue}0F`, borderColor: `${c.blue}33` }]}>
                  <Ionicons name="time-outline" size={14} color={c.blue} />
                  <Text style={{ flex: 1, fontSize: 12, fontFamily: fonts.sans.regular, color: c.text, lineHeight: 17 }}>
                    Nossa equipe analisa em até <Text style={{ fontFamily: fonts.sans.bold }}>24 horas</Text>. Você receberá um aviso por e-mail quando for aprovado.
                  </Text>
                </View>
              </View>
            )}

          </ScrollView>
        </Animated.View>

        {/* Bottom bar */}
        <View style={[st.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: c.background, borderColor: c.border }]}>
          <Pressable
            onPress={step < 5 ? goNext : handleSubmit}
            disabled={submitting}
            style={[st.submitBtn, { backgroundColor: c.blue, opacity: submitting ? 0.7 : 1 }, shadows.md]}
          >
            <Text style={st.submitBtnTxt}>
              {submitting ? "Enviando..." : step < 5 ? "Continuar" : "Enviar validação"}
            </Text>
            <Ionicons name={step < 5 ? "arrow-forward" : "checkmark-circle"} size={16} color="#fff" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  backBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  title: { fontSize: 24, fontFamily: fonts.serif.extra, lineHeight: 28, marginBottom: 6 },
  sub: { fontSize: 13, fontFamily: fonts.sans.regular, lineHeight: 19, marginBottom: 20 },
  divider: { borderTopWidth: 1, marginVertical: 20 },
  readonlyCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 4 },
  reviewCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  infoBox: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 8, marginBottom: 4 },
  bottomBar: { borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 24 },
  submitBtn: { height: 54, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitBtnTxt: { fontSize: 15, fontFamily: fonts.sans.extra, color: "#fff" },
});
