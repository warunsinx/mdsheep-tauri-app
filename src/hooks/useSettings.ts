import { useEffect, useRef, useState } from "react";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type EditorSettings } from "@/lib/settings";

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
    save: () => {
      savedSettings.current = { ...settings };
      saveSettings(settings);
    },
    restore: () => setSettings({ ...savedSettings.current }),
  };
}
