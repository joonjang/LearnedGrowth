import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Appearance } from "react-native";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ThemePreference = "light" | "dark";

type PreferencesContextShape = {
  loading: boolean;
  error: string | null;
  showAiAnalysis: boolean;
  hapticsEnabled: boolean;
  hapticsAvailable: boolean;
  theme: ThemePreference;
  setShowAiAnalysis: (next: boolean) => Promise<void>;
  setHapticsEnabled: (next: boolean) => Promise<void>;
  setTheme: (next: ThemePreference) => Promise<void>;
  triggerHaptic: () => Promise<void>;
  clearError: () => void;
};

const STORAGE_KEYS = {
  showAnalysis: "prefs:showAiAnalysis",
  haptics: "prefs:haptics",
  theme: "prefs:theme",
} as const;

const PreferencesContext = createContext<PreferencesContextShape | null>(null);

const defaultTheme = (Appearance.getColorScheme?.() as ThemePreference | null) ?? "light";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAiAnalysis, setShowAiAnalysisState] = useState(true);
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [hapticsAvailable, setHapticsAvailable] = useState(true);
  const [theme, setThemeState] = useState<ThemePreference>(defaultTheme);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const available = await Haptics.isAvailableAsync();
        if (mounted) setHapticsAvailable(available);

        const entries = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS));
        const byKey = Object.fromEntries(entries);

        if (!mounted) return;

        setShowAiAnalysisState(byKey[STORAGE_KEYS.showAnalysis] !== "false");
        setHapticsEnabledState(
          available && byKey[STORAGE_KEYS.haptics] !== "false"
        );

        const storedTheme = byKey[STORAGE_KEYS.theme];
        if (storedTheme === "dark" || storedTheme === "light") {
          setThemeState(storedTheme);
          (Appearance as any)?.setColorScheme?.(storedTheme);
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? "Failed to load preferences");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const persistShowAnalysis = useCallback(async (next: boolean) => {
    setShowAiAnalysisState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.showAnalysis, String(next));
    } catch (err: any) {
      setError(err?.message ?? "Could not update AI setting");
    }
  }, []);

  const persistHaptics = useCallback(async (next: boolean) => {
    if (!hapticsAvailable) return;
    setHapticsEnabledState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.haptics, String(next));
      if (next) {
        Haptics.selectionAsync().catch(() => undefined);
      }
    } catch (err: any) {
      setError(err?.message ?? "Could not update haptics");
    }
  }, []);

  const persistTheme = useCallback(async (next: ThemePreference) => {
    setThemeState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.theme, next);
      (Appearance as any)?.setColorScheme?.(next);
    } catch (err: any) {
      setError(err?.message ?? "Could not update theme");
    }
  }, []);

  const triggerHaptic = useCallback(async () => {
    if (!hapticsEnabled || !hapticsAvailable) return;
    await Haptics.selectionAsync().catch(() => undefined);
  }, [hapticsAvailable, hapticsEnabled]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<PreferencesContextShape>(
    () => ({
      loading,
      error,
      showAiAnalysis,
      hapticsEnabled,
      hapticsAvailable,
      theme,
      setShowAiAnalysis: persistShowAnalysis,
      setHapticsEnabled: persistHaptics,
      setTheme: persistTheme,
      triggerHaptic,
      clearError,
    }),
    [
      clearError,
      error,
      hapticsAvailable,
      hapticsEnabled,
      loading,
      persistHaptics,
      persistShowAnalysis,
      persistTheme,
      showAiAnalysis,
      triggerHaptic,
      theme,
    ]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
