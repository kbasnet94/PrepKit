import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect, useCallback } from "react";
import type { AIRewriteMode } from "./types";

const STORAGE_KEY = "@prepkit/ai_rewrite_mode";

export function useAIMode(): {
  mode: AIRewriteMode;
  setMode: (m: AIRewriteMode) => Promise<void>;
  isLoading: boolean;
} {
  const [mode, setModeState] = useState<AIRewriteMode>("off");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === "assistive" || v === "off") setModeState(v);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setMode = useCallback(async (m: AIRewriteMode) => {
    setModeState(m);
    await AsyncStorage.setItem(STORAGE_KEY, m);
  }, []);

  return { mode, setMode, isLoading };
}
