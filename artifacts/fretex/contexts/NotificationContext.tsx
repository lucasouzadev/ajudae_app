import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Animated, AppState, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { ProposalAlert, type ProposalAlertPayload } from "@/components/ProposalAlert";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthSafe } from "./AuthContext";
import { usePermissions, type AppLanguage } from "./PermissionsContext";
import { useService, type ServiceStatus } from "./ServiceContext";
import { supabase } from "@/lib/supabase";
import colors, { fonts, shadows } from "@/constants/colors";

let Notifications: typeof import("expo-notifications") | null = null;
try {
  Notifications = require("expo-notifications");
} catch (e) {
}

if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    if (__DEV__) console.warn("NotificationHandler setup failed:", (e as Error).message);
  }
}

export type NotificationEvent =
  | "service_requested"
  | "service_accepted"
  | "service_en_route"
  | "service_in_progress"
  | "service_completed"
  | "service_cancelled"
  | "service_disputed"
  | "pin_start_wrong"
  | "pin_start_disputed"
  | "pin_end_wrong"
  | "pin_end_disputed"
  | "new_job_request"
  | "job_accepted"
  | "job_en_route"
  | "job_in_progress"
  | "job_completed"
  | "job_cancelled"
  | "job_disputed"
  | "new_message"
  | "payment_authorized"
  | "payout_processed"
  | "email_confirmed"
  | "provider_verified"
  | "provider_validation_received";

type Vars = Record<string, string | number>;
type NotificationCategory = "orders" | "messages" | "payments" | "account" | "marketing";

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface NotificationContextType {
  hasPermission: boolean;
  pushToken: string | null;
  isRegisteringPushToken: boolean;
  pushRegistrationError: string | null;
  bannerStatusBarColor: string | null;
  bannerStatusBarStyle: "light" | "dark" | null;
  requestPermission: () => Promise<boolean>;
  refreshPushToken: () => Promise<string | null>;
  send: (event: NotificationEvent, vars?: Vars) => Promise<void>;
}

const EVENT_CATEGORY: Record<NotificationEvent, NotificationCategory> = {
  service_requested: "orders",
  service_accepted: "orders",
  service_en_route: "orders",
  service_in_progress: "orders",
  service_completed: "orders",
  service_cancelled: "orders",
  service_disputed: "account",
  pin_start_wrong: "account",
  pin_start_disputed: "account",
  pin_end_wrong: "account",
  pin_end_disputed: "account",
  new_job_request: "orders",
  job_accepted: "orders",
  job_en_route: "orders",
  job_in_progress: "orders",
  job_completed: "orders",
  job_cancelled: "orders",
  job_disputed: "account",
  new_message: "messages",
  payment_authorized: "payments",
  payout_processed: "payments",
  email_confirmed: "account",
  provider_verified: "account",
  provider_validation_received: "account",
};

interface ForegroundBannerState {
  title: string;
  body: string;
  backgroundColor: string;
  textColor: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  statusBarStyle: "light" | "dark";
}

