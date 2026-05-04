import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { useAuth } from "./AuthContext";
import { usePermissions } from "./PermissionsContext";
import { useService, type ServiceStatus } from "./ServiceContext";

// ─── Foreground notification handler ──────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Types ─────────────────────────────────────────────────────────────────────

export type NotificationEvent =
  // Cliente — service lifecycle
  | "service_requested"
  | "service_accepted"
  | "service_en_route"
  | "service_in_progress"
  | "service_completed"
  | "service_cancelled"
  | "service_disputed"
  // Cliente — PIN failures
  | "pin_start_wrong"
  | "pin_start_disputed"
  | "pin_end_wrong"
  | "pin_end_disputed"
  // Prestador — job lifecycle
  | "new_job_request"
  | "job_accepted"
  | "job_en_route"
  | "job_in_progress"
  | "job_completed"
  | "job_cancelled"
  | "job_disputed"
  // Shared — chat/inbox
  | "new_message"
  // Shared — payments
  | "payment_authorized"
  | "payout_processed"
  // Auth
  | "email_confirmed"
  | "provider_verified";

type Vars = Record<string, string | number>;

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface NotificationContextType {
  hasPermission: boolean;
  pushToken: string | null;
  requestPermission: () => Promise<boolean>;
  send: (event: NotificationEvent, vars?: Vars) => Promise<void>;
}

// ─── Event catalog ─────────────────────────────────────────────────────────────

const CATALOG: Record<NotificationEvent, (v?: Vars) => NotificationPayload> = {
  // ── Cliente ─────────────────────────────────────────────────────────────────
  service_requested: () => ({
    title: "Pedido enviado!",
    body: "Buscando prestador disponível na sua região.",
    data: { screen: "track" },
  }),
  service_accepted: (v) => ({
    title: "Prestador aceito!",
    body: `${v?.name ?? "Seu prestador"} está se preparando para sair.`,
    data: { screen: "track" },
  }),
  service_en_route: (v) => ({
    title: "A caminho!",
    body: `${v?.name ?? "Seu prestador"} está em rota até você.`,
    data: { screen: "track" },
  }),
  service_in_progress: () => ({
    title: "Serviço iniciado!",
    body: "O serviço está em andamento. Acompanhe em tempo real.",
    data: { screen: "track" },
  }),
  service_completed: (v) => ({
    title: "Serviço concluído!",
    body: v?.name ? `Avalie sua experiência com ${v.name}.` : "Avalie sua experiência.",
    data: { screen: "rate" },
  }),
  service_cancelled: () => ({
    title: "Pedido cancelado",
    body: "Seu pedido foi cancelado.",
    data: { screen: "index" },
  }),
  service_disputed: () => ({
    title: "Disputa registrada",
    body: "Nossa equipe de suporte foi notificada e entrará em contato em breve.",
    data: { screen: "ticket" },
  }),
  pin_start_wrong: (v) => ({
    title: "PIN incorreto",
    body: `Verifique o código com o prestador. ${v?.left ?? "?"}x tentativa(s) restante(s).`,
    data: { screen: "confirm-start-pin" },
  }),
  pin_start_disputed: () => ({
    title: "Limite de tentativas atingido",
    body: "Disputa aberta automaticamente. Aguarde o contato do suporte.",
    data: { screen: "ticket" },
  }),
  pin_end_wrong: (v) => ({
    title: "PIN de conclusão incorreto",
    body: `Verifique o código com o prestador. ${v?.left ?? "?"}x tentativa(s) restante(s).`,
    data: { screen: "otp-modal" },
  }),
  pin_end_disputed: () => ({
    title: "Limite de tentativas atingido",
    body: "Disputa aberta automaticamente. Aguarde o contato do suporte.",
    data: { screen: "ticket" },
  }),

  // ── Prestador ───────────────────────────────────────────────────────────────
  new_job_request: (v) => ({
    title: "Novo pedido disponível!",
    body: v?.category
      ? `${v.category} em ${v.origin ?? "sua região"}. Confira agora.`
      : "Toque para ver os detalhes.",
    data: { screen: "job" },
  }),
  job_accepted: (v) => ({
    title: "Serviço aceito!",
    body: v?.origin ? `Saia em direção a ${v.origin}.` : "Prepare-se para sair.",
    data: { screen: "job" },
  }),
  job_en_route: () => ({
    title: "Em rota!",
    body: "Você está a caminho. O cliente foi notificado.",
    data: { screen: "job" },
  }),
  job_in_progress: () => ({
    title: "Serviço iniciado!",
    body: "PIN de início confirmado. O serviço está em andamento.",
    data: { screen: "job" },
  }),
  job_completed: () => ({
    title: "Serviço concluído!",
    body: "Ótimo trabalho! O pagamento está sendo processado.",
    data: { screen: "index" },
  }),
  job_cancelled: () => ({
    title: "Pedido cancelado",
    body: "O cliente cancelou o serviço.",
    data: { screen: "index" },
  }),
  job_disputed: () => ({
    title: "Disputa aberta",
    body: "Um ticket foi criado para este serviço. Aguarde o contato do suporte.",
    data: { screen: "ticket" },
  }),

  // ── Compartilhado ───────────────────────────────────────────────────────────
  new_message: (v) => ({
    title: v?.name ? String(v.name) : "Nova mensagem",
    body: v?.preview ? String(v.preview) : "Você recebeu uma nova mensagem.",
    data: { screen: "inbox" },
  }),
  payment_authorized: (v) => ({
    title: "Pagamento autorizado",
    body: v?.value ? `R$ ${v.value} reservado para o serviço.` : "Seu pagamento foi reservado.",
    data: { screen: "payment" },
  }),
  payout_processed: (v) => ({
    title: "Saque processado!",
    body: v?.value
      ? `R$ ${v.value} foi transferido para sua conta.`
      : "Seu saque está disponível.",
    data: { screen: "index" },
  }),
  email_confirmed: () => ({
    title: "E-mail confirmado!",
    body: "Bem-vindo ao Ajudaê! Sua conta está ativa.",
    data: { screen: "index" },
  }),
  provider_verified: () => ({
    title: "Perfil verificado!",
    body: "Parabéns! Você pode começar a aceitar pedidos no Ajudaê.",
    data: { screen: "index" },
  }),
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function fire(event: NotificationEvent, vars?: Vars): Promise<void> {
  const payload = CATALOG[event](vars);

  // Map events to Android channels
  let channelId = "ajudae-default";
  if (
    ["service_accepted", "service_en_route", "service_in_progress",
      "service_completed", "service_cancelled", "service_disputed",
      "job_in_progress", "job_completed", "job_cancelled", "job_disputed"].includes(event)
  ) {
    channelId = "ajudae-service";
  } else if (event === "new_job_request" || event === "job_accepted") {
    channelId = "ajudae-jobs";
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        sound: true,
        ...(Platform.OS === "android" && { channelId }),
      },
      trigger: null, // fire immediately
    });
  } catch {
    // silently fail — no permission or simulator limitation
  }
}

