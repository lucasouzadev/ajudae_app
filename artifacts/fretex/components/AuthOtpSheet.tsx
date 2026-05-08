import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors, { fonts, shadows } from "@/constants/colors";

interface AuthOtpSheetProps {
  visible: boolean;
  email: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (code: string) => Promise<void> | void;
  onResend: () => Promise<void> | void;
}

function mapOtpError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('Token has expired') || message.includes('expired')) {
    return 'Código expirado. Reenvie e tente novamente.';
  }

  if (message.includes('Token not found') || message.includes('Invalid token') || message.includes('invalid')) {
    return 'Código inválido. Confira e tente novamente.';
  }

  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Muitas tentativas. Aguarde um pouco antes de reenviar.';
  }

  if (message.includes('Network') || message.includes('fetch')) {
    return 'Sem conexão. Verifique sua internet.';
  }

  return 'Não foi possível confirmar código agora. Tente novamente.';
}

export function AuthOtpSheet({
  visible,
  email,
  loading = false,
  onClose,
  onConfirm,
  onResend,
}: AuthOtpSheetProps) {
  const c = colors.light;
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(480)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      slideAnim.stopAnimation();
      backdropAnim.stopAnimation();
      slideAnim.setValue(480);
      backdropAnim.setValue(0);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 14, useNativeDriver: true }),
          Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]).start();
      });
      return;
    }

    if (!mounted) {
      setCode("");
      setError("");
      setResendMessage("");
      return;
    }

    slideAnim.stopAnimation();
    backdropAnim.stopAnimation();
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 480, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setMounted(false);
      setCode("");
      setError("");
      setResendMessage("");
    });
  }, [backdropAnim, mounted, slideAnim, visible]);

  async function handleConfirm() {
    const normalized = code.replace(/\D/g, "").slice(0, 6);

    if (normalized.length !== 6) {
      setError("Digite os 6 números do código.");
      return;
    }

    setBusy(true);
    setError("");
    setResendMessage("");

    try {
      await onConfirm(normalized);
      setCode("");
    } catch (submitError) {
      setError(mapOtpError(submitError));
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setBusy(true);
    setError("");
    setResendMessage("");

    try {
      await onResend();
      setResendMessage("Código reenviado para seu e-mail.");
    } catch (resendError) {
      setError(mapOtpError(resendError));
    } finally {
      setBusy(false);
    }
  }

  const disabled = loading || busy;

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay, opacity: backdropAnim }]}
        />

        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetWrap}
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: c.card,
                paddingBottom: insets.bottom + 20,
                transform: [{ translateY: slideAnim }],
              },
              shadows.xl,
            ]}
          >
            <View style={[styles.handle, { backgroundColor: c.border }]} />

            <View style={[styles.iconWrap, { backgroundColor: `${c.blue}14` }]}>
              <Ionicons name="mail-open-outline" size={22} color={c.blue} />
            </View>

            <Text style={[styles.title, { color: c.text }]}>Confirmar conta</Text>
            <Text style={[styles.subtitle, { color: c.sub }]}>
              Digite o código de 6 números enviado para{" "}
              <Text style={{ fontFamily: fonts.sans.bold, color: c.text }}>{email}</Text>.
            </Text>

            <Text style={[styles.label, { color: c.softMuted }]}>CÓDIGO OTP</Text>
            <TextInput
              value={code}
              onChangeText={(value) => {
                setCode(value.replace(/\D/g, "").slice(0, 6));
                if (error) setError("");
              }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={c.softMuted}
              style={[
                styles.input,
                {
                  borderColor: error ? c.destructive : c.border,
                  color: c.text,
                  backgroundColor: c.background,
                },
              ]}
            />

            {error ? (
              <View style={styles.messageRow}>
                <Ionicons name="alert-circle" size={14} color={c.destructive} />
                <Text style={[styles.errorText, { color: c.destructive }]}>{error}</Text>
              </View>
            ) : null}

            {resendMessage ? (
              <View style={styles.messageRow}>
                <Ionicons name="checkmark-circle" size={14} color={c.success} />
                <Text style={[styles.successText, { color: c.success }]}>{resendMessage}</Text>
              </View>
            ) : null}

            <Pressable
              disabled={disabled}
              onPress={handleConfirm}
              style={[
                styles.primaryButton,
                { backgroundColor: c.blue, opacity: disabled ? 0.7 : 1 },
                shadows.md,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {disabled ? "Confirmando..." : "Confirmar código"}
              </Text>
            </Pressable>

            <Pressable disabled={disabled} onPress={handleResend} style={styles.secondaryButton}>
              <Text style={[styles.secondaryButtonText, { color: c.blue }]}>Reenviar código</Text>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 20,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.serif.extra,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: fonts.sans.regular,
    lineHeight: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    fontFamily: fonts.sans.bold,
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    fontSize: 22,
    fontFamily: fonts.sans.bold,
    letterSpacing: 8,
    textAlign: "center",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.sans.medium,
  },
  successText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.sans.medium,
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
  secondaryButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: fonts.sans.bold,
  },
});