function getCatalog(language: AppLanguage): Record<NotificationEvent, (v?: Vars) => NotificationPayload> {
  if (language === "en-US") {
    return {
      service_requested: () => ({ title: "Request sent", body: "Looking for an available provider near you.", data: { screen: "track" } }),
      service_accepted: (v) => ({ title: "Provider accepted", body: `${v?.name ?? "Your provider"} is getting ready to leave.`, data: { screen: "track" } }),
      service_en_route: (v) => ({ title: "On the way", body: `${v?.name ?? "Your provider"} is heading to you now.`, data: { screen: "track" } }),
      service_in_progress: () => ({ title: "Service started", body: "Your service is in progress.", data: { screen: "track" } }),
      service_completed: (v) => ({ title: "Service completed", body: v?.name ? `Rate your experience with ${v.name}.` : "Rate your experience.", data: { screen: "rate" } }),
      service_cancelled: () => ({ title: "Request cancelled", body: "Your request was cancelled.", data: { screen: "index" } }),
      service_disputed: () => ({ title: "Dispute opened", body: "Our support team has been notified.", data: { screen: "ticket" } }),
      pin_start_wrong: (v) => ({ title: "Incorrect PIN", body: `Check the code with the provider. ${v?.left ?? "?"} attempt(s) left.`, data: { screen: "confirm-start-pin" } }),
      pin_start_disputed: () => ({ title: "Attempt limit reached", body: "A dispute was opened automatically.", data: { screen: "ticket" } }),
      pin_end_wrong: (v) => ({ title: "Incorrect completion PIN", body: `Check the code with the provider. ${v?.left ?? "?"} attempt(s) left.`, data: { screen: "otp-modal" } }),
      pin_end_disputed: () => ({ title: "Attempt limit reached", body: "A dispute was opened automatically.", data: { screen: "ticket" } }),
      new_job_request: (v) => ({ title: "New request available", body: v?.category ? `${v.category} in ${v.origin ?? "your area"}.` : "Tap to view details.", data: { screen: "proposals", type: "new_job_request" } }),
      job_accepted: (v) => ({ title: "Job accepted", body: v?.origin ? `Head toward ${v.origin}.` : "Get ready to leave.", data: { screen: "job" } }),
      job_en_route: () => ({ title: "On route", body: "You are on the way. The customer was notified.", data: { screen: "job" } }),
      job_in_progress: () => ({ title: "Service started", body: "Start PIN confirmed.", data: { screen: "job" } }),
      job_completed: () => ({ title: "Service completed", body: "Payment is being processed.", data: { screen: "index" } }),
      job_cancelled: () => ({ title: "Request cancelled", body: "The customer cancelled the service.", data: { screen: "index" } }),
      job_disputed: () => ({ title: "Dispute opened", body: "A ticket was created for this service.", data: { screen: "ticket" } }),
      new_message: (v) => ({ title: v?.name ? String(v.name) : "New message", body: v?.preview ? String(v.preview) : "You received a new message.", data: { screen: "inbox" } }),
      payment_authorized: (v) => ({ title: "Payment authorized", body: v?.value ? `R$ ${v.value} reserved for the service.` : "Your payment was reserved.", data: { screen: "payment" } }),
      payout_processed: (v) => ({ title: "Payout processed", body: v?.value ? `R$ ${v.value} was transferred to your account.` : "Your payout is available.", data: { screen: "index" } }),
      email_confirmed: () => ({ title: "Email confirmed", body: "Your account is active.", data: { screen: "index" } }),
      provider_verified: () => ({ title: "Profile verified", body: "You can now accept requests on Ajudae.", data: { screen: "index" } }),
      provider_validation_received: () => ({ title: "Documents received", body: "Our team received your documents and started the verification review.", data: { screen: "index" } }),
    };
  }

  if (language === "es-ES") {
    return {
      service_requested: () => ({ title: "Solicitud enviada", body: "Buscando un prestador disponible cerca de ti.", data: { screen: "track" } }),
      service_accepted: (v) => ({ title: "Prestador aceptado", body: `${v?.name ?? "Tu prestador"} se está preparando para salir.`, data: { screen: "track" } }),
      service_en_route: (v) => ({ title: "En camino", body: `${v?.name ?? "Tu prestador"} va hacia ti ahora.`, data: { screen: "track" } }),
      service_in_progress: () => ({ title: "Servicio iniciado", body: "Tu servicio está en progreso.", data: { screen: "track" } }),
      service_completed: (v) => ({ title: "Servicio completado", body: v?.name ? `Evalúa tu experiencia con ${v.name}.` : "Evalúa tu experiencia.", data: { screen: "rate" } }),
      service_cancelled: () => ({ title: "Solicitud cancelada", body: "Tu solicitud fue cancelada.", data: { screen: "index" } }),
      service_disputed: () => ({ title: "Disputa abierta", body: "Nuestro equipo de soporte fue notificado.", data: { screen: "ticket" } }),
      pin_start_wrong: (v) => ({ title: "PIN incorrecto", body: `Verifica el código con el prestador. ${v?.left ?? "?"} intento(s) restante(s).`, data: { screen: "confirm-start-pin" } }),
      pin_start_disputed: () => ({ title: "Límite de intentos alcanzado", body: "Se abrió una disputa automáticamente.", data: { screen: "ticket" } }),
      pin_end_wrong: (v) => ({ title: "PIN final incorrecto", body: `Verifica el código con el prestador. ${v?.left ?? "?"} intento(s) restante(s).`, data: { screen: "otp-modal" } }),
      pin_end_disputed: () => ({ title: "Límite de intentos alcanzado", body: "Se abrió una disputa automáticamente.", data: { screen: "ticket" } }),
      new_job_request: (v) => ({ title: "Nuevo pedido disponible", body: v?.category ? `${v.category} en ${v.origin ?? "tu zona"}.` : "Toca para ver los detalles.", data: { screen: "proposals", type: "new_job_request" } }),
      job_accepted: (v) => ({ title: "Servicio aceptado", body: v?.origin ? `Dirígete a ${v.origin}.` : "Prepárate para salir.", data: { screen: "job" } }),
      job_en_route: () => ({ title: "En ruta", body: "Vas en camino. El cliente fue notificado.", data: { screen: "job" } }),
      job_in_progress: () => ({ title: "Servicio iniciado", body: "PIN de inicio confirmado.", data: { screen: "job" } }),
      job_completed: () => ({ title: "Servicio completado", body: "El pago está siendo procesado.", data: { screen: "index" } }),
      job_cancelled: () => ({ title: "Pedido cancelado", body: "El cliente canceló el servicio.", data: { screen: "index" } }),
      job_disputed: () => ({ title: "Disputa abierta", body: "Se creó un ticket para este servicio.", data: { screen: "ticket" } }),
      new_message: (v) => ({ title: v?.name ? String(v.name) : "Nuevo mensaje", body: v?.preview ? String(v.preview) : "Recibiste un nuevo mensaje.", data: { screen: "inbox" } }),
      payment_authorized: (v) => ({ title: "Pago autorizado", body: v?.value ? `R$ ${v.value} reservado para el servicio.` : "Tu pago fue reservado.", data: { screen: "payment" } }),
      payout_processed: (v) => ({ title: "Retiro procesado", body: v?.value ? `R$ ${v.value} fue transferido a tu cuenta.` : "Tu retiro está disponible.", data: { screen: "index" } }),
      email_confirmed: () => ({ title: "Correo confirmado", body: "Tu cuenta está activa.", data: { screen: "index" } }),
      provider_verified: () => ({ title: "Perfil verificado", body: "Ya puedes aceptar pedidos en Ajudae.", data: { screen: "index" } }),
      provider_validation_received: () => ({ title: "Documentos recebidos", body: "Nuestro equipo recibió tus documentos y ya inició el análisis de validación.", data: { screen: "index" } }),
    };
  }

  return {
    service_requested: () => ({ title: "Pedido enviado!", body: "Buscando prestador disponível na sua região.", data: { screen: "track" } }),
    service_accepted: (v) => ({ title: "Prestador aceito!", body: `${v?.name ?? "Seu prestador"} está se preparando para sair.`, data: { screen: "track" } }),
    service_en_route: (v) => ({ title: "A caminho!", body: `${v?.name ?? "Seu prestador"} está em rota até você.`, data: { screen: "track" } }),
    service_in_progress: () => ({ title: "Serviço iniciado!", body: "O serviço está em andamento. Acompanhe em tempo real.", data: { screen: "track" } }),
    service_completed: (v) => ({ title: "Serviço concluído!", body: v?.name ? `Avalie sua experiência com ${v.name}.` : "Avalie sua experiência.", data: { screen: "rate" } }),
    service_cancelled: () => ({ title: "Pedido cancelado", body: "Seu pedido foi cancelado.", data: { screen: "index" } }),
    service_disputed: () => ({ title: "Disputa registrada", body: "Nossa equipe de suporte foi notificada e entrará em contato em breve.", data: { screen: "ticket" } }),
    pin_start_wrong: (v) => ({ title: "PIN incorreto", body: `Verifique o código com o prestador. ${v?.left ?? "?"}x tentativa(s) restante(s).`, data: { screen: "confirm-start-pin" } }),
    pin_start_disputed: () => ({ title: "Limite de tentativas atingido", body: "Disputa aberta automaticamente. Aguarde o contato do suporte.", data: { screen: "ticket" } }),
    pin_end_wrong: (v) => ({ title: "PIN de conclusão incorreto", body: `Verifique o código com o prestador. ${v?.left ?? "?"}x tentativa(s) restante(s).`, data: { screen: "otp-modal" } }),
    pin_end_disputed: () => ({ title: "Limite de tentativas atingido", body: "Disputa aberta automaticamente. Aguarde o contato do suporte.", data: { screen: "ticket" } }),
    new_job_request: (v) => ({ title: "Novo pedido disponível!", body: v?.category ? `${v.category} em ${v.origin ?? "sua região"}. Confira agora.` : "Toque para ver os detalhes.", data: { screen: "proposals", type: "new_job_request" } }),
    job_accepted: (v) => ({ title: "Serviço aceito!", body: v?.origin ? `Saia em direção a ${v.origin}.` : "Prepare-se para sair.", data: { screen: "job" } }),
    job_en_route: () => ({ title: "Em rota!", body: "Você está a caminho. O cliente foi notificado.", data: { screen: "job" } }),
    job_in_progress: () => ({ title: "Serviço iniciado!", body: "PIN de início confirmado. O serviço está em andamento.", data: { screen: "job" } }),
    job_completed: () => ({ title: "Serviço concluído!", body: "Ótimo trabalho! O pagamento está sendo processado.", data: { screen: "index" } }),
    job_cancelled: () => ({ title: "Pedido cancelado", body: "O cliente cancelou o serviço.", data: { screen: "index" } }),
    job_disputed: () => ({ title: "Disputa aberta", body: "Um ticket foi criado para este serviço. Aguarde o contato do suporte.", data: { screen: "ticket" } }),
    new_message: (v) => ({ title: v?.name ? String(v.name) : "Nova mensagem", body: v?.preview ? String(v.preview) : "Você recebeu uma nova mensagem.", data: { screen: "inbox" } }),
    payment_authorized: (v) => ({ title: "Pagamento autorizado", body: v?.value ? `R$ ${v.value} reservado para o serviço.` : "Seu pagamento foi reservado.", data: { screen: "payment" } }),
    payout_processed: (v) => ({ title: "Saque processado!", body: v?.value ? `R$ ${v.value} foi transferido para sua conta.` : "Seu saque está disponível.", data: { screen: "index" } }),
    email_confirmed: () => ({ title: "E-mail confirmado!", body: "Bem-vindo ao Ajudaê! Sua conta está ativa.", data: { screen: "index" } }),
    provider_verified: () => ({ title: "Perfil verificado!", body: "Parabéns! Você pode começar a aceitar pedidos no Ajudaê.", data: { screen: "index" } }),
    provider_validation_received: () => ({ title: "Documentos recebidos", body: "Nossa equipe recebeu seus documentos e iniciou a análise da sua validação.", data: { screen: "index" } }),
  };
}

