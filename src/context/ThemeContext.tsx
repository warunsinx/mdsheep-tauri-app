import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { THEME_STORAGE_KEY } from "@/lib/constants";
import { loadTheme, type ResolvedTheme, type ThemePreference } from "@/lib/theme";

interface ThemeValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("light");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPreferenceState(loadTheme());
      setInitialized(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const resolved: ResolvedTheme = preference;
  useEffect(() => {
    if (!initialized) return;
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
  }, [initialized, resolved]);

  const setPreference = (theme: ThemePreference) => {
    setPreferenceState(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The theme still applies for this session when storage is unavailable.
    }
  };

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