// ─── Context ───────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const { active } = useService();
  const { notifications, requestNotifications } = usePermissions();
  const [pushToken, setPushToken] = useState<string | null>(null);

  // Track previous service state to detect changes
  const prevStatus = useRef<ServiceStatus | null>(null);
  const prevStartAttempts = useRef(0);
  const prevEndAttempts = useRef(0);
  const isInitialLoad = useRef(true);
  const roleRef = useRef(role);

  useEffect(() => { roleRef.current = role; }, [role]);

  // ── Request push token once notification permission is granted ────────────
  useEffect(() => {
    if (!notifications.granted || pushToken) return;
    const projectId =
      (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.eas?.projectId as
        | string
        | undefined;
    Notifications.getExpoPushTokenAsync({ projectId })
      .then((t) => setPushToken(t.data))
      .catch(() => setPushToken("local-only")); // simulator fallback
  }, [notifications.granted]);

  // ── Reactive service state watcher ────────────────────────────────────────
  useEffect(() => {
    // Reset tracking when no active service
    if (!active) {
      prevStatus.current = null;
      prevStartAttempts.current = 0;
      prevEndAttempts.current = 0;
      isInitialLoad.current = true;
      return;
    }

    // Skip first render — hydrating from AsyncStorage shouldn't fire notifications
    if (isInitialLoad.current) {
      prevStatus.current = active.status;
      prevStartAttempts.current = active.startPinAttempts;
      prevEndAttempts.current = active.conclusionAttempts;
      isInitialLoad.current = false;
      return;
    }

    const statusChanged = active.status !== prevStatus.current;
    const startAttemptsUp = active.startPinAttempts > prevStartAttempts.current;
    const endAttemptsUp = active.conclusionAttempts > prevEndAttempts.current;

    // Snapshot refs before firing (avoids double-fire)
    prevStatus.current = active.status;
    prevStartAttempts.current = active.startPinAttempts;
    prevEndAttempts.current = active.conclusionAttempts;

    const currentRole = roleRef.current;
    const vars: Vars = {
      name: active.providerName ?? active.customerName,
      category: active.category,
      origin: active.origin,
      value: active.estimatedPrice,
    };

    // PIN disputes: the status also becomes "disputed" at the same time —
    // fire only the specific PIN notification, not the generic disputed one.
    const isPinDispute =
      (startAttemptsUp || endAttemptsUp) && active.status === "disputed";

    // ── Status change ────────────────────────────────────────────────────────
    if (statusChanged && !isPinDispute) {
      if (currentRole === "cliente") {
        const map: Partial<Record<ServiceStatus, NotificationEvent>> = {
          requested: "service_requested",
          accepted: "service_accepted",
          en_route: "service_en_route",
          in_progress: "service_in_progress",
          completed: "service_completed",
          cancelled: "service_cancelled",
          disputed: "service_disputed",
        };
        const evt = map[active.status];
        if (evt) fire(evt, vars);
      } else {
        const map: Partial<Record<ServiceStatus, NotificationEvent>> = {
          requested: "new_job_request",
          accepted: "job_accepted",
          en_route: "job_en_route",
          in_progress: "job_in_progress",
          completed: "job_completed",
          cancelled: "job_cancelled",
          disputed: "job_disputed",
        };
        const evt = map[active.status];
        if (evt) fire(evt, vars);
      }
    }

    // ── Start PIN attempt ────────────────────────────────────────────────────
    if (startAttemptsUp) {
      if (isPinDispute) {
        fire(currentRole === "cliente" ? "pin_start_disputed" : "job_disputed", vars);
      } else {
        fire("pin_start_wrong", { ...vars, left: 5 - active.startPinAttempts });
      }
    }

    // ── Conclusion PIN attempt ───────────────────────────────────────────────
    if (endAttemptsUp) {
      if (isPinDispute) {
        fire(currentRole === "cliente" ? "pin_end_disputed" : "job_disputed", vars);
      } else {
        fire("pin_end_wrong", { ...vars, left: 5 - active.conclusionAttempts });
      }
    }
  }, [active?.status, active?.startPinAttempts, active?.conclusionAttempts]);

  // ─────────────────────────────────────────────────────────────────────────────

  const requestPermission = requestNotifications;

  const send = async (event: NotificationEvent, vars?: Vars): Promise<void> => {
    await fire(event, vars);
  };

  return (
    <NotificationContext.Provider value={{ hasPermission: notifications.granted, pushToken, requestPermission, send }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}
