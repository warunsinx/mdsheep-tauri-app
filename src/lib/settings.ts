export const SETTINGS_STORAGE_KEY = "md-editor:settings:v1";

export type LineHeight = "compact" | "comfortable" | "relaxed";

export interface EditorSettings {
  editorFontSize: number;
  previewFontSize: number;
  lineHeight: LineHeight;
  wordWrap: boolean;
  spellcheck: boolean;
  showStats: boolean;
}

export const DEFAULT_SETTINGS: Readonly<EditorSettings> = {
  editorFontSize: 16,
  previewFontSize: 16,
  lineHeight: "comfortable",
  wordWrap: true,
  spellcheck: true,
  showStats: true,
};

export const LINE_HEIGHT_VALUES: Record<LineHeight, number> = {
  compact: 1.35,
  comfortable: 1.5,
  relaxed: 1.75,
};

const isIntegerInRange = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) && Number(value) >= min && Number(value) <= max;

export function validateSettings(value: unknown): EditorSettings {
  if (
    typeof value === "object" && value !== null &&
    "editorFontSize" in value && isIntegerInRange(value.editorFontSize, 16, 24) &&
    "previewFontSize" in value && isIntegerInRange(value.previewFontSize, 14, 22) &&
    "lineHeight" in value && ["compact", "comfortable", "relaxed"].includes(String(value.lineHeight)) &&
    "wordWrap" in value && typeof value.wordWrap === "boolean" &&
    "spellcheck" in value && typeof value.spellcheck === "boolean" &&
    "showStats" in value && typeof value.showStats === "boolean"
  ) return { ...value } as EditorSettings;
  return { ...DEFAULT_SETTINGS };
}

export function loadSettings(): EditorSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const stored: unknown = JSON.parse(raw);
    if (typeof stored === "object" && stored !== null && "version" in stored && stored.version === 1 && "settings" in stored) {
      return validateSettings(stored.settings);
    }
  } catch {
    // Storage may be unavailable or contain malformed JSON.
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: EditorSettings): void {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 1, settings: validateSettings(settings) }));
}

export function resetSettings(): EditorSettings {
  if (typeof window !== "undefined") window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
  return { ...DEFAULT_SETTINGS };
}
