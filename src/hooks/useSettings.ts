import { useEffect, useRef, useState } from "react";
import { DEFAULT_SETTINGS, loadSettings, resetSettings, saveSettings, type EditorSettings } from "@/lib/settings";

export function useSettings() {
  const [settings, setSettings] = useState<EditorSettings>({ ...DEFAULT_SETTINGS });
  const hydrated = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSettings(loadSettings());
      hydrated.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated.current) saveSettings(settings);
  }, [settings]);

  return {
    settings,
    updateSettings: (patch: Partial<EditorSettings>) => setSettings((current) => ({ ...current, ...patch })),
    reset: () => setSettings(resetSettings()),
  };
}
