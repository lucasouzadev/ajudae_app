import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import colors, { fonts, shadows } from "@/constants/colors";
import { TopNav } from "@/components/TopNav";
import { ProfileOverlay } from "@/components/ProfileOverlay";
import { SideSheet } from "@/components/SideSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import { usePermissions } from "@/contexts/PermissionsContext";

const REMOTE_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export default function PushTestScreen() {
  const c = colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { notifications } = usePermissions();
  const {
    hasPermission,
    pushToken,
    isRegisteringPushToken,
    pushRegistrationError,
    requestPermission,
    refreshPushToken,
    send,
  } = useNotification();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [runningAction, setRunningAction] = useState<"permission" | "token" | "local" | "remote" | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  if (!user) return null;

  const initials = (user.name || "AJ").split(" ").map((part) => part[0]).slice(0, 2).join("");

  const run = async (
    action: "permission" | "token" | "local" | "remote",
    task: () => Promise<void>,
  ) => {
    setRunningAction(action);
    try {
      await task();
    } finally {
      setRunningAction(null);
    }
  };

  const sendRemotePush = async () => {
    const token = pushToken && pushToken !== "local-only" ? pushToken : await refreshPushToken();

    if (!token || token === "local-only") {
      setStatus("Sem Expo push token válido neste device");
      return;
    }

    const response = await fetch(REMOTE_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: token,
        title: "Teste push Ajudaê",
        body: "Push remota entregue pelo Expo Push Service",
        data: { screen: "push-test", source: "push-lab" },
        sound: "default",
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(typeof payload?.errors?.[0]?.message === "string" ? payload.errors[0].message : "Falha no envio remoto");
    }

    const ticket = payload?.data?.status ?? payload?.data?.[0]?.status ?? "ok";
    setStatus(`Push remota enviada (${ticket})`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <TopNav
        title="Teste de Push"
        subtitle="Validação do device"
        initials={initials}
        accentColor={c.purple}
        onMenuOpen={() => setMenuOpen(true)}
        onProfileOpen={() => setProfileOpen(true)}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <View style={[styles.heroIcon, { backgroundColor: `${c.purple}18` }]}>
            <Ionicons name="notifications" size={22} color={c.purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: c.text }]}>Push status</Text>
            <Text style={[styles.heroSub, { color: c.sub }]}>
              {hasPermission ? "Permissão concedida" : notifications.canAsk ? "Permissão pendente" : "Permissão negada"}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, shadows.sm]}>
          <Label text="Expo push token" />
          <Text selectable style={[styles.token, { color: c.text, backgroundColor: c.background, borderColor: c.border }]}>
            {pushToken ?? "Ainda não gerado"}
          </Text>
          {pushRegistrationError ? (
            <Text style={[styles.error, { color: c.destructive }]}>{pushRegistrationError}</Text>
          ) : null}
          {status ? (
            <Text style={[styles.status, { color: c.blue }]}>{status}</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <ActionButton
            color={c.primary}
            label="Permitir notificações"
            busy={runningAction === "permission"}
            onPress={() => run("permission", async () => {
              const granted = await requestPermission();
              setStatus(granted ? "Permissão confirmada" : "Permissão não concedida");
            })}
          />
          <ActionButton
            color={c.blue}
            label="Atualizar token"
            busy={runningAction === "token" || isRegisteringPushToken}
            onPress={() => run("token", async () => {
              const token = await refreshPushToken();
              setStatus(token ? "Token atualizado" : "Token indisponível");
            })}
          />
          <ActionButton
            color={c.success}
            label="Notificação local"
            busy={runningAction === "local"}
            onPress={() => run("local", async () => {
              await send("new_message", { name: "Ajudaê", preview: "Teste local no próprio app" });
              setStatus("Notificação local disparada");
            })}
          />
          <ActionButton
            color={c.purple}
            label="Push remota"
            busy={runningAction === "remote"}
            onPress={() => run("remote", sendRemotePush)}
          />
        </View>
      </ScrollView>

      <SideSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} name={user.name} initials={initials} />
    </View>
  );
}

function Label({ text }: { text: string }) {
  const c = colors.light;
  return <Text style={[styles.label, { color: c.softMuted }]}>{text}</Text>;
}

function ActionButton({
  color,
  label,
  busy,
  onPress,
}: {
  color: string;
  label: string;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.button, { backgroundColor: color }]} onPress={onPress} disabled={busy}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: fonts.serif.extra,
  },
  heroSub: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: fonts.sans.regular,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.sans.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  token: {
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    fontSize: 12,
    fontFamily: fonts.sans.medium,
  },
  status: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: fonts.sans.semibold,
  },
  error: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: fonts.sans.semibold,
  },
  actions: {
    gap: 10,
  },
  button: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: fonts.sans.bold,
  },
});
