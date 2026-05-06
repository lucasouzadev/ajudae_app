import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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
import colors, { fonts, shadows } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type ServiceType = "frete" | "mudanca" | "entrega";
type ContactMethod = "ligacao" | "whatsapp";
type VehicleType = "car" | "utility" | "van" | "truck_small" | "truck_large";

interface FormState {
  fullName: string;
  cpf: string;
  birthDate: string;
  phone: string;
  serviceType: ServiceType;
  serviceCategory: string;
  vehicleType: VehicleType;
  vehicleModel: string;
  vehicleYear: string;
  vehiclePlate: string;
  contactMethod: ContactMethod;
  contactAvailability: string;
  docRg: string;
  docResidence: string;
  docCnh: string;
  docCrlv: string;
  docSelfie: string;
  notes: string;
}

const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: "frete", label: "Frete" },
  { value: "mudanca", label: "Mudança" },
  { value: "entrega", label: "Entrega" },
];

const VEHICLE_TYPE_OPTIONS: { value: VehicleType; label: string }[] = [
  { value: "car", label: "Carro utilitário / pickup pequena" },
  { value: "utility", label: "Pickup média" },
  { value: "van", label: "Furgão / Van de carga" },
  { value: "truck_small", label: "Van grande / Caminhão pequeno" },
  { value: "truck_large", label: "Caminhão" },
];

const CONTACT_METHOD_OPTIONS: { value: ContactMethod; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "ligacao", label: "Ligação" },
];

function sanitize(raw: string) {
  return raw.replace(/<[^>]*>/g, "").replace(/[<>"'`\\]/g, "").trimStart();
}

function maskCPF(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function maskPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) return digits.replace(/(\d{2})(\d{4})(\d)/, "($1) $2-$3");
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
}

function maskDate(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return digits
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}

function maskPlate(raw: string) {
  const value = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  if (value.length <= 3) return value;
  return `${value.slice(0, 3)}-${value.slice(3)}`;
}

function validateCPF(value: string) {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i);
  let rest = sum % 11;
  const digit1 = rest < 2 ? 0 : 11 - rest;
  if (digit1 !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i);
  rest = sum % 11;
  const digit2 = rest < 2 ? 0 : 11 - rest;
  return digit2 === Number(cpf[10]);
}

function Label({ text, required = false }: { text: string; required?: boolean }) {
  const c = colors.light;
  return (
    <Text style={[styles.label, { color: c.softMuted }]}>
      {text}
      {required ? <Text style={{ color: c.destructive }}> *</Text> : null}
    </Text>
  );
}

function FieldError({ message }: { message?: string }) {
  const c = colors.light;
  if (!message) return null;

  return (
    <View style={styles.errorRow}>
      <Ionicons name="alert-circle" size={12} color={c.destructive} />
      <Text style={[styles.errorText, { color: c.destructive }]}>{message}</Text>
    </View>
  );
}

