/**
 * PermissionGate — LGPD consent + OS permission onboarding
 *
 * Shows as a full-screen modal at the right moments:
 *  1. LGPD consent screen (blocking — user can't proceed without accepting)
 *  2. Location permission request
 *  3. Notifications permission request
 *
 * Only appears after authentication. After the first run, permission
 * changes happen via ProfileOverlay > Configurações.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import colors, { fonts } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";

const ONBOARDING_KEY = "@ajudae_perm_onboarding_shown";

type Step = "lgpd" | "location" | "notifications" | "done";

export function PermissionGate() {
  const { isAuthenticated } = useAuth();
  const { lgpdAccepted, location, notifications, ready, acceptLGPD, requestLocation, requestNotifications } = usePermissions();
  const insets = useSafeAreaInsets();
  const c = colors.light;

  const [step, setStep] = useState<Step | null>(null);
  const [onboardingShown, setOnboardingShown] = useState<boolean | null>(null);

  // ── Decide which step to show ──────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !ready) return;

    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      const shown = val === "1";
      setOnboardingShown(shown);

      if (!lgpdAccepted) {
        setStep("lgpd");
      } else if (!shown) {
        // First time after LGPD accepted — walk through permission steps
        if (!location.granted && location.canAsk) {
          setStep("location");
        } else if (!notifications.granted && notifications.canAsk) {
          setStep("notifications");
        } else {
          // Nothing to ask — mark onboarding done
          AsyncStorage.setItem(ONBOARDING_KEY, "1");
          setStep("done");
        }
      } else {
        setStep("done");
      }
    });
  }, [isAuthenticated, ready, lgpdAccepted]);

  // Advance from location step
  const afterLocation = () => {
    if (!notifications.granted && notifications.canAsk) {
      setStep("notifications");
    } else {
      AsyncStorage.setItem(ONBOARDING_KEY, "1");
      setStep("done");
    }
  };

  const afterNotifications = () => {
    AsyncStorage.setItem(ONBOARDING_KEY, "1");
    setStep("done");
  };

  if (!step || step === "done") return null;

  return (
    <Modal
      visible
      transparent={false}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {}} // prevent back-button dismiss on LGPD
    >
      <View style={[s.root, { backgroundColor: c.background }]}>
        {/* Safe-area top spacer */}
        <View style={{ height: insets.top + 8 }} />

        {step === "lgpd" && (
          <LGPDScreen
            c={c}
            insets={insets}
            onAccept={async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await acceptLGPD();
              // Proceed to permission requests
              if (!location.granted && location.canAsk) {
                setStep("location");
              } else if (!notifications.granted && notifications.canAsk) {
                setStep("notifications");
              } else {
                AsyncStorage.setItem(ONBOARDING_KEY, "1");
                setStep("done");
              }
            }}
          />
        )}

        {step === "location" && (
          <PermissionScreen
            icon="location"
            iconColor="#10B981"
            title="Localização"
            description={
              "Usamos sua localização para encontrar prestadores próximos e rastrear o serviço em tempo real.\n\nSua posição só é compartilhada durante o serviço ativo."
            }
            allowLabel="Permitir localização"
            c={c}
            insets={insets}
            onAllow={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await requestLocation();
              afterLocation();
            }}
            onSkip={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              afterLocation();
            }}
          />
        )}

        {step === "notifications" && (
          <PermissionScreen
            icon="notifications"
            iconColor="#6366F1"
            title="Notificações"
            description={
              "Notificações de serviço mantêm você informado sobre o status do pedido, confirmações de PIN e atualizações de pagamento.\n\nVocê pode desativar a qualquer momento nas Configurações."
            }
            allowLabel="Permitir notificações"
            c={c}
            insets={insets}
            onAllow={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await requestNotifications();
              afterNotifications();
            }}
            onSkip={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              afterNotifications();
            }}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── LGPD Screen ───────────────────────────────────────────────────────────────

