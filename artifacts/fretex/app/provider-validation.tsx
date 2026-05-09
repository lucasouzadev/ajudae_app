import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  InputAccessoryView,
  Keyboard,
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
import { useNotification } from "@/contexts/NotificationContext";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

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

type DocumentField = keyof Pick<
  FormState,
  "docRg" | "docResidence" | "docCnh" | "docCrlv" | "docSelfie"
>;

interface LocalDocumentAsset {
  uri: string;
  base64?: string;
  mimeType?: string;
  fileName?: string;
  displayName?: string;
}

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
const KEYBOARD_ACCESSORY_ID = "provider-validation-keyboard-accessory";
let DocumentPickerModule: typeof import("expo-document-picker") | null | undefined;
let NativeModulesProxy:
  | Record<string, unknown>
  | null
  | undefined;

function hasNativeDocumentPicker() {
  if (NativeModulesProxy === undefined) {
    try {
      const expoModulesCore = require("expo-modules-core") as {
        NativeModulesProxy?: Record<string, unknown>;
      };
      NativeModulesProxy = expoModulesCore.NativeModulesProxy ?? null;
    } catch {
      NativeModulesProxy = null;
    }
  }

  return Boolean(NativeModulesProxy?.ExpoDocumentPicker);
}

function getDocumentPicker() {
  if (DocumentPickerModule !== undefined) {
    return DocumentPickerModule;
  }

  if (!hasNativeDocumentPicker()) {
    DocumentPickerModule = null;
    return DocumentPickerModule;
  }

  try {
    DocumentPickerModule = require("expo-document-picker");
  } catch {
    DocumentPickerModule = null;
  }

  return DocumentPickerModule;
}

function sanitize(raw: string) {
  return raw.replace(/<[^>]*>/g, "").replace(/[<>"'`\\]/g, "").trimStart();
}

function toStorageSlug(raw: string) {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "prestador";
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

function inferMimeType(uri: string, mimeType?: string) {
  if (mimeType) {
    return mimeType;
  }

  const clean = uri.split("?")[0].toLowerCase();
  if (clean.endsWith(".pdf")) return "application/pdf";
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".heic")) return "image/heic";
  if (clean.endsWith(".heif")) return "image/heif";
  return "image/jpeg";
}

function inferExtension(uri: string, mimeType?: string, fileName?: string) {
  const cleanName = fileName?.split("?")[0].toLowerCase() ?? "";
  if (cleanName.includes(".")) {
    return cleanName.slice(cleanName.lastIndexOf(".") + 1).replace("jpeg", "jpg");
  }

  const cleanUri = uri.split("?")[0].toLowerCase();
  if (cleanUri.includes(".")) {
    return cleanUri.slice(cleanUri.lastIndexOf(".") + 1).replace("jpeg", "jpg");
  }

  return (mimeType?.split("/")[1] || "jpg").replace("jpeg", "jpg");
}

function base64ToUint8Array(base64: string) {
  const clean = base64.replace(/\s/g, "");
  const binary = globalThis.atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function isImageMimeType(mimeType?: string) {
  return mimeType?.startsWith("image/") ?? false;
}

function readUriAsBytes(uri: string) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", uri, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
        resolve(new Uint8Array(xhr.response));
        return;
      }
      reject(new Error(`Falha ao ler arquivo local (${xhr.status || "sem status"})`));
    };
    xhr.onerror = () => reject(new Error("Falha ao ler arquivo local"));
    xhr.send();
  });
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

