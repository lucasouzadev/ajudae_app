import {
  Fraunces_700Bold,
  Fraunces_800ExtraBold,
  Fraunces_900Black,
  useFonts as useFraunces,
} from "@expo-google-fonts/fraunces";
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  useFonts as useFigtree,
} from "@expo-google-fonts/figtree";
import Constants from "expo-constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RequestsProvider } from "@/contexts/RequestsContext";
import { PaymentsProvider } from "@/contexts/PaymentsContext";
import { SupportProvider } from "@/contexts/SupportContext";
import { ServiceProvider, useService } from "@/contexts/ServiceContext";
import { PortfolioProvider } from "@/contexts/PortfolioContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { PermissionsProvider, usePermissions } from "@/contexts/PermissionsContext";
import { PermissionGate } from "@/components/PermissionGate";
import { StatusBar } from "expo-status-bar";
import colors from "@/constants/colors";

// expo-notifications requires native modules — not available in Expo Go without a dev build.
// Using conditional require so _layout.tsx loads normally in all environments.
let Notifications: typeof import("expo-notifications") | null = null;
try {
  if (Constants.appOwnership !== "expo") {
    Notifications = require("expo-notifications");
  }
} catch {
  // Native module ExpoPushTokenManager not available — notification tap-to-navigate disabled
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate() {
  const { isAuthenticated, isLoading, user, role, accountStatus } = useAuth();
  const { active } = useService();
  const { themeMode } = usePermissions();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const c = colors.light;

  const terminalStatuses = ["completed", "cancelled", "disputed"];

  // Navigate to the screen embedded in notification data when user taps a notification
  // Guard: Notifications is null when native modules are not available (Expo Go / dev)
  useEffect(() => {
    if (!Notifications) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (screen && isAuthenticated) {
        router.push(`/${screen}` as never);
      }
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) return;

    const rootSegment = String(segments[0] ?? "");
    const inAuthGroup = rootSegment === "auth";
    const inPending = rootSegment === "account-pending";

    if (accountStatus === "pending_email" && pathname !== "/account-pending") {
      router.replace("/account-pending" as never);
    } else if (!isAuthenticated && pathname !== "/auth" && !inPending) {
      router.replace("/auth" as never);
    } else if (isAuthenticated && (inAuthGroup || inPending) && pathname !== "/") {
      router.replace("/" as never);
    }
  }, [accountStatus, isAuthenticated, isLoading, pathname, segments, user]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    if (!active || terminalStatuses.includes(active.status)) return;

    const allowedClient = ["track", "confirm-start-pin", "otp-modal", "ticket", "rate", "inbox"];
    const allowedProvider = ["job", "start-pin", "job-otp", "ticket", "inbox"];
    const allowed = role === "prestador" ? allowedProvider : allowedClient;

    const currentSegment = segments[segments.length - 1];

    if (!allowed.includes(currentSegment)) {
      const target = role === "prestador" ? "/job" : "/track";
      if (pathname !== target) {
        router.replace(target as never);
      }
    }
  }, [active, isAuthenticated, isLoading, pathname, role, segments]);

  return (
    <>
      <StatusBar style={themeMode === "dark" ? "light" : "dark"} backgroundColor={c.background} />
      <PermissionGate />
      <Stack screenOptions={{ headerShown: false, headerBackTitle: "Voltar", animation: "fade_from_bottom", contentStyle: { backgroundColor: c.background } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="account-pending" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="provider-validation" options={{ headerShown: false }} />
        <Stack.Screen name="marketplace" options={{ headerShown: false }} />
        <Stack.Screen name="inbox" options={{ headerShown: false }} />
        <Stack.Screen name="support" options={{ headerShown: false }} />
        <Stack.Screen name="push-test" options={{ headerShown: false }} />
        <Stack.Screen name="provider/[id]" options={{ presentation: "card", animation: "slide_from_right" }} />
        <Stack.Screen name="payment" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="request" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="request-details" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="otp-modal" options={{ presentation: "modal", animation: "slide_from_bottom", gestureEnabled: false }} />
        <Stack.Screen name="track" options={{ headerShown: false }} />
        <Stack.Screen name="rate" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="ticket" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="job" options={{ headerShown: false }} />
        <Stack.Screen name="job-otp" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="start-pin" options={{ presentation: "modal", animation: "slide_from_bottom", gestureEnabled: false }} />
        <Stack.Screen name="confirm-start-pin" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [frauncesLoaded, frauncesError] = useFraunces({
    Fraunces_700Bold,
    Fraunces_800ExtraBold,
    Fraunces_900Black,
  });

  const [figtreeLoaded, figtreeError] = useFigtree({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });

  const fontsLoaded = frauncesLoaded && figtreeLoaded;
  const fontError = frauncesError || figtreeError;

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <PermissionsProvider>
                  <PortfolioProvider>
                    <RequestsProvider>
                      <ServiceProvider>
                        <NotificationProvider>
                          <PaymentsProvider>
                            <SupportProvider>
                              <AuthGate />
                            </SupportProvider>
                          </PaymentsProvider>
                        </NotificationProvider>
                      </ServiceProvider>
                    </RequestsProvider>
                  </PortfolioProvider>
                </PermissionsProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
