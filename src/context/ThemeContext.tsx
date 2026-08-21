import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { THEME_STORAGE_KEY } from "@/lib/constants";
import { applyAppearance, loadTheme, type ResolvedTheme, type ThemePreference } from "@/lib/theme";
import { DEFAULT_THEME_PRESET, loadThemePreset, saveThemePreset, type ThemePreset } from "@/lib/theme-presets";

interface ThemeValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (theme: ThemePreference) => void;
  preset: ThemePreset; setPreset: (preset: ThemePreset) => void; savePreset: () => boolean; restorePreset: () => void; resetPreset: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("light");
  const [initialized, setInitialized] = useState(false);
  const [preset, setPreset] = useState<ThemePreset>(DEFAULT_THEME_PRESET);
  const savedPreset = useRef<ThemePreset>(DEFAULT_THEME_PRESET);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPreferenceState(loadTheme());
      const loadedPreset = loadThemePreset(); savedPreset.current = loadedPreset; setPreset(loadedPreset);
      setInitialized(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const resolved: ResolvedTheme = preference;
  useEffect(() => {
    if (!initialized) return;
    applyAppearance(resolved, preset);
  }, [preset, initialized, resolved]);

  const setPreference = (theme: ThemePreference) => {
    setPreferenceState(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The theme still applies for this session when storage is unavailable.
    }
  };

  const value = useMemo(() => ({
    preference,
    resolved,
    setPreference,
    preset, setPreset,
    savePreset: () => {
      const persisted = saveThemePreset(preset);
      if (persisted) savedPreset.current = preset;
      return persisted;
    },
    restorePreset: () => setPreset(savedPreset.current), resetPreset: () => setPreset(DEFAULT_THEME_PRESET),
  }), [preset, preference, resolved]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
