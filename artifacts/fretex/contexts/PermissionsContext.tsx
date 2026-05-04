import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Linking } from "react-native";

import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthContext";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OsPermission {
  granted: boolean;
  /** false when permanently denied — must open OS Settings to change */
  canAsk: boolean;
}

export interface PermissionsState {
  location: OsPermission;
  camera: OsPermission;
  mediaLibrary: OsPermission;
  notifications: OsPermission;
  lgpdAccepted: boolean;
  /** true once the initial OS read is done */
  ready: boolean;
}

export interface PermissionsContextType extends PermissionsState {
  requestLocation: () => Promise<boolean>;
  requestCamera: () => Promise<boolean>;
  requestMediaLibrary: () => Promise<boolean>;
  requestNotifications: () => Promise<boolean>;
  acceptLGPD: () => Promise<void>;
  openSettings: () => void;
  refresh: () => Promise<void>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const LGPD_KEY = "@ajudae_lgpd_accepted";

function toOsPerm(status: string, canAskAgain: boolean): OsPermission {
  return { granted: status === "granted", canAsk: canAskAgain };
}

// ─── Context ───────────────────────────────────────────────────────────────────

const PermissionsContext = createContext<PermissionsContextType | null>(null);

const DENIED: OsPermission = { granted: false, canAsk: false };
const UNKNOWN: OsPermission = { granted: false, canAsk: true };

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  const [location, setLocation] = useState<OsPermission>(UNKNOWN);
  const [camera, setCamera] = useState<OsPermission>(UNKNOWN);
  const [mediaLibrary, setMediaLibrary] = useState<OsPermission>(UNKNOWN);
  const [notifications, setNotifications] = useState<OsPermission>(UNKNOWN);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [ready, setReady] = useState(false);

  const appState = useRef(AppState.currentState);

  // ── Read all OS permission states ───────────────────────────────────────────
  const refresh = useCallback(async () => {
    const [locResult, camResult, libResult, notifResult] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      ImagePicker.getCameraPermissionsAsync(),
      ImagePicker.getMediaLibraryPermissionsAsync(),
      Notifications.getPermissionsAsync(),
    ]);
    setLocation(toOsPerm(locResult.status, locResult.canAskAgain));
    setCamera(toOsPerm(camResult.status, camResult.canAskAgain));
    setMediaLibrary(toOsPerm(libResult.status, libResult.canAskAgain));
    setNotifications(toOsPerm(notifResult.status, notifResult.canAskAgain));
  }, []);

  // ── Bootstrap: read OS states + resolve LGPD from DB / AsyncStorage ─────────
  useEffect(() => {
    let mounted = true;

    async function boot() {
      await refresh();

      // LGPD: DB is source of truth when authenticated; AsyncStorage is fallback
      let accepted = false;
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

  // ── Sync permission states to Supabase whenever they change ─────────────────
  useEffect(() => {
    if (!ready || !isAuthenticated || !user) return;

    supabase
      .from("profiles")
      .update({
        geolocation_requested: location.granted,
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
    camera.granted,
    mediaLibrary.granted,
    notifications.granted,
    lgpdAccepted,
  ]);

  // ── Request functions ────────────────────────────────────────────────────────

  const requestLocation = async (): Promise<boolean> => {
    const result = await Location.requestForegroundPermissionsAsync();
    const perm = toOsPerm(result.status, result.canAskAgain);
    setLocation(perm);
    return perm.granted;
  };

  const requestCamera = async (): Promise<boolean> => {
    const result = await ImagePicker.requestCameraPermissionsAsync();
    const perm = toOsPerm(result.status, result.canAskAgain);
    setCamera(perm);
    return perm.granted;
  };

  const requestMediaLibrary = async (): Promise<boolean> => {
    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const perm = toOsPerm(result.status, result.canAskAgain);
    setMediaLibrary(perm);
    return perm.granted;
  };

  const requestNotifications = async (): Promise<boolean> => {
    await setupAndroidNotificationChannels();
    const result = await Notifications.requestPermissionsAsync();
    const perm = toOsPerm(result.status, result.canAskAgain);
    setNotifications(perm);
    return perm.granted;
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

  const openSettings = () => Linking.openSettings();

  return (
    <PermissionsContext.Provider
      value={{
        location,
        camera,
        mediaLibrary,
        notifications,
        lgpdAccepted,
        ready,
        requestLocation,
        requestCamera,
        requestMediaLibrary,
        requestNotifications,
        acceptLGPD,
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
