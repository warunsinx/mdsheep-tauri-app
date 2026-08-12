import { describe, expect, it } from "vitest";
import { nextTheme, resolveTheme } from "@/lib/theme";

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
});