function getForegroundBanner(event: NotificationEvent, payload: NotificationPayload): ForegroundBannerState | null {
  if (event !== "provider_validation_received") {
    return null;
  }

  return {
    title: payload.title,
    body: payload.body,
    backgroundColor: "#FACC15",
    textColor: "#1A1714",
    icon: "notifications",
    statusBarStyle: "dark",
  };
}

async function fire(
  event: NotificationEvent,
  language: AppLanguage,
  showForegroundBanner: (banner: ForegroundBannerState) => void,
  vars?: Vars,
): Promise<void> {
  const payload = getCatalog(language)[event](vars);
  const foregroundBanner = getForegroundBanner(event, payload);

  if (foregroundBanner && AppState.currentState === "active") {
    showForegroundBanner(foregroundBanner);
    return;
  }

  if (!Notifications) {
    if (foregroundBanner) {
      showForegroundBanner(foregroundBanner);
    }
    return;
  }

  let channelId = "ajudae-default";
  if (
    ["service_accepted", "service_en_route", "service_in_progress",
      "service_completed", "service_cancelled", "service_disputed",
      "job_in_progress", "job_completed", "job_cancelled", "job_disputed"].includes(event)
  ) {
    channelId = "ajudae-service";
  } else if (event === "new_job_request" || event === "job_accepted") {
    channelId = "ajudae-proposals";
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
      trigger: null,
    });
  } catch {
  }
}