function LGPDScreen({
  c,
  insets,
  onAccept,
}: {
  c: ReturnType<typeof Object.assign>;
  insets: ReturnType<typeof useSafeAreaInsets>;
  onAccept: () => void;
}) {
  const DATA_ITEMS = [
    {
      icon: "location" as const,
      color: "#10B981",
      title: "Localização",
      desc: "Para encontrar prestadores próximos e rastrear o serviço em tempo real.",
    },
    {
      icon: "camera" as const,
      color: "#F59E0B",
      title: "Câmera e galeria",
      desc: "Para fotos do serviço, foto de perfil e digitalização de documentos.",
    },
    {
      icon: "notifications" as const,
      color: "#6366F1",
      title: "Notificações",
      desc: "Para atualizações de serviço, confirmações de PIN e pagamentos.",
    },
    {
      icon: "person" as const,
      color: "#3B82F6",
      title: "Nome, telefone e CPF",
      desc: "Para verificação de identidade e correspondência com prestadores.",
    },
  ];

  return (
    <View style={s.screen}>
      {/* Header */}
      <View style={s.lgpdHeader}>
        <View style={[s.lgpdShield, { backgroundColor: "#FF6A0015" }]}>
          <Ionicons name="shield-checkmark" size={36} color="#FF6A00" />
        </View>
        <Text style={[s.lgpdTitle, { color: c.text, fontFamily: fonts.serif.bold }]}>
          Sua privacidade importa
        </Text>
        <Text style={[s.lgpdSub, { color: c.sub, fontFamily: fonts.sans.regular }]}>
          Em conformidade com a LGPD (Lei 13.709/2018)
        </Text>
      </View>

      {/* Scrollable body */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.lgpdBody}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.lgpdSectionLabel, { color: c.text, fontFamily: fonts.sans.semibold }]}>
          O que coletamos e por quê
        </Text>

        {DATA_ITEMS.map((item) => (
          <View key={item.title} style={[s.dataRow, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[s.dataIcon, { backgroundColor: item.color + "18" }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.dataTitle, { color: c.text, fontFamily: fonts.sans.semibold }]}>
                {item.title}
              </Text>
              <Text style={[s.dataDesc, { color: c.sub, fontFamily: fonts.sans.regular }]}>
                {item.desc}
              </Text>
            </View>
          </View>
        ))}

        <Text style={[s.lgpdNotice, { color: c.sub, fontFamily: fonts.sans.regular }]}>
          Seus dados{" "}
          <Text style={{ fontFamily: fonts.sans.semibold, color: c.text }}>
            não são vendidos
          </Text>{" "}
          e são compartilhados somente com o prestador do seu serviço ativo. Você pode solicitar a exclusão dos seus dados a qualquer momento pelo menu de perfil.
        </Text>

        <View style={s.lgpdLinks}>
          <Pressable onPress={() => Linking.openURL("https://ajudae.com.br/privacidade")}>
            <Text style={[s.lgpdLink, { color: "#FF6A00", fontFamily: fonts.sans.semibold }]}>
              Política de Privacidade
            </Text>
          </Pressable>
          <Text style={[s.lgpdLinkSep, { color: c.softMuted }]}> · </Text>
          <Pressable onPress={() => Linking.openURL("https://ajudae.com.br/termos")}>
            <Text style={[s.lgpdLink, { color: "#FF6A00", fontFamily: fonts.sans.semibold }]}>
              Termos de Uso
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[s.lgpdFooter, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={[s.acceptBtn, { backgroundColor: "#FF6A00" }]} onPress={onAccept}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={[s.acceptBtnText, { fontFamily: fonts.sans.bold }]}>
            Aceitar e continuar
          </Text>
        </Pressable>
        <Text style={[s.lgpdFooterNote, { color: c.sub, fontFamily: fonts.sans.regular }]}>
          Ao aceitar, você concorda com os termos acima. Sem aceite não é possível usar o Ajudaê.
        </Text>
      </View>
    </View>
  );
}

// ─── Permission Step Screen ─────────────────────────────────────────────────────

function PermissionScreen({
  icon,
  iconColor,
  title,
  description,
  allowLabel,
  c,
  insets,
  onAllow,
  onSkip,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  title: string;
  description: string;
  allowLabel: string;
  c: ReturnType<typeof Object.assign>;
  insets: ReturnType<typeof useSafeAreaInsets>;
  onAllow: () => void;
  onSkip: () => void;
}) {
  return (
    <View style={[s.screen, s.permScreen]}>
      {/* Skip */}
      <View style={s.permSkipRow}>
        <Pressable onPress={onSkip} hitSlop={12}>
          <Text style={[s.permSkip, { color: c.muted, fontFamily: fonts.sans.regular }]}>
            Agora não
          </Text>
        </Pressable>
      </View>

      {/* Icon */}
      <View style={[s.permIconWrap, { backgroundColor: iconColor + "15" }]}>
        <Ionicons name={icon} size={48} color={iconColor} />
      </View>

      {/* Content */}
      <Text style={[s.permTitle, { color: c.text, fontFamily: fonts.serif.bold }]}>
        {title}
      </Text>
      <Text style={[s.permDesc, { color: c.sub, fontFamily: fonts.sans.regular }]}>
        {description}
      </Text>

      {/* Buttons */}
      <View style={[s.permButtons, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={[s.permAllowBtn, { backgroundColor: iconColor }]} onPress={onAllow}>
          <Text style={[s.permAllowText, { fontFamily: fonts.sans.bold }]}>
            {allowLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1 },

  // LGPD
  lgpdHeader: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 24 },
  lgpdShield: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  lgpdTitle: { fontSize: 24, textAlign: "center", marginBottom: 6 },
  lgpdSub: { fontSize: 13, textAlign: "center" },
  lgpdBody: { paddingHorizontal: 20, paddingBottom: 16 },
  lgpdSectionLabel: { fontSize: 14, marginBottom: 12 },
  dataRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10,
  },
  dataIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  dataTitle: { fontSize: 14, marginBottom: 2 },
  dataDesc: { fontSize: 12, lineHeight: 17 },
  lgpdNotice: { fontSize: 12, lineHeight: 18, marginTop: 16, marginBottom: 12 },
  lgpdLinks: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  lgpdLink: { fontSize: 12 },
  lgpdLinkSep: { fontSize: 12 },
  lgpdFooter: { paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  acceptBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 52, borderRadius: 14,
  },
  acceptBtnText: { color: "#fff", fontSize: 16 },
  lgpdFooterNote: { fontSize: 11, textAlign: "center", lineHeight: 16 },

  // Permission step
  permScreen: { paddingHorizontal: 32 },
  permSkipRow: { alignItems: "flex-end", paddingRight: 4, marginBottom: 48 },
  permSkip: { fontSize: 14 },
  permIconWrap: {
    width: 96, height: 96, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: 32,
  },
  permTitle: { fontSize: 28, textAlign: "center", marginBottom: 16 },
  permDesc: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  permButtons: { marginTop: "auto", gap: 12 },
  permAllowBtn: {
    height: 52, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  permAllowText: { color: "#fff", fontSize: 16 },
});
