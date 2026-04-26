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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
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
import { ServiceProvider } from "@/contexts/ServiceContext";
import { StatusBar } from "expo-status-bar";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/auth");
    } else if (isAuthenticated && inAuthGroup) {
      if (user && !user.onboardingCompleted) {
        router.replace("/onboarding");
      } else {
        router.replace("/");
      }
    } else if (isAuthenticated && !inOnboarding && user && !user.onboardingCompleted) {
      router.replace("/onboarding");
    }
  }, [isAuthenticated, isLoading, segments, user]);

  return (
    <Stack screenOptions={{ headerShown: false, headerBackTitle: "Voltar", contentStyle: { backgroundColor: "#F7F5F2" } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="marketplace" options={{ headerShown: false }} />
      <Stack.Screen name="inbox" options={{ headerShown: false }} />
      <Stack.Screen name="support" options={{ headerShown: false }} />
      <Stack.Screen name="provider/[id]" options={{ presentation: "card" }} />
      <Stack.Screen name="payment" options={{ presentation: "modal" }} />
      <Stack.Screen name="request" options={{ presentation: "modal" }} />
      <Stack.Screen name="request-details" options={{ presentation: "modal" }} />
      <Stack.Screen name="otp-modal" options={{ presentation: "modal", gestureEnabled: false }} />
      <Stack.Screen name="track" options={{ headerShown: false }} />
      <Stack.Screen name="rate" options={{ presentation: "modal" }} />
      <Stack.Screen name="ticket" options={{ presentation: "modal" }} />
      <Stack.Screen name="job" options={{ headerShown: false }} />
      <Stack.Screen name="job-otp" options={{ presentation: "modal" }} />
      <Stack.Screen name="start-pin" options={{ presentation: "modal", gestureEnabled: false }} />
      <Stack.Screen name="confirm-start-pin" options={{ presentation: "modal" }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
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
                <RequestsProvider>
                  <ServiceProvider>
                    <PaymentsProvider>
                      <SupportProvider>
                        <StatusBar style="dark" backgroundColor="#F7F5F2" />
                        <AuthGate />
                      </SupportProvider>
                    </PaymentsProvider>
                  </ServiceProvider>
                </RequestsProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
