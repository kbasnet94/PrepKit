import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import Colors from "@/constants/colors";

type ColorPalette = typeof Colors.light;
type ThemeMode = "system" | "light" | "dark";
type ResolvedMode = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: ResolvedMode;
  colors: ColorPalette;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const STORAGE_KEY = "northkeep_theme_mode";

const ThemeContext = createContext<ThemeContextValue>({
  mode: "system",
  resolvedMode: "dark",
  colors: Colors.dark,
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "system" || saved === "dark" || saved === "light") {
        setModeState(saved as ThemeMode);
      }
    });
  }, []);

  const resolvedMode: ResolvedMode =
    mode === "system" ? (systemScheme === "light" ? "light" : "dark") : mode;

  const setTheme = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState((prev) => {
      const order: ThemeMode[] = ["system", "light", "dark"];
      const next = order[(order.indexOf(prev) + 1) % order.length];
      AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedMode,
      colors: Colors[resolvedMode] || Colors.dark,
      isDark: resolvedMode === "dark",
      toggleTheme,
      setTheme,
    }),
    [mode, resolvedMode, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
