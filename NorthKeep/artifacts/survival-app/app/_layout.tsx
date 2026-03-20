import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
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

  // Still loading onboarding state — show nothing (splash is still visible)
  if (onboardingCompleted === null) return null;

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      {!onboardingCompleted && (
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      )}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="knowledge/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="guides/[slug]" options={{ headerShown: false }} />
      <Stack.Screen
        name="inventory/add"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.85],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="inventory/edit/[id]"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.85],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="inventory/kit"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.4],
          sheetGrabberVisible: true,
          headerShown: false,
        }}
      />
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
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
