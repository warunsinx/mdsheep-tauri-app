import { useEffect, useRef, useState } from "react";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, loadSettings, saveSettings, type EditorSettings } from "@/lib/settings";

export function useSettings() {
  const [settings, setSettings] = useState<EditorSettings>({ ...DEFAULT_SETTINGS });
  const savedSettings = useRef<EditorSettings>({ ...DEFAULT_SETTINGS });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loaded = loadSettings();
      savedSettings.current = loaded;
      setSettings(loaded);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return {
    settings,
    updateSettings: (patch: Partial<EditorSettings>) => setSettings((current) => ({ ...current, ...patch })),
    reset: () => setSettings({ ...DEFAULT_SETTINGS }),
    save: (saveRelated?: () => boolean) => {
      let previousRaw: string | null | undefined;
      try {
        previousRaw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        saveSettings(settings);
        if (saveRelated && !saveRelated()) {
          if (previousRaw === null) window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
          else window.localStorage.setItem(SETTINGS_STORAGE_KEY, previousRaw);
          return false;
        }
      } catch {
        try {
          if (previousRaw === null) window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
          else if (previousRaw !== undefined) window.localStorage.setItem(SETTINGS_STORAGE_KEY, previousRaw);
        } catch {
          // Best-effort rollback when storage itself is unavailable.
        }
        return false;
      }
      savedSettings.current = { ...settings };
      return true;
    },
    restore: () => setSettings({ ...savedSettings.current }),
  };
}
