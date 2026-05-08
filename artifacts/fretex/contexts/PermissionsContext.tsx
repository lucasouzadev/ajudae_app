import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Linking } from "react-native";

import colors from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { useAuthSafe } from "./AuthContext";

let Notifications: typeof import("expo-notifications") | null = null;
try {
  if (Constants.appOwnership !== "expo") {
    Notifications = require("expo-notifications");
  }
} catch (e) {
  // expo-notifications not available in dev
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OsPermission {
  granted: boolean;
  /** false when permanently denied — must open OS Settings to change */
  canAsk: boolean;
}

export interface PermissionsState {
  location: OsPermission;
  backgroundLocation: OsPermission;
  camera: OsPermission;
  mediaLibrary: OsPermission;
  notifications: OsPermission;
  lgpdAccepted: boolean;
  backgroundTrackingEnabled: boolean;
  themeMode: ThemeMode;
  appLanguage: AppLanguage;
  notificationPreferences: NotificationPreferences;
  /** true once the initial OS read is done */
  ready: boolean;
}

export type ThemeMode = "light" | "dark";
export type AppLanguage = "pt-BR" | "en-US" | "es-ES";
export type NotificationPreferenceKey =
  | "orders"
  | "messages"
  | "payments"
  | "account"
  | "marketing";

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export interface PermissionsContextType extends PermissionsState {
  requestLocation: () => Promise<boolean>;
  requestBackgroundLocation: () => Promise<boolean>;
  requestCamera: () => Promise<boolean>;
  requestMediaLibrary: () => Promise<boolean>;
  requestNotifications: () => Promise<boolean>;
  acceptLGPD: () => Promise<void>;
  setBackgroundTrackingEnabled: (enabled: boolean) => Promise<boolean>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleThemeMode: () => Promise<void>;
  setAppLanguage: (language: AppLanguage) => Promise<void>;
  setNotificationPreference: (
    key: NotificationPreferenceKey,
    enabled: boolean,
  ) => Promise<void>;
  openSettings: () => void;
  refresh: () => Promise<void>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const LGPD_KEY = "@ajudae_lgpd_accepted";
const THEME_MODE_KEY = "@ajudae_theme_mode";
const APP_LANGUAGE_KEY = "@ajudae_app_language";
const BG_TRACKING_KEY = "@ajudae_background_tracking_enabled";
const NOTIFICATION_PREFS_KEY = "@ajudae_notification_preferences";
const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  orders: true,
  messages: true,
  payments: true,
  account: true,
  marketing: false,
};
const LIGHT_PALETTE = { ...colors.light };
const DARK_PALETTE = { ...colors.dark };

function toOsPerm(status: string, canAskAgain: boolean): OsPermission {
  return { granted: status === "granted", canAsk: canAskAgain };
}

function toNotificationPerm(result: {
  status: string;
  canAskAgain: boolean;
  ios?: { status?: number | null } | null;
}): OsPermission {
  const iosStatus = result.ios?.status;
  const grantedOnIos =
    iosStatus === Notifications?.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications?.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications?.IosAuthorizationStatus.EPHEMERAL;

  return {
    granted: result.status === "granted" || grantedOnIos,
    canAsk: result.canAskAgain,
  };
}

function applyTheme(mode: ThemeMode) {
  Object.assign(colors.light, mode === "dark" ? DARK_PALETTE : LIGHT_PALETTE);
}

// ─── Context ───────────────────────────────────────────────────────────────────

const PermissionsContext = createContext<PermissionsContextType | null>(null);

const DENIED: OsPermission = { granted: false, canAsk: false };
const UNKNOWN: OsPermission = { granted: false, canAsk: true };

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthSafe();

  const [location, setLocation] = useState<OsPermission>(UNKNOWN);
  const [backgroundLocation, setBackgroundLocation] = useState<OsPermission>(UNKNOWN);
  const [camera, setCamera] = useState<OsPermission>(UNKNOWN);
  const [mediaLibrary, setMediaLibrary] = useState<OsPermission>(UNKNOWN);
  const [notifications, setNotifications] = useState<OsPermission>(UNKNOWN);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [backgroundTrackingEnabled, setBackgroundTrackingEnabledState] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");
  const [appLanguage, setAppLanguageState] = useState<AppLanguage>("pt-BR");
  const [notificationPreferences, setNotificationPreferencesState] =
    useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [ready, setReady] = useState(false);

  const appState = useRef(AppState.currentState);

  // ── Read all OS permission states ───────────────────────────────────────────
  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([
      Location.getForegroundPermissionsAsync(),
      Location.getBackgroundPermissionsAsync(),
      ImagePicker.getCameraPermissionsAsync(),
      ImagePicker.getMediaLibraryPermissionsAsync(),
      Notifications ? Notifications.getPermissionsAsync() : Promise.resolve({ status: "denied", canAskAgain: false }),
    ]);
    const [locResult, bgLocResult, camResult, libResult, notifResult] = results;

    if (locResult.status === "fulfilled") {
      setLocation(toOsPerm(locResult.value.status, locResult.value.canAskAgain));
    }

    if (bgLocResult.status === "fulfilled") {
      setBackgroundLocation(toOsPerm(bgLocResult.value.status, bgLocResult.value.canAskAgain));
    }

    if (camResult.status === "fulfilled") {
      setCamera(toOsPerm(camResult.value.status, camResult.value.canAskAgain));
    }

    if (libResult.status === "fulfilled") {
      setMediaLibrary(toOsPerm(libResult.value.status, libResult.value.canAskAgain));
    }

    if (notifResult.status === "fulfilled") {
      setNotifications(toNotificationPerm(notifResult.value));
    } else {
      setNotifications(DENIED);
    }
  }, []);

  // ── Bootstrap: read OS states + resolve LGPD from DB / AsyncStorage ─────────
  useEffect(() => {
    let mounted = true;

    async function boot() {
      await refresh();

      // LGPD: DB is source of truth when authenticated; AsyncStorage is fallback
      let accepted = false;
      const [storedTheme, storedLanguage, storedBgTracking, storedNotificationPrefs] =
        await Promise.all([
          AsyncStorage.getItem(THEME_MODE_KEY),
          AsyncStorage.getItem(APP_LANGUAGE_KEY),
          AsyncStorage.getItem(BG_TRACKING_KEY),
          AsyncStorage.getItem(NOTIFICATION_PREFS_KEY),
        ]);

      const resolvedTheme: ThemeMode = storedTheme === "dark" ? "dark" : "light";
      const resolvedLanguage: AppLanguage =
        storedLanguage === "en-US" || storedLanguage === "es-ES" || storedLanguage === "pt-BR"
          ? storedLanguage
          : "pt-BR";
      const resolvedBgTracking = storedBgTracking === "1";
      let resolvedNotificationPrefs = DEFAULT_NOTIFICATION_PREFERENCES;
      if (storedNotificationPrefs) {
        try {
          resolvedNotificationPrefs = {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...(JSON.parse(storedNotificationPrefs) as Partial<NotificationPreferences>),
          };
        } catch {
          resolvedNotificationPrefs = DEFAULT_NOTIFICATION_PREFERENCES;
        }
      }

      if (isAuthenticated && user) {
        accepted = user.lgpd_accepted ?? false;
        if (!accepted) {
          // also check local cache (e.g. accepted before profile loaded)
          const cached = await AsyncStorage.getItem(LGPD_KEY);
          if (cached === "1") accepted = true;
        }
      } else {
        const cached = await AsyncStorage.getItem(LGPD_KEY);
        accepted = cached === "1";
      }

      if (mounted) {
        applyTheme(resolvedTheme);
        setThemeModeState(resolvedTheme);
        setAppLanguageState(resolvedLanguage);
        setBackgroundTrackingEnabledState(resolvedBgTracking);
        setNotificationPreferencesState(resolvedNotificationPrefs);
        setLgpdAccepted(accepted);
        setReady(true);
      }
    }

    boot();
    return () => { mounted = false; };
  }, [isAuthenticated, user?.id]); // re-run when auth state changes

  // ── Re-read OS states when app returns to foreground ────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        refresh();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [refresh]);

  useEffect(() => {
    if (!ready || backgroundLocation.granted || !backgroundTrackingEnabled) return;
    AsyncStorage.setItem(BG_TRACKING_KEY, "0").catch(() => {});
    setBackgroundTrackingEnabledState(false);
  }, [ready, backgroundLocation.granted, backgroundTrackingEnabled]);

  // ── Sync permission states to Supabase whenever they change ─────────────────
  useEffect(() => {
    if (!ready || !isAuthenticated || !user) return;

    supabase
      .from("profiles")
      .update({
        geolocation_requested: location.granted || backgroundLocation.granted,
        camera_requested: camera.granted || mediaLibrary.granted,
        notifications_requested: notifications.granted,
        lgpd_accepted: lgpdAccepted,
        last_consent_update: new Date().toISOString(),
      })
      .eq("id", user.id)
      .then(({ error }) => {
        if (error) console.warn("[PermissionsContext] DB sync error:", error.message);
      });
  }, [
    ready,
    isAuthenticated,
    user?.id,
    location.granted,
    backgroundLocation.granted,
    camera.granted,
    mediaLibrary.granted,
    notifications.granted,
    lgpdAccepted,
  ]);

  // ── Request functions ────────────────────────────────────────────────────────

  const requestLocation = async (): Promise<boolean> => {
    try {
      const result = await Location.requestForegroundPermissionsAsync();
      const perm = toOsPerm(result.status, result.canAskAgain);
      setLocation(perm);
      return perm.granted;
    } catch (error) {
      console.warn("[PermissionsContext] requestLocation failed:", (error as Error).message);
      return false;
    }
  };

  const requestBackgroundLocation = async (): Promise<boolean> => {
    try {
      let foregroundGranted = location.granted;
      if (!foregroundGranted) {
        foregroundGranted = await requestLocation();
      }
      if (!foregroundGranted) {
        return false;
      }

      const result = await Location.requestBackgroundPermissionsAsync();
      const perm = toOsPerm(result.status, result.canAskAgain);
      setBackgroundLocation(perm);
      return perm.granted;
    } catch (error) {
      console.warn("[PermissionsContext] requestBackgroundLocation failed:", (error as Error).message);
      return false;
    }
  };

  const requestCamera = async (): Promise<boolean> => {
    try {
      const result = await ImagePicker.requestCameraPermissionsAsync();
      const perm = toOsPerm(result.status, result.canAskAgain);
      setCamera(perm);
      return perm.granted;
    } catch (error) {
      console.warn("[PermissionsContext] requestCamera failed:", (error as Error).message);
      return false;
    }
  };

  const requestMediaLibrary = async (): Promise<boolean> => {
    try {
      const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const perm = toOsPerm(result.status, result.canAskAgain);
      setMediaLibrary(perm);
      return perm.granted;
    } catch (error) {
      console.warn("[PermissionsContext] requestMediaLibrary failed:", (error as Error).message);
      return false;
    }
  };

  const requestNotifications = async (): Promise<boolean> => {
    if (!Notifications) return false; // notifications not available in dev
    try {
      await setupAndroidNotificationChannels();
      const current = await Notifications.getPermissionsAsync();
      if (toNotificationPerm(current).granted || !current.canAskAgain) {
        const perm = toNotificationPerm(current);
        setNotifications(perm);
        return perm.granted;
      }

      const result = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      const perm = toNotificationPerm(result);
      setNotifications(perm);
      return perm.granted;
    } catch (error) {
      console.warn("[PermissionsContext] requestNotifications failed:", (error as Error).message);
      return false;
    }
  };

  const acceptLGPD = async (): Promise<void> => {
    await AsyncStorage.setItem(LGPD_KEY, "1");
    setLgpdAccepted(true);
    if (isAuthenticated && user) {
      await supabase
        .from("profiles")
        .update({
          lgpd_accepted: true,
          last_consent_update: new Date().toISOString(),
        })
        .eq("id", user.id);
    }
  };

  const setBackgroundTrackingEnabled = async (enabled: boolean): Promise<boolean> => {
    if (!enabled) {
      await AsyncStorage.setItem(BG_TRACKING_KEY, "0");
      setBackgroundTrackingEnabledState(false);
      return true;
    }

    const granted = backgroundLocation.granted || (await requestBackgroundLocation());
    if (!granted) {
      if (!backgroundLocation.canAsk) {
        openSettings();
      }
      return false;
    }

    await AsyncStorage.setItem(BG_TRACKING_KEY, "1");
    setBackgroundTrackingEnabledState(true);
    return true;
  };

  const setThemeMode = async (mode: ThemeMode): Promise<void> => {
    applyTheme(mode);
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  };

  const toggleThemeMode = async (): Promise<void> => {
    const next = themeMode === "dark" ? "light" : "dark";
    await setThemeMode(next);
  };

  const setAppLanguage = async (language: AppLanguage): Promise<void> => {
    setAppLanguageState(language);
    await AsyncStorage.setItem(APP_LANGUAGE_KEY, language);
  };

  const setNotificationPreference = async (
    key: NotificationPreferenceKey,
    enabled: boolean,
  ): Promise<void> => {
    const next = { ...notificationPreferences, [key]: enabled };
    setNotificationPreferencesState(next);
    await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next));
  };

  const openSettings = () => Linking.openSettings();

  return (
    <PermissionsContext.Provider
      value={{
        location,
        backgroundLocation,
        camera,
        mediaLibrary,
        notifications,
        lgpdAccepted,
        backgroundTrackingEnabled,
        themeMode,
        appLanguage,
        notificationPreferences,
        ready,
        requestLocation,
        requestBackgroundLocation,
        requestCamera,
        requestMediaLibrary,
        requestNotifications,
        acceptLGPD,
        setBackgroundTrackingEnabled,
        setThemeMode,
        toggleThemeMode,
        setAppLanguage,
        setNotificationPreference,
        openSettings,
        refresh,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
  return ctx;
}

// ─── Android channel setup (shared with NotificationContext) ─────────────────

async function setupAndroidNotificationChannels() {
  if (!Notifications) return; // notifications not available in dev
  const { Platform } = await import("react-native");
  if (Platform.OS !== "android") return;
  await Promise.all([
    Notifications.setNotificationChannelAsync("ajudae-default", {
      name: "Ajudaê",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: "#FF6A00",
      sound: "default",
    }),
    Notifications.setNotificationChannelAsync("ajudae-service", {
      name: "Atualizações de serviço",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#10B981",
      sound: "default",
    }),
    Notifications.setNotificationChannelAsync("ajudae-jobs", {
      name: "Novos pedidos",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 100, 300],
      lightColor: "#6366F1",
      sound: "default",
    }),
  ]);
}
