import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_THEME_PRESET, THEME_PRESETS, THEME_PRESET_STORAGE_KEY, loadThemePreset, saveThemePreset, validateThemePreset } from "@/lib/theme-presets";

function luminance(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g)!.map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: string, background: string) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("whole-application theme presets", () => {
  beforeEach(() => localStorage.clear());

  it("defines six named light/dark semantic palettes", () => {
    expect(THEME_PRESETS.map(({ id }) => id)).toEqual(["default", "gruvbox", "nord", "dracula", "solarized", "tokyo-night"]);
    for (const preset of THEME_PRESETS) for (const mode of ["light", "dark"] as const)
      expect(Object.keys(preset.palettes[mode])).toEqual(expect.arrayContaining(["app", "chrome", "panel", "elevated", "subtle", "text", "muted", "border", "code", "codeText", "accent", "focus", "accentText", "accentSolid", "accentSoft", "selection"]));
  });

  it("keeps normal text and primary button labels at WCAG AA contrast in every palette", () => {
    for (const preset of THEME_PRESETS) for (const mode of ["light", "dark"] as const) {
      const palette = preset.palettes[mode];
      for (const surface of ["app", "chrome", "panel", "elevated", "subtle"] as const) {
        expect(contrast(palette.text, palette[surface]), `${preset.id} ${mode} primary text on ${surface}`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette.muted, palette[surface]), `${preset.id} ${mode} muted text on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(palette.accentText, palette.panel), `${preset.id} ${mode} accent text`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette.accentContrast, palette.accentSolid), `${preset.id} ${mode} primary button`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("validates values and persists a clean versioned record", () => {
    expect(validateThemePreset("nord")).toBe("nord");
    expect(validateThemePreset("ocean")).toBe(DEFAULT_THEME_PRESET);
    expect(saveThemePreset("gruvbox")).toBe(true);
    expect(JSON.parse(localStorage.getItem(THEME_PRESET_STORAGE_KEY)!)).toEqual({ version: 1, preset: "gruvbox" });
  });

  it("migrates either old accent key to Default and only removes it after a successful write", () => {
    localStorage.setItem("md-editor:accent-preset:v1", JSON.stringify({ version: 1, preset: "grape" }));
    expect(loadThemePreset()).toBe("default");
    expect(localStorage.getItem("md-editor:accent-preset:v1")).toBeNull();
    localStorage.clear();
    localStorage.setItem("md-editor:accent-preset", "forest");
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation((key) => { if (key === THEME_PRESET_STORAGE_KEY) throw new Error("quota"); });
    expect(loadThemePreset()).toBe("default");
    expect(localStorage.getItem("md-editor:accent-preset")).toBe("forest");
    spy.mockRestore();
  });
});
