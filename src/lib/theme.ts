import { THEME_STORAGE_KEY } from "./constants";

export type ThemePreference = "light" | "dark";
export type ResolvedTheme = ThemePreference;

export const THEMES: ThemePreference[] = ["light", "dark"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference;
}

export function loadTheme(systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : systemIsDark ? "dark" : "light";
  } catch {
    return systemIsDark ? "dark" : "light";
  }
}

export function nextTheme(theme: ThemePreference): ThemePreference {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
}
