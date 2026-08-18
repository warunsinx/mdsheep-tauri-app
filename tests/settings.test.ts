import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  loadSettings,
  resetSettings,
  saveSettings,
  validateSettings,
} from "@/lib/settings";

describe("settings persistence", () => {
  it("validates a complete settings value", () => {
    const settings = {
      editorFontSize: 20,
      previewFontSize: 18,
      lineHeight: "relaxed" as const,
      wordWrap: false,
      spellcheck: false,
      showStats: false,
    };
    expect(validateSettings(settings)).toEqual(settings);
  });

  it("accepts the expanded editor and preview font-size boundaries", () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, editorFontSize: 36, previewFontSize: 12 })).toEqual({
      ...DEFAULT_SETTINGS,
      editorFontSize: 36,
      previewFontSize: 12,
    });
  });

  it.each([
    { editorFontSize: 15 },
    { editorFontSize: 37 },
    { editorFontSize: 20.5 },
    { previewFontSize: 11 },
    { previewFontSize: 37 },
    { lineHeight: "roomy" },
    { wordWrap: "yes" },
    { spellcheck: 1 },
    { showStats: null },
  ])("falls back completely for invalid or partial data: %o", (invalid) => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, ...invalid })).toEqual(DEFAULT_SETTINGS);
  });

  it("loads defaults for missing, corrupt, or incompatible stored data", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    localStorage.setItem(SETTINGS_STORAGE_KEY, "not-json");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 2, settings: DEFAULT_SETTINGS }));
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("saves and restores a versioned value", () => {
    const settings = { ...DEFAULT_SETTINGS, editorFontSize: 22, wordWrap: false };
    saveSettings(settings);
    expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!)).toEqual({ version: 1, settings });
    expect(loadSettings()).toEqual(settings);
  });

  it("resets storage and returns fresh defaults", () => {
    saveSettings({ ...DEFAULT_SETTINGS, showStats: false });
    const reset = resetSettings();
    expect(reset).toEqual(DEFAULT_SETTINGS);
    expect(reset).not.toBe(DEFAULT_SETTINGS);
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
  });
});