function SelectCards<T extends string>({
  value,
  options,
  onSelect,
}: {
  value: T;
  options: { value: T; label: string }[];
  onSelect: (nextValue: T) => void;
}) {
  const c = colors.light;
  return (
    <View style={styles.selectGrid}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={[
              styles.selectCard,
              {
                backgroundColor: active ? `${c.blue}14` : c.card,
                borderColor: active ? c.blue : c.border,
              },
            ]}
          >
            <Text
              style={[
                styles.selectCardText,
                { color: active ? c.blue : c.text },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DocumentButton({
  label,
  value,
  onPress,
  required = false,
}: {
  label: string;
  value: string;
  onPress: () => void;
  required?: boolean;
}) {
  const c = colors.light;
  const displayName = value ? value.split("/").pop() || "Arquivo selecionado" : "Selecionar arquivo";

  return (
    <View style={{ marginTop: 14 }}>
      <Label text={label} required={required} />
      <Pressable
        onPress={onPress}
        style={[
          styles.documentButton,
          {
            backgroundColor: value ? `${c.blue}12` : c.card,
            borderColor: value ? c.blue : c.border,
          },
        ]}
      >
        <Ionicons name={value ? "checkmark-circle" : "document-outline"} size={18} color={value ? c.blue : c.softMuted} />
        <Text style={[styles.documentButtonText, { color: value ? c.blue : c.text }]} numberOfLines={1}>
          {displayName}
        </Text>
      </Pressable>
    </View>
  );
}

export default function ProviderValidationScreen() {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const { user, role, refreshUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const initialForm = useMemo<FormState>(() => ({
    fullName: user?.name || "",
    cpf: user?.cpf ? maskCPF(user.cpf) : "",
    birthDate: user?.provider?.birth_date ? user.provider.birth_date.split("-").reverse().join("/") : "",
    phone: user?.phone ? maskPhone(user.phone) : "",
    serviceType: (user?.provider?.service_type as ServiceType) || "frete",
    serviceCategory: user?.provider?.service_category || "",
    vehicleType: (user?.provider?.vehicle_type as VehicleType) || "van",
    vehicleModel: user?.provider?.vehicle_model || "",
    vehicleYear: user?.provider?.vehicle_year ? String(user.provider.vehicle_year) : "",
    vehiclePlate: user?.provider?.vehicle_plate ? maskPlate(user.provider.vehicle_plate) : "",
    contactMethod: (user?.provider?.contact_method as ContactMethod) || "whatsapp",
    contactAvailability: user?.provider?.contact_availability || "",
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
      <View style={[styles.fallbackScreen, { backgroundColor: c.background, paddingTop: insets.top + 24 }]}>
        <Text style={[styles.title, { color: c.text }]}>Acesso indisponível</Text>
        <Pressable onPress={() => router.replace("/")} style={[styles.primaryButton, { backgroundColor: c.blue }]}>
          <Text style={styles.primaryButtonText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const providerUser = user;

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  async function pickDocument(field: keyof Pick<FormState, "docRg" | "docResidence" | "docCnh" | "docCrlv" | "docSelfie">) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permissão necessária", "Precisamos de acesso à galeria para anexar seus documentos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      updateField(field, result.assets[0].uri);
    }
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {};
    const cleanCpf = form.cpf.replace(/\D/g, "");
    const cleanPhone = form.phone.replace(/\D/g, "");
    const cleanPlate = form.vehiclePlate.replace(/[^A-Z0-9]/gi, "");

    if (!form.fullName.trim() || form.fullName.trim().split(/\s+/).length < 2) {
      nextErrors.fullName = "Informe nome e sobrenome.";
    }

    if (!validateCPF(cleanCpf)) {
      nextErrors.cpf = "CPF inválido.";
    }

    if (form.birthDate.length !== 10) {
      nextErrors.birthDate = "Informe a data no formato DD/MM/AAAA.";
    }

    if (cleanPhone.length < 10) {
      nextErrors.phone = "Telefone inválido.";
    }

    if (!form.serviceCategory.trim()) {
      nextErrors.serviceCategory = "Informe a categoria de atuação.";
    }

    if (!form.vehicleModel.trim()) {
      nextErrors.vehicleModel = "Informe o modelo do veículo.";
    }

    if (!form.vehicleYear.trim()) {
      nextErrors.vehicleYear = "Informe o ano do veículo.";
    }

    if (cleanPlate.length < 7) {
      nextErrors.vehiclePlate = "Informe a placa completa.";
    }

    if (!form.contactAvailability.trim()) {
      nextErrors.contactAvailability = "Informe sua disponibilidade.";
    }

    if (!form.docRg) nextErrors.docRg = "Envie seu RG.";
    if (!form.docResidence) nextErrors.docResidence = "Envie o comprovante de residência.";
    if (!form.docCnh) nextErrors.docCnh = "Envie sua CNH.";
    if (!form.docSelfie) nextErrors.docSelfie = "Envie sua selfie.";

    setErrors(nextErrors);
    return { valid: Object.keys(nextErrors).length === 0, cleanCpf, cleanPhone };
  }

  async function uploadDocument(name: string, value: string) {
    if (!/^(file|content|ph):/i.test(value)) {
      return value;
    }

    let response: Response;
    try {
      response = await fetch(value);
    } catch (err) {
      console.warn(`[uploadDocument] fetch falhou para ${name}:`, err);
      throw new Error(`Não foi possível ler o arquivo "${name}". Tente selecionar novamente.`);
    }
    const blob = await response.blob();
    const extension = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const path = `${providerUser.id}/${Date.now()}-${name}.${extension}`;

    const { error } = await supabase.storage
      .from("provider-docs")
      .upload(path, blob, {
        contentType: blob.type || "image/jpeg",
        upsert: true,
      });

    if (error) {
      throw error;
    }

    return path;
  }

  async function handleSubmit() {
    const { valid, cleanCpf, cleanPhone } = validateForm();
    if (!valid) return;

    setSubmitting(true);

    try {
      const [docRg, docResidence, docCnh, docCrlv, docSelfie] = await Promise.all([
        uploadDocument("rg", form.docRg),
        uploadDocument("residence", form.docResidence),
        uploadDocument("cnh", form.docCnh),
        form.docCrlv ? uploadDocument("crlv", form.docCrlv) : Promise.resolve(""),
        uploadDocument("selfie", form.docSelfie),
      ]);

      const birthDate = form.birthDate.split("/").reverse().join("-");
      const vehicleYear = Number(form.vehicleYear);

      const { error } = await supabase.functions.invoke("provider_validation_submit", {
        body: {
          full_name: form.fullName.trim(),
          cpf: cleanCpf,
          birth_date: birthDate,
          phone: cleanPhone,
          service_type: form.serviceType,
          service_category: form.serviceCategory.trim(),
          vehicle_type: form.vehicleType,
          vehicle_model: form.vehicleModel.trim(),
          vehicle_year: vehicleYear,
          vehicle_plate: form.vehiclePlate,
          contact_method: form.contactMethod,
          contact_availability: form.contactAvailability.trim(),
          doc_rg_url: docRg,
          doc_residence_url: docResidence,
          doc_cnh_url: docCnh,
          doc_crlv_url: docCrlv,
          doc_selfie_url: docSelfie,
          validation_notes: form.notes.trim(),
        },
      });

      if (error) {
        throw error;
      }

      await refreshUser();
      Alert.alert("Validação enviada", "Recebemos seus documentos. Você receberá atualização por e-mail.");
      router.replace("/");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Não foi possível enviar sua validação.";
      Alert.alert("Erro", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={18} color={c.text} />
          </Pressable>
          <View style={[styles.pill, { backgroundColor: `${c.blue}14`, borderColor: `${c.blue}30` }]}>
            <Ionicons name="shield-checkmark-outline" size={12} color={c.blue} />
            <Text style={[styles.pillText, { color: c.blue }]}>Validar conta</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: c.text }]}>Validação do prestador</Text>
        <Text style={[styles.subtitle, { color: c.sub }]}>
          Revise seus dados, envie documentos e finalize sua validação.
        </Text>

        <View style={[styles.sectionCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Label text="E-MAIL DA CONTA" />
          <View style={[styles.readonlyField, { backgroundColor: c.background, borderColor: c.border }]}>
            <Text style={[styles.readonlyText, { color: c.text }]}>{user.email}</Text>
          </View>

          <Label text="NOME COMPLETO" required />
          <TextInput
            value={form.fullName}
            onChangeText={(value) => updateField("fullName", sanitize(value))}
            style={[styles.input, { backgroundColor: c.background, borderColor: errors.fullName ? c.destructive : c.border, color: c.text }]}
          />
          <FieldError message={errors.fullName} />

          <Label text="CPF" required />
          <TextInput
            value={form.cpf}
            onChangeText={(value) => updateField("cpf", maskCPF(value))}
            keyboardType="number-pad"
            style={[styles.input, { backgroundColor: c.background, borderColor: errors.cpf ? c.destructive : c.border, color: c.text }]}
          />
          <FieldError message={errors.cpf} />

          <Label text="DATA DE NASCIMENTO" required />
          <TextInput
            value={form.birthDate}
            onChangeText={(value) => updateField("birthDate", maskDate(value))}
            keyboardType="number-pad"
            placeholder="DD/MM/AAAA"
            placeholderTextColor={c.softMuted}
            style={[styles.input, { backgroundColor: c.background, borderColor: errors.birthDate ? c.destructive : c.border, color: c.text }]}
          />
          <FieldError message={errors.birthDate} />

          <Label text="TELEFONE" required />
          <TextInput
            value={form.phone}
            onChangeText={(value) => updateField("phone", maskPhone(value))}
            keyboardType="phone-pad"
            style={[styles.input, { backgroundColor: c.background, borderColor: errors.phone ? c.destructive : c.border, color: c.text }]}
          />
          <FieldError message={errors.phone} />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Label text="TIPO DE SERVIÇO" required />
          <SelectCards value={form.serviceType} options={SERVICE_TYPE_OPTIONS} onSelect={(value) => updateField("serviceType", value)} />

          <Label text="CATEGORIA DE ATUAÇÃO" required />
          <TextInput
            value={form.serviceCategory}
            onChangeText={(value) => updateField("serviceCategory", sanitize(value))}
            placeholder="Ex.: Frete leve, mudança residencial"
            placeholderTextColor={c.softMuted}
            style={[styles.input, { backgroundColor: c.background, borderColor: errors.serviceCategory ? c.destructive : c.border, color: c.text }]}
          />
          <FieldError message={errors.serviceCategory} />

          <Label text="TIPO DE VEÍCULO" required />
          <SelectCards value={form.vehicleType} options={VEHICLE_TYPE_OPTIONS} onSelect={(value) => updateField("vehicleType", value)} />

          <Label text="MODELO DO VEÍCULO" required />
          <TextInput
            value={form.vehicleModel}
            onChangeText={(value) => updateField("vehicleModel", sanitize(value))}
            style={[styles.input, { backgroundColor: c.background, borderColor: errors.vehicleModel ? c.destructive : c.border, color: c.text }]}
          />
          <FieldError message={errors.vehicleModel} />

          <Label text="ANO DO VEÍCULO" required />
          <TextInput
            value={form.vehicleYear}
            onChangeText={(value) => updateField("vehicleYear", value.replace(/\D/g, "").slice(0, 4))}
            keyboardType="number-pad"
            style={[styles.input, { backgroundColor: c.background, borderColor: errors.vehicleYear ? c.destructive : c.border, color: c.text }]}
          />
          <FieldError message={errors.vehicleYear} />

          <Label text="PLACA" required />
          <TextInput
            value={form.vehiclePlate}
            onChangeText={(value) => updateField("vehiclePlate", maskPlate(value))}
            autoCapitalize="characters"
            style={[styles.input, { backgroundColor: c.background, borderColor: errors.vehiclePlate ? c.destructive : c.border, color: c.text }]}
          />
          <FieldError message={errors.vehiclePlate} />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Label text="MÉTODO DE CONTATO" required />
          <SelectCards value={form.contactMethod} options={CONTACT_METHOD_OPTIONS} onSelect={(value) => updateField("contactMethod", value)} />

          <Label text="DISPONIBILIDADE" required />
          <TextInput
            value={form.contactAvailability}
            onChangeText={(value) => updateField("contactAvailability", sanitize(value))}
            placeholder="Ex.: segunda a sábado, 8h às 18h"
            placeholderTextColor={c.softMuted}
            style={[styles.input, { backgroundColor: c.background, borderColor: errors.contactAvailability ? c.destructive : c.border, color: c.text }]}
          />
          <FieldError message={errors.contactAvailability} />

          <Label text="OBSERVAÇÕES" />
          <TextInput
            value={form.notes}
            onChangeText={(value) => updateField("notes", sanitize(value))}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[
              styles.input,
              styles.textarea,
              { backgroundColor: c.background, borderColor: c.border, color: c.text },
            ]}
          />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <DocumentButton label="RG" value={form.docRg} required onPress={() => pickDocument("docRg")} />
          <FieldError message={errors.docRg} />

          <DocumentButton label="Comprovante de residência" value={form.docResidence} required onPress={() => pickDocument("docResidence")} />
          <FieldError message={errors.docResidence} />

          <DocumentButton label="CNH" value={form.docCnh} required onPress={() => pickDocument("docCnh")} />
          <FieldError message={errors.docCnh} />

          <DocumentButton label="CRLV" value={form.docCrlv} onPress={() => pickDocument("docCrlv")} />
          <FieldError message={errors.docCrlv} />

          <DocumentButton label="Selfie com rosto visível" value={form.docSelfie} required onPress={() => pickDocument("docSelfie")} />
          <FieldError message={errors.docSelfie} />
        </View>

        <Pressable
          disabled={submitting}
          onPress={handleSubmit}
          style={[
            styles.submitButton,
            { backgroundColor: c.blue, opacity: submitting ? 0.7 : 1 },
            shadows.md,
          ]}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? "Enviando..." : "Enviar validação"}
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fallbackScreen: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontFamily: fonts.sans.bold,
  },
  title: {
    fontSize: 30,
    fontFamily: fonts.serif.extra,
    lineHeight: 34,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.sans.regular,
    lineHeight: 21,
    marginBottom: 22,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontFamily: fonts.sans.bold,
    letterSpacing: 0.9,
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: fonts.sans.medium,
  },
  textarea: {
    height: 108,
    paddingTop: 14,
    paddingBottom: 14,
  },
  readonlyField: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  readonlyText: {
    fontSize: 14,
    fontFamily: fonts.sans.medium,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  errorText: {
    fontSize: 11,
    fontFamily: fonts.sans.medium,
  },
  selectGrid: {
    gap: 8,
  },
  selectCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectCardText: {
    fontSize: 13,
    fontFamily: fonts.sans.bold,
  },
  documentButton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  documentButtonText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.sans.medium,
  },
  submitButton: {
    marginTop: 8,
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: fonts.sans.extra,
  },
  primaryButton: {
    marginTop: 24,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: fonts.sans.bold,
  },
});
