import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ChatProvider } from "@/contexts/ChatContext";
import { KnowledgeProvider } from "@/contexts/KnowledgeContext";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { GuideStoreProvider } from "@/contexts/GuideStoreContext";
import { UserProfileProvider, useUserProfile } from "@/contexts/UserProfileContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { onboardingCompleted } = useUserProfile();
  const router = useRouter();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (onboardingCompleted !== null) {
      SplashScreen.hideAsync();
    }
  }, [onboardingCompleted]);

  // Navigate to onboarding imperatively (avoids remounting providers)
  useEffect(() => {
    if (onboardingCompleted === false && !didRedirect.current) {
      didRedirect.current = true;
      router.replace("/onboarding");
    }
  }, [onboardingCompleted, router]);

  // Still loading from AsyncStorage — keep splash visible
  if (onboardingCompleted === null) return null;

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="knowledge/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="guides/[slug]" options={{ headerShown: false }} />
      <Stack.Screen name="inventory/add" options={{ headerShown: false, animation: "slide_from_bottom" }} />
      <Stack.Screen name="inventory/edit/[id]" options={{ headerShown: false, animation: "slide_from_bottom" }} />
      <Stack.Screen name="inventory/kit" options={{ headerShown: false, animation: "slide_from_bottom" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
              <UserProfileProvider>
                <GuideStoreProvider>
                  <ChatProvider>
                    <KnowledgeProvider>
                      <InventoryProvider>
                        <RootLayoutNav />
                      </InventoryProvider>
                    </KnowledgeProvider>
                  </ChatProvider>
                </GuideStoreProvider>
              </UserProfileProvider>
            </ThemeProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
