import { beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY } from "@/lib/constants";
import { themeScript } from "@/lib/theme-script";

describe("pre-hydration theme script", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = "";
  });

  it.each([
    { stored: null, systemDark: true, expected: "dark" },
    { stored: null, systemDark: false, expected: "light" },
    { stored: "dark", systemDark: false, expected: "dark" },
    { stored: "light", systemDark: true, expected: "light" },
    { stored: "system", systemDark: true, expected: "dark" },
    { stored: "system", systemDark: false, expected: "light" },
  ])("uses $expected for stored=$stored and systemDark=$systemDark", ({ stored, systemDark, expected }) => {
    if (stored !== null) localStorage.setItem(THEME_STORAGE_KEY, stored);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: systemDark })));

    Function(themeScript)();

    expect(document.documentElement.dataset.theme).toBe(expected);
    expect(document.documentElement.classList.contains("dark")).toBe(expected === "dark");
    expect(document.documentElement.style.colorScheme).toBe(expected);
    vi.unstubAllGlobals();
  });
});