function hasSubmittedProviderData(provider: {
  onboarding_status?: string | null;
  submitted_at?: string | null;
  doc_rg_url?: string | null;
  doc_residence_url?: string | null;
  doc_cnh_url?: string | null;
  doc_selfie_url?: string | null;
} | null) {
  if (!provider) {
    return false;
  }

  if (provider.onboarding_status === "submitted") {
    return true;
  }

  return Boolean(
    provider.submitted_at ||
      provider.doc_rg_url ||
      provider.doc_residence_url ||
      provider.doc_cnh_url ||
      provider.doc_selfie_url,
  );
}

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
  error, success, hint, onFocus, inputAccessoryViewID,
}: {
  value: string; onChangeText: (t: string) => void; placeholder?: string;
  keyboardType?: any; maxLength?: number; autoCapitalize?: any;
  error?: string; success?: boolean; hint?: string; onFocus?: () => void; inputAccessoryViewID?: string;
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
        inputAccessoryViewID={inputAccessoryViewID ?? (Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined)}
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
  label, required, uri, displayName, mimeType, onPickGallery, onPickDocument, onPickCamera, hint, error, isCamera,
}: {
  label: string; required?: boolean; uri?: string;
  displayName?: string; mimeType?: string;
  onPickGallery: () => void; onPickDocument?: () => void; onPickCamera?: () => void;
  hint?: string; error?: string; isCamera?: boolean;
}) {
  const c = colors.light;
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const showImagePreview = !!uri && isImageMimeType(mimeType);
  const resolvedLabel = displayName || uri?.split("/").pop() || "";

  const handlePress = () => {
    if ((isCamera && onPickCamera) || onPickDocument) {
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
        {showImagePreview ? (
          <Image source={{ uri }} style={{ width: 38, height: 38, borderRadius: 8 }} resizeMode="cover" />
        ) : (
          <View style={{
            width: 38, height: 38, borderRadius: 10, backgroundColor: `${c.blue}18`,
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons
              name={
                isCamera
                  ? "camera"
                  : mimeType === "application/pdf"
                    ? "document-text"
                    : "document-outline"
              }
              size={18}
              color={c.blue}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontFamily: fonts.sans.medium, color: uri ? c.blue : c.text }}>
            {uri ? "Enviado ✓" : "Toque para selecionar"}
          </Text>
          {uri ? (
            <Text style={{ fontSize: 10, fontFamily: fonts.sans.regular, color: c.softMuted, marginTop: 2 }} numberOfLines={1}>
              {resolvedLabel}
            </Text>
          ) : null}
          {hint && !uri && (
            <Text style={{ fontSize: 10, fontFamily: fonts.sans.regular, color: c.softMuted, marginTop: 2 }}>{hint}</Text>
          )}
          {isCamera && !uri && (
            <Text style={{ fontSize: 10, fontFamily: fonts.sans.regular, color: c.blue, marginTop: 2 }}>
              Galeria ou câmera
            </Text>
          )}
          {!isCamera && !uri && onPickDocument ? (
            <Text style={{ fontSize: 10, fontFamily: fonts.sans.regular, color: c.blue, marginTop: 2 }}>
              Galeria ou PDF
            </Text>
          ) : !isCamera && !uri ? (
            <Text style={{ fontSize: 10, fontFamily: fonts.sans.regular, color: c.blue, marginTop: 2 }}>
              Galeria
            </Text>
          ) : null}
        </View>
        <Ionicons name={uri ? "checkmark-circle" : "chevron-forward"} size={16} color={uri ? c.blue : c.softMuted} />
      </Pressable>
      {error && <FieldError msg={error} />}

      <Modal visible={showSourcePicker} transparent animationType="fade" onRequestClose={() => setShowSourcePicker(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }} onPress={() => setShowSourcePicker(false)}>
          <View style={{ backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 }}>
            <Text style={{ fontSize: 16, fontFamily: fonts.sans.bold, color: c.text, textAlign: "center", marginBottom: 4 }}>
              {isCamera ? "Escolher origem da foto" : "Escolher origem do arquivo"}
            </Text>
            {isCamera && onPickCamera ? (
              <Pressable
                onPress={() => { setShowSourcePicker(false); setTimeout(onPickCamera, 300); }}
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
            ) : null}
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
            {!isCamera && onPickDocument ? (
              <Pressable
                onPress={() => { setShowSourcePicker(false); setTimeout(onPickDocument, 300); }}
                style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.border }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${c.blue}18`, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="document-text" size={22} color={c.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: fonts.sans.bold, color: c.text }}>Escolher arquivo ou PDF</Text>
                  <Text style={{ fontSize: 11, fontFamily: fonts.sans.regular, color: c.softMuted }}>PDF ou imagem armazenada no aparelho</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.softMuted} />
              </Pressable>
            ) : null}
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

const STEP_LABELS = ["Dados pessoais", "Serviço e veículo", "Contato", "Documentos", "Revisão"];
export default function ProviderValidationScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { user, role, refreshUser } = useAuth();
  const { send } = useNotification();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const fieldAnchors = useRef<Record<string, View | null>>({});
  const localDocumentAssets = useRef<Partial<Record<DocumentField, LocalDocumentAsset>>>({});
  const stepDirectionRef = useRef<"forward" | "back" | null>(null);

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
  const providerStatus = user?.provider?.onboarding_status ?? "incomplete";
  const providerRejected = providerStatus === "rejected";
  const providerReviewOnly =
    Boolean(user?.provider?.verified) ||
    providerStatus === "approved" ||
    (hasSubmittedProviderData(user?.provider ?? null) && providerStatus !== "rejected");

  useEffect(() => {
    setForm(initialForm);
    localDocumentAssets.current = {};
  }, [initialForm]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardVisible(true);
      setKeyboardInset(event.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardInset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
  const canPickFiles = hasNativeDocumentPicker();

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: "" }));
  }

  const setFieldAnchor = (field: string) => (node: View | null) => {
    fieldAnchors.current[field] = node;
  };

  function focusField(field: string) {
    const anchor = fieldAnchors.current[field];
    const content = contentRef.current;
    if (!anchor || !content) return;
    requestAnimationFrame(() => {
      anchor.measureLayout(
        content,
        (_x, y) => {
          scrollRef.current?.scrollTo({ y: Math.max(y - 110, 0), animated: true });
        },
        () => {},
      );
    });
  }

  const transition = (next: number, direction: "forward" | "back") => {
    stepDirectionRef.current = direction;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  useEffect(() => {
    if (stepDirectionRef.current !== "forward") {
      return;
    }

    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      stepDirectionRef.current = null;
    }, 40);

    return () => clearTimeout(timeout);
  }, [step]);

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
    transition(step + 1, "forward");
  }

  function goBack() {
    Keyboard.dismiss();
    if (step > 1) transition(step - 1, "back");
    else router.back();
  }

  function storeLocalDocument(field: DocumentField, asset: LocalDocumentAsset) {
    localDocumentAssets.current[field] = asset;
    setField(field, asset.uri);
  }

  function getDocumentMeta(field: DocumentField) {
    const asset = localDocumentAssets.current[field];
    if (asset) {
      return {
        displayName: asset.displayName || asset.fileName || asset.uri.split("/").pop() || "",
        mimeType: asset.mimeType || inferMimeType(asset.uri, asset.mimeType),
      };
    }

    const value = form[field];
    if (!value) {
      return { displayName: "", mimeType: undefined as string | undefined };
    }

    return {
      displayName: value.split("/").pop() || value,
      mimeType: inferMimeType(value),
    };
  }

  async function pickFromGallery(field: DocumentField) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permissão necessária", "Precisamos de acesso à galeria para anexar documentos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      storeLocalDocument(field, {
        uri: asset.uri,
        base64: asset.base64 ?? undefined,
        mimeType: asset.mimeType ?? undefined,
        fileName: asset.fileName ?? undefined,
        displayName: asset.fileName ?? undefined,
      });
    }
  }

  async function pickDocument(field: DocumentField) {
    const documentPicker = getDocumentPicker();
    if (!documentPicker) {
      Alert.alert(
        "Atualize o app",
        "Esta versao do app ainda nao tem suporte nativo para PDF e arquivos. Instale a build mais recente para liberar esse envio. Por enquanto, use a galeria.",
      );
      await pickFromGallery(field);
      return;
    }

    const result = await documentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      type: ["image/*", "application/pdf"],
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    storeLocalDocument(field, {
      uri: asset.uri,
      mimeType: asset.mimeType ?? undefined,
      fileName: asset.name ?? undefined,
      displayName: asset.name ?? undefined,
    });
  }

  async function pickSelfieFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permissão necessária", "Precisamos de acesso à câmera para tirar a selfie.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      cameraType: "front" as ImagePicker.CameraType,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      storeLocalDocument("docSelfie", {
        uri: asset.uri,
        base64: asset.base64 ?? undefined,
        mimeType: asset.mimeType ?? undefined,
        fileName: asset.fileName ?? undefined,
        displayName: asset.fileName ?? undefined,
      });
    }
  }

  async function uploadDocument(name: string, value: string) {
    if (!/^(file|content|ph):/i.test(value)) return value;
    const fieldMap: Record<string, DocumentField> = {
      rg: "docRg",
      residence: "docResidence",
      cnh: "docCnh",
      crlv: "docCrlv",
      selfie: "docSelfie",
    };
    const field = fieldMap[name];
    const localAsset = field ? localDocumentAssets.current[field] : undefined;
    const mimeType = inferMimeType(value, localAsset?.mimeType);
    const ext = inferExtension(value, mimeType, localAsset?.fileName);
    const providerSlug = toStorageSlug(
      providerUser.name || form.fullName || providerUser.email || providerUser.id,
    );
    const path = `${providerUser.id}/${providerSlug}/${providerSlug}-${name}-${Date.now()}.${ext}`;
    let bytes: Uint8Array;

    try {
      if (localAsset?.base64) {
        bytes = base64ToUint8Array(localAsset.base64);
      } else {
        bytes = await readUriAsBytes(localAsset?.uri || value);
      }
    } catch {
      throw new Error(`Não foi possível ler o arquivo "${name}". Selecione novamente.`);
    }

    if (!bytes.byteLength) {
      throw new Error(`O arquivo "${name}" foi recebido vazio. Selecione novamente antes de enviar.`);
    }

    const { error } = await supabase.storage.from("provider-docs").upload(path, bytes, {
      contentType: mimeType,
      upsert: true,
    });
    if (error) throw error;
    return path;
  }

  async function persistValidationFallback(payload: Record<string, unknown>) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        name: payload.full_name,
        phone: payload.phone,
        cpf: payload.cpf,
      })
      .eq("id", providerUser.id);

    if (profileError) {
      throw profileError;
    }

    const { error: providerError } = await supabase
      .from("providers")
      .update({
        cpf: payload.cpf,
        birth_date: payload.birth_date,
        service_type: payload.service_type,
        service_category: payload.service_category,
        vehicle_type: payload.vehicle_type,
        vehicle_model: payload.vehicle_model,
        vehicle_year: payload.vehicle_year,
        vehicle_plate: payload.vehicle_plate,
        contact_method: payload.contact_method,
        contact_availability: payload.contact_availability,
        doc_rg_url: payload.doc_rg_url,
        doc_residence_url: payload.doc_residence_url,
        doc_cnh_url: payload.doc_cnh_url,
        doc_crlv_url: payload.doc_crlv_url || null,
        doc_selfie_url: payload.doc_selfie_url,
        onboarding_status: "submitted",
        validation_notes: payload.validation_notes || null,
        submitted_at: new Date().toISOString(),
        verified: false,
        active: false,
        rejection_reason: null,
        rejection_until: null,
      })
      .eq("id", providerUser.id);

    if (providerError) {
      throw providerError;
    }
  }

  async function handleSubmit() {
    if (submitting || providerReviewOnly) return;
    setSubmitting(true);
    try {
      const [docRg, docResidence, docCnh, docCrlv, docSelfie] = await Promise.all([
        uploadDocument("rg", form.docRg),
        uploadDocument("residence", form.docResidence),
        uploadDocument("cnh", form.docCnh),
        form.docCrlv ? uploadDocument("crlv", form.docCrlv) : Promise.resolve(""),
        uploadDocument("selfie", form.docSelfie),
      ]);

      const payload = {
        full_name: form.fullName.trim(),
        cpf: form.cpf.replace(/\D/g, ""),
        birth_date: form.birthDate.split("/").reverse().join("-"),
        phone: form.phone.replace(/\D/g, ""),
        service_type: form.serviceType,
        service_category: form.serviceCategory,
        vehicle_type: form.vehicleType,
        vehicle_model: form.vehicleModel.trim(),
        vehicle_year: Number(form.vehicleYear),
        vehicle_plate: form.vehiclePlate.replace(/[^A-Z0-9]/gi, "").toUpperCase(),
        contact_method: form.contactMethod,
        contact_availability: form.contactAvailability,
        doc_rg_url: docRg,
        doc_residence_url: docResidence,
        doc_cnh_url: docCnh,
        doc_crlv_url: docCrlv,
        doc_selfie_url: docSelfie,
        validation_notes: form.notes.trim(),
      };

      try {
        const { error } = await supabase.functions.invoke("provider_validation_submit", {
          body: payload,
        });

        if (error) throw error;
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : String(submitError);
        const isNetworkFailure =
          message.includes("Network request failed") ||
          message.includes("Failed to fetch") ||
          message.includes("fetch");

        if (!isNetworkFailure) {
          throw submitError;
        }

        await persistValidationFallback(payload);
      }

      await refreshUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await send("provider_validation_received");
      router.replace("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível enviar. Tente novamente.";
      Alert.alert("Erro", msg);
    } finally {
      setSubmitting(false);
    }
  }

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

  const reviewStatusTitle =
    providerStatus === "approved" || providerUser.provider?.verified
      ? "Conta verificada"
      : "Validação em análise";
  const reviewStatusText =
    providerStatus === "approved" || providerUser.provider?.verified
      ? "Sua conta está liberada. Este painel mostra a última validação enviada."
      : "Recebemos sua validação e ela está aguardando análise da equipe.";

  if (providerReviewOnly) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 24, marginBottom: 16 }}>
          <Pressable onPress={() => router.replace("/")} style={[st.backBtn, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="chevron-back" size={18} color={c.text} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 11, fontFamily: fonts.sans.bold, color: c.softMuted, letterSpacing: 0.8 }}>VALIDAÇÃO DE PRESTADOR</Text>
            <Text style={{ fontSize: 13, fontFamily: fonts.sans.medium, color: c.sub }}>Visualização do envio</Text>
          </View>
          <View style={[st.pill, { backgroundColor: `${c.blue}14`, borderColor: `${c.blue}44` }]}>
            <Ionicons
              name={providerStatus === "approved" || providerUser.provider?.verified ? "checkmark-circle-outline" : "time-outline"}
              size={11}
              color={c.blue}
            />
            <Text style={{ fontSize: 11, fontFamily: fonts.sans.bold, color: c.blue }}>
              {providerStatus === "approved" || providerUser.provider?.verified ? "Aprovada" : "Enviada"}
            </Text>
          </View>
        </View>

        <KeyboardAwareScrollViewCompat
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[st.infoBox, { backgroundColor: `${c.blue}12`, borderColor: `${c.blue}30`, marginTop: 4, marginBottom: 16 }]}>
            <Ionicons
              name={providerStatus === "approved" || providerUser.provider?.verified ? "shield-checkmark" : "time-outline"}
              size={16}
              color={c.blue}
            />
            <Text style={{ flex: 1, fontSize: 12, fontFamily: fonts.sans.regular, color: c.text, lineHeight: 18 }}>
              <Text style={{ fontFamily: fonts.sans.bold }}>{reviewStatusTitle}. </Text>
              {reviewStatusText}
            </Text>
          </View>

          {reviewSections.map((section) => (
            <View key={section.title} style={[st.reviewCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={{ fontSize: 13, fontFamily: fonts.sans.bold, color: c.text, marginBottom: 10 }}>
                {section.icon} {section.title}
              </Text>
              {section.rows.map(([label, value]) => (
                <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.borderLight }}>
                  <Text style={{ fontSize: 12, fontFamily: fonts.sans.regular, color: c.softMuted }}>{label}</Text>
                  <Text style={{ fontSize: 12, fontFamily: fonts.sans.medium, color: c.text, maxWidth: "60%", textAlign: "right" }}>
                    {value || "—"}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          <Pressable
            onPress={() => router.replace("/")}
            style={[st.submitBtn, { backgroundColor: c.blue, marginTop: 12 }, shadows.md]}
          >
            <Text style={st.submitBtnTxt}>Voltar para a home</Text>
            <Ionicons name="home-outline" size={16} color="#fff" />
          </Pressable>
        </KeyboardAwareScrollViewCompat>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
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
          <KeyboardAwareScrollViewCompat
            key={`step-${step}`}
            ref={scrollRef}
            bottomOffset={insets.bottom + 110}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 90 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View ref={contentRef}>
            {providerRejected && providerUser.provider?.rejection_reason ? (
              <View style={[st.infoBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA", marginBottom: 14 }]}>
                <Ionicons name="alert-circle-outline" size={16} color={ERROR_COLOR} />
                <Text style={{ flex: 1, fontSize: 12, fontFamily: fonts.sans.regular, color: c.text, lineHeight: 18 }}>
                  <Text style={{ fontFamily: fonts.sans.bold, color: ERROR_COLOR }}>Validação anterior recusada. </Text>
                  {providerUser.provider.rejection_reason}
                </Text>
              </View>
            ) : null}

            {step === 1 && (
              <View>
                <Text style={[st.title, { color: c.text }]}>Dados pessoais</Text>
                <Text style={[st.sub, { color: c.sub }]}>Informe seus dados para identificação. Devem coincidir com os documentos.</Text>

                <View style={[st.readonlyCard, { backgroundColor: `${c.blue}0A`, borderColor: `${c.blue}30` }]}>
                  <Ionicons name="mail-outline" size={14} color={c.blue} />
                  <Text style={{ flex: 1, fontSize: 13, fontFamily: fonts.sans.medium, color: c.text }}>{user.email}</Text>
                  <Text style={{ fontSize: 10, fontFamily: fonts.sans.bold, color: c.blue }}>CONTA</Text>
                </View>

                <View ref={setFieldAnchor("fullName")}>
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
                  <View style={{ flex: 1 }} ref={setFieldAnchor("cpf")}>
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
                  <View style={{ flex: 1 }} ref={setFieldAnchor("birthDate")}>
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

                <View ref={setFieldAnchor("phone")}>
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

            {step === 2 && (
              <View>
                <Text style={[st.title, { color: c.text }]}>Serviço e veículo</Text>
                <Text style={[st.sub, { color: c.sub }]}>Defina o tipo de serviço que você oferece e os dados do seu veículo.</Text>

                <View ref={setFieldAnchor("serviceType")}>
                  <Label text="TIPO DE SERVIÇO" required />
                  <ServiceTypeCard
                    options={SERVICE_TYPES}
                    value={form.serviceType}
                    onSelect={(v) => {
                      focusField("serviceType");
                      setField("serviceType", v as ServiceType);
                      setField("serviceCategory", "");
                    }}
                    error={errors.serviceType}
                  />
                </View>

                {form.serviceType && (
                  <View ref={setFieldAnchor("serviceCategory")}>
                    <Label text="CATEGORIA" required />
                    <RadioRow
                      options={SERVICE_CATEGORIES[form.serviceType as ServiceType] || []}
                      value={form.serviceCategory}
                      onSelect={(v) => {
                        focusField("serviceCategory");
                        setField("serviceCategory", v);
                      }}
                      error={errors.serviceCategory}
                    />
                  </View>
                )}

                <View style={[st.divider, { borderColor: c.border }]} />

                <View ref={setFieldAnchor("vehicleType")}>
                  <Label text="TIPO DE VEÍCULO" required />
                  <RadioRow
                    options={VEHICLE_TYPES.map((v) => ({ ...v, icon: undefined, label: `${v.icon} ${v.label}` }))}
                    value={form.vehicleType}
                    onSelect={(v) => {
                      focusField("vehicleType");
                      setField("vehicleType", v as VehicleType);
                    }}
                    error={errors.vehicleType}
                  />
                </View>

                <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                  <View style={{ flex: 2 }} ref={setFieldAnchor("vehicleModel")}>
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
                  <View style={{ flex: 1 }} ref={setFieldAnchor("vehicleYear")}>
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

                <View ref={setFieldAnchor("vehiclePlate")}>
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

            {step === 3 && (
              <View>
                <Text style={[st.title, { color: c.text }]}>Contato e disponibilidade</Text>
                <Text style={[st.sub, { color: c.sub }]}>Como prefere ser contatado pela nossa equipe antes da aprovação?</Text>

                <View ref={setFieldAnchor("contactMethod")}>
                  <Label text="MÉTODO PREFERIDO" required />
                  <RadioRow
                    options={CONTACT_METHODS.map((m) => ({ ...m, icon: m.icon }))}
                    value={form.contactMethod}
                    onSelect={(v) => {
                      focusField("contactMethod");
                      setField("contactMethod", v as ContactMethod);
                    }}
                    error={errors.contactMethod}
                  />
                </View>

                <View ref={setFieldAnchor("contactAvailability")}>
                  <Label text="DISPONIBILIDADE PARA CONTATO" required />
                  <RadioRow
                    options={AVAILABILITY_OPTIONS}
                    value={form.contactAvailability}
                    onSelect={(v) => {
                      focusField("contactAvailability");
                      setField("contactAvailability", v as Availability);
                    }}
                    error={errors.contactAvailability}
                  />
                </View>

                <View ref={setFieldAnchor("notes")}>
                  <Label text="OBSERVAÇÕES" />
                  <TextInput
                    value={form.notes}
                    onChangeText={(t) => setField("notes", sanitize(t))}
                    onFocus={() => focusField("notes")}
                    placeholder="Informações adicionais para a equipe de validação (opcional)"
                    placeholderTextColor={c.softMuted}
                    inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
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
                  displayName={getDocumentMeta("docRg").displayName}
                  mimeType={getDocumentMeta("docRg").mimeType}
                  onPickGallery={() => pickFromGallery("docRg")}
                  onPickDocument={canPickFiles ? () => pickDocument("docRg") : undefined}
                  hint={canPickFiles ? "Frente e verso · JPG, PNG ou PDF" : "Frente e verso · JPG ou PNG"}
                  error={errors.docRg}
                />

                <DocPickerRow
                  label="COMPROVANTE DE RESIDÊNCIA"
                  required
                  uri={form.docResidence}
                  displayName={getDocumentMeta("docResidence").displayName}
                  mimeType={getDocumentMeta("docResidence").mimeType}
                  onPickGallery={() => pickFromGallery("docResidence")}
                  onPickDocument={canPickFiles ? () => pickDocument("docResidence") : undefined}
                  hint="Emitido há no máx. 90 dias"
                  error={errors.docResidence}
                />

                <DocPickerRow
                  label="CNH — CARTEIRA NACIONAL DE HABILITAÇÃO"
                  required
                  uri={form.docCnh}
                  displayName={getDocumentMeta("docCnh").displayName}
                  mimeType={getDocumentMeta("docCnh").mimeType}
                  onPickGallery={() => pickFromGallery("docCnh")}
                  onPickDocument={canPickFiles ? () => pickDocument("docCnh") : undefined}
                  hint={canPickFiles ? "Dentro da validade — frente e verso" : "Dentro da validade — envie como foto"}
                  error={errors.docCnh}
                />

                <DocPickerRow
                  label="CRLV — DOCUMENTO DO VEÍCULO"
                  uri={form.docCrlv}
                  displayName={getDocumentMeta("docCrlv").displayName}
                  mimeType={getDocumentMeta("docCrlv").mimeType}
                  onPickGallery={() => pickFromGallery("docCrlv")}
                  onPickDocument={canPickFiles ? () => pickDocument("docCrlv") : undefined}
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
                  displayName={getDocumentMeta("docSelfie").displayName}
                  mimeType={getDocumentMeta("docSelfie").mimeType}
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

            </View>
          </KeyboardAwareScrollViewCompat>
        </Animated.View>

        <View style={[st.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: c.background, borderColor: c.border }]}>
          <Pressable
            onPress={step < 5 ? goNext : handleSubmit}
            disabled={submitting}
            style={[st.submitBtn, { backgroundColor: c.blue, opacity: submitting ? 0.7 : 1 }, shadows.md]}
          >
            <Text style={st.submitBtnTxt}>
              {step < 5 ? "Continuar" : "Enviar validação"}
            </Text>
            <Ionicons name={step < 5 ? "arrow-forward" : "checkmark-circle"} size={16} color="#fff" />
          </Pressable>
        </View>

        {Platform.OS === "android" && keyboardVisible ? (
          <Pressable
            onPress={() => Keyboard.dismiss()}
            style={[
              st.keyboardDismissButton,
              {
                bottom: Math.max(keyboardInset - 44, 12),
                backgroundColor: c.text,
              },
              shadows.md,
            ]}
          >
            <Ionicons name="chevron-down" size={16} color={c.background} />
            <Text style={[st.keyboardDismissText, { color: c.background }]}>Fechar teclado</Text>
          </Pressable>
        ) : null}

        {Platform.OS === "ios" ? (
          <InputAccessoryView nativeID={KEYBOARD_ACCESSORY_ID}>
            <View style={[st.keyboardAccessory, { backgroundColor: c.card, borderColor: c.border }]}>
              <Pressable onPress={() => Keyboard.dismiss()} style={st.keyboardAccessoryButton}>
                <Text style={[st.keyboardAccessoryText, { color: c.blue }]}>Fechar teclado</Text>
              </Pressable>
            </View>
          </InputAccessoryView>
        ) : null}

        {submitting ? (
          <View style={st.loadingOverlay}>
            <View style={[st.loadingCard, { backgroundColor: c.card, borderColor: c.border }, shadows.xl]}>
              <ActivityIndicator size="large" color={c.blue} />
              <Text style={[st.loadingTitle, { color: c.text }]}>Enviando validação</Text>
              <Text style={[st.loadingText, { color: c.sub }]}>
                Estamos salvando seus dados e processando os documentos enviados.
              </Text>
            </View>
          </View>
        ) : null}
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.38)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
  },
  loadingTitle: {
    marginTop: 18,
    fontSize: 18,
    fontFamily: fonts.sans.bold,
    textAlign: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: fonts.sans.regular,
    lineHeight: 19,
    textAlign: "center",
  },
  keyboardDismissButton: {
    position: "absolute",
    right: 20,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  keyboardDismissText: {
    fontSize: 12,
    fontFamily: fonts.sans.bold,
  },
  keyboardAccessory: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "flex-end",
  },
  keyboardAccessoryButton: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  keyboardAccessoryText: {
    fontSize: 13,
    fontFamily: fonts.sans.bold,
  },
});
