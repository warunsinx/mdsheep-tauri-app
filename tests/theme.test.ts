import { describe, expect, it } from "vitest";
import { applyAppearance, nextTheme, resolveTheme } from "@/lib/theme";

describe("theme utilities", () => {
  it.each([
    ["light", "light"],
    ["dark", "dark"],
  ] as const)("resolves %s", (preference, expected) => {
    expect(resolveTheme(preference)).toBe(expected);
  });

  it("toggles between light and dark", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });

  it("applies light/dark and a validated whole-app preset to the document root", () => {
    applyAppearance("dark", "nord");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.themePreset).toBe("nord");
    expect(document.documentElement.style.colorScheme).toBe("dark");

    applyAppearance("light", "not-a-preset");
    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement.dataset.themePreset).toBe("default");
  });
});