const NotificationContext = createContext<NotificationContextType | null>(null);
const NOTIFICATION_PROMPT_KEY = "@ajudae_notification_prompted_v1";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { role, user, isAuthenticated } = useAuthSafe();
  const { active } = useService();
  const {
    notifications,
    requestNotifications,
    notificationPreferences,
    appLanguage,
  } = usePermissions();
  const insets = useSafeAreaInsets();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isRegisteringPushToken, setIsRegisteringPushToken] = useState(false);
  const [pushRegistrationError, setPushRegistrationError] = useState<string | null>(null);
  const [banner, setBanner] = useState<ForegroundBannerState | null>(null);

  const [proposalAlert, setProposalAlert] = useState<ProposalAlertPayload | null>(null);

  const prevStatus = useRef<ServiceStatus | null>(null);
  const prevStartAttempts = useRef(0);
  const prevEndAttempts = useRef(0);
  const isInitialLoad = useRef(true);
  const roleRef = useRef(role);
  const previousProviderVerified = useRef<boolean>(Boolean(user?.provider?.verified));
  const bannerTranslate = useRef(new Animated.Value(-140)).current;
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { roleRef.current = role; }, [role]);

  // Set up Android notification channels and action categories once on mount
  useEffect(() => {
    if (!Notifications) return;

    const setup = async () => {
      try {
        await Notifications.setNotificationCategoryAsync("new-proposal", [
          {
            identifier: "accept",
            buttonTitle: "✅ Aceitar",
            options: { opensAppToForeground: true },
          },
          {
            identifier: "decline",
            buttonTitle: "❌ Recusar",
            options: { opensAppToForeground: false, isDestructive: true },
          },
        ]);
      } catch {
        // Categories unsupported on simulator/web
      }

      if (Platform.OS === "android") {
        try {
          // MAX importance → heads-up display on top of any app + visible on lock screen
          await Notifications.setNotificationChannelAsync("ajudae-proposals", {
            name: "Novas Propostas",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 150, 250, 150, 500],
            lightColor: "#FFC90E",
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            sound: "default",
            enableVibrate: true,
            showBadge: true,
            bypassDnd: false,
          });
          await Notifications.setNotificationChannelAsync("ajudae-service", {
            name: "Status do Serviço",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 200, 100, 200],
            lightColor: "#FFC90E",
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            sound: "default",
            enableVibrate: true,
          });
          await Notifications.setNotificationChannelAsync("ajudae-default", {
            name: "Notificações Gerais",
            importance: Notifications.AndroidImportance.DEFAULT,
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
          });
        } catch {
          // Channel setup failed (simulator or API<26)
        }
      }
    };

    setup().catch(() => {});
  }, []);

  // Show in-app overlay when a new proposal notification arrives while app is foreground
  useEffect(() => {
    if (!Notifications || !isAuthenticated) return;

    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, string> | undefined;
      if (
        data?.type === "new_job_request" &&
        roleRef.current === "prestador" &&
        AppState.currentState === "active"
      ) {
        setProposalAlert({
          title: notification.request.content.title ?? "Novo pedido disponível!",
          body: notification.request.content.body ?? "",
          requestId: data.request_id,
        });
      }
    });

    return () => sub.remove();
  }, [isAuthenticated]);

  // Push token registration after PermissionGate grants notifications
  useEffect(() => {
    if (!isAuthenticated || !notifications.granted || !Notifications) return;
    registerPushToken().catch(() => {});
  }, [isAuthenticated, notifications.granted]);

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, []);

  const dismissBanner = () => {
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
      bannerTimeoutRef.current = null;
    }
    Animated.parallel([
      Animated.timing(bannerTranslate, { toValue: -140, duration: 200, useNativeDriver: true }),
      Animated.timing(bannerOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setBanner(null);
    });
  };

  const showForegroundBanner = (nextBanner: ForegroundBannerState) => {
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
      bannerTimeoutRef.current = null;
    }
    setBanner(nextBanner);
    bannerTranslate.setValue(-140);
    bannerOpacity.setValue(0);
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(bannerTranslate, { toValue: 0, tension: 120, friction: 18, useNativeDriver: true }),
        Animated.timing(bannerOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    });
    bannerTimeoutRef.current = setTimeout(() => {
      dismissBanner();
    }, 4200);
  };

  const canSendEvent = (event: NotificationEvent) =>
    notificationPreferences[EVENT_CATEGORY[event]];

  const registerPushToken = async (force = false): Promise<string | null> => {
    if (!Notifications || !notifications.granted) return null;
    if (!force && pushToken) return pushToken;

    const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
    const easConfig = Constants.easConfig as { projectId?: string } | null | undefined;
    const projectId = extra?.eas?.projectId ?? easConfig?.projectId;
    if (!projectId) {
      setPushRegistrationError("Projeto EAS sem projectId");
      return null;
    }

    setIsRegisteringPushToken(true);
    setPushRegistrationError(null);

    try {
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      setPushToken(token.data);
      return token.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao gerar push token";
      setPushRegistrationError(message);
      setPushToken("local-only");
      return "local-only";
    } finally {
      setIsRegisteringPushToken(false);
    }
  };

  useEffect(() => {
    if (!Notifications || !notifications.granted || pushToken) return;
    registerPushToken().catch(() => {});
  }, [notifications.granted, pushToken]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    const nextToken =
      notifications.granted && pushToken && pushToken !== "local-only"
        ? pushToken
        : null;

    supabase
      .from("profiles")
      .update({
        expo_push_token: nextToken,
        push_token_updated_at: nextToken ? new Date().toISOString() : null,
      })
      .eq("id", user.id)
      .then(({ error }) => {
        if (error) {
          if (__DEV__) console.warn("[NotificationContext] token sync error:", error.message);
        }
      });
  }, [isAuthenticated, notifications.granted, pushToken, user?.id]);

  useEffect(() => {
    const currentVerified = Boolean(
      user?.provider?.verified || user?.provider?.onboarding_status === "approved",
    );
    const wasVerified = previousProviderVerified.current;

    if (
      currentVerified &&
      !wasVerified &&
      role === "prestador" &&
      canSendEvent("provider_verified")
    ) {
      fire("provider_verified", appLanguage, showForegroundBanner).catch(() => {});
    }

    previousProviderVerified.current = currentVerified;
  }, [appLanguage, notificationPreferences, role, user?.provider?.onboarding_status, user?.provider?.verified]);

  useEffect(() => {
    if (!active) {
      prevStatus.current = null;
      prevStartAttempts.current = 0;
      prevEndAttempts.current = 0;
      isInitialLoad.current = true;
      return;
    }

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

    const isPinDispute =
      (startAttemptsUp || endAttemptsUp) && active.status === "disputed";

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
        if (evt && canSendEvent(evt)) fire(evt, appLanguage, showForegroundBanner, vars);
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
        if (evt && canSendEvent(evt)) fire(evt, appLanguage, showForegroundBanner, vars);
      }
    }

    if (startAttemptsUp) {
      if (isPinDispute) {
        const evt = currentRole === "cliente" ? "pin_start_disputed" : "job_disputed";
        if (canSendEvent(evt)) fire(evt, appLanguage, showForegroundBanner, vars);
      } else if (canSendEvent("pin_start_wrong")) {
        fire("pin_start_wrong", appLanguage, showForegroundBanner, { ...vars, left: 5 - active.startPinAttempts });
      }
    }

    if (endAttemptsUp) {
      if (isPinDispute) {
        const evt = currentRole === "cliente" ? "pin_end_disputed" : "job_disputed";
        if (canSendEvent(evt)) fire(evt, appLanguage, showForegroundBanner, vars);
      } else if (canSendEvent("pin_end_wrong")) {
        fire("pin_end_wrong", appLanguage, showForegroundBanner, { ...vars, left: 5 - active.conclusionAttempts });
      }
    }
  }, [active?.status, active?.startPinAttempts, active?.conclusionAttempts, appLanguage, notificationPreferences]);

  const requestPermission = requestNotifications;
  const refreshPushToken = async (): Promise<string | null> => registerPushToken(true);

  const send = async (event: NotificationEvent, vars?: Vars): Promise<void> => {
    if (!canSendEvent(event)) return;
    await fire(event, appLanguage, showForegroundBanner, vars);
  };

  return (
    <NotificationContext.Provider
      value={{
        hasPermission: notifications.granted,
        pushToken,
        isRegisteringPushToken,
        pushRegistrationError,
        bannerStatusBarColor: banner?.backgroundColor ?? null,
        bannerStatusBarStyle: banner?.statusBarStyle ?? null,
        requestPermission,
        refreshPushToken,
        send,
      }}
    >
      {children}
      {proposalAlert ? (
        <ProposalAlert
          payload={proposalAlert}
          onDismiss={() => setProposalAlert(null)}
        />
      ) : null}
      {banner ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.bannerShell,
            {
              paddingTop: insets.top + 8,
              opacity: bannerOpacity,
              transform: [{ translateY: bannerTranslate }],
            },
          ]}
        >
          <View style={[styles.bannerCard, { backgroundColor: banner.backgroundColor }, shadows.xl]}>
            <View style={styles.bannerContent}>
              <View style={[styles.bannerIconWrap, { backgroundColor: "rgba(255,255,255,0.28)" }]}>
                <Ionicons name={banner.icon} size={16} color={banner.textColor} />
              </View>
              <View style={styles.bannerTextWrap}>
                <Text style={[styles.bannerTitle, { color: banner.textColor }]}>{banner.title}</Text>
                <Text style={[styles.bannerBody, { color: banner.textColor }]}>{banner.body}</Text>
              </View>
              <Pressable onPress={dismissBanner} hitSlop={10} style={styles.bannerClose}>
                <Ionicons name="close" size={16} color={banner.textColor} />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      ) : null}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}

const styles = StyleSheet.create({
  bannerShell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 40,
  },
  bannerCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 12,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  bannerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontFamily: fonts.sans.bold,
  },
  bannerBody: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.sans.medium,
  },
  bannerClose: {
    marginTop: 2,
  },
});
