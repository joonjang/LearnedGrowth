import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Localization from "expo-localization";
import i18n from "@/lib/i18n";
import { Appearance, Platform } from "react-native";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ThemePreference = "light" | "dark" | "system";
type LanguagePreference = "system" | "en" | "ko";

type PreferencesContextShape = {
  loading: boolean;
  error: string | null;
  hapticsEnabled: boolean;
  hapticsAvailable: boolean;
  theme: "light" | "dark";
  themePreference: ThemePreference;
  language: "en" | "ko";
  languagePreference: LanguagePreference;
  setHapticsEnabled: (next: boolean) => Promise<void>;
  setTheme: (next: ThemePreference) => Promise<void>;
  setLanguage: (next: LanguagePreference) => Promise<void>;
  triggerHaptic: () => Promise<void>;
  clearError: () => void;
};

const STORAGE_KEYS = {
  haptics: "prefs:haptics",
  theme: "prefs:theme",
  language: "prefs:language",
} as const;

const PreferencesContext = createContext<PreferencesContextShape | null>(null);

const defaultTheme =
  (Appearance.getColorScheme?.() as "light" | "dark" | null) ?? "light";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [hapticsAvailable, setHapticsAvailable] = useState(true);
  const [theme, setThemeState] = useState<"light" | "dark">(defaultTheme);
  const [themePreference, setThemePreference] =
    useState<ThemePreference>("system");
  const [language, setLanguageState] = useState<"en" | "ko">("en");
  const [languagePreference, setLanguagePreference] =
    useState<LanguagePreference>("system");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const available = Platform.OS !== "web";
        if (mounted) setHapticsAvailable(available);

        const entries = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS));
        const byKey = Object.fromEntries(entries);

        if (!mounted) return;

        setHapticsEnabledState(
          available && byKey[STORAGE_KEYS.haptics] !== "false"
        );

        const storedTheme = byKey[STORAGE_KEYS.theme];
        if (storedTheme === "dark" || storedTheme === "light") {
          setThemePreference(storedTheme);
          setThemeState(storedTheme);
          (Appearance as any)?.setColorScheme?.(storedTheme);
        } else if (storedTheme === "system") {
          setThemePreference("system");
          const systemTheme =
            (Appearance.getColorScheme?.() as "light" | "dark" | null) ??
            "light";
          setThemeState(systemTheme);
          try {
            (Appearance as any)?.setColorScheme?.(null);
          } catch {
            // noop
          }
        }

        const storedLanguage = byKey[STORAGE_KEYS.language];
        if (storedLanguage === "en" || storedLanguage === "ko") {
          setLanguagePreference(storedLanguage);
          setLanguageState(storedLanguage);
          i18n.changeLanguage(storedLanguage).catch(() => undefined);
        } else {
          setLanguagePreference("system");
          const deviceLang =
            Localization.getLocales?.()?.[0]?.languageCode === "ko" ? "ko" : "en";
          setLanguageState(deviceLang);
          i18n.changeLanguage(deviceLang).catch(() => undefined);
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

  useEffect(() => {
    if (themePreference !== "system") return;
    const subscription = Appearance.addChangeListener?.(({ colorScheme }) => {
      if (colorScheme === "dark" || colorScheme === "light") {
        setThemeState(colorScheme);
      }
    });
    return () => subscription?.remove?.();
  }, [themePreference]);

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
  }, [hapticsAvailable]);

  const persistTheme = useCallback(async (next: ThemePreference) => {
    setThemePreference(next);
    if (next === "system") {
      const systemTheme =
        (Appearance.getColorScheme?.() as "light" | "dark" | null) ?? "light";
      setThemeState(systemTheme);
      try {
        (Appearance as any)?.setColorScheme?.(null);
      } catch {
        // noop
      }
    } else {
      setThemeState(next);
      (Appearance as any)?.setColorScheme?.(next);
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.theme, next);
    } catch (err: any) {
      setError(err?.message ?? "Could not update theme");
    }
  }, []);

  const persistLanguage = useCallback(async (next: LanguagePreference) => {
    setLanguagePreference(next);
    const resolved =
      next === "system"
        ? (Localization.getLocales?.()?.[0]?.languageCode === "ko" ? "ko" : "en")
        : next;
    setLanguageState(resolved);
    try {
      await i18n.changeLanguage(resolved);
      await AsyncStorage.setItem(STORAGE_KEYS.language, next);
    } catch (err: any) {
      setError(err?.message ?? "Could not update language");
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
      hapticsEnabled,
      hapticsAvailable,
      theme,
      themePreference,
      language,
      languagePreference,
      setHapticsEnabled: persistHaptics,
      setTheme: persistTheme,
      setLanguage: persistLanguage,
      triggerHaptic,
      clearError,
    }),
    [
      clearError,
      error,
      hapticsAvailable,
      hapticsEnabled,
      loading,
      language,
      languagePreference,
      persistHaptics,
      persistLanguage,
      persistTheme,
      triggerHaptic,
      theme,
      themePreference,
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
