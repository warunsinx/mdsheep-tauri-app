import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/globals.css"), "utf8");

describe("semantic whole-theme surface contract", () => {
  it.each([
    ['[data-theme-preset="gruvbox"]', "--app-bg:#fbf1c7", "--text-primary:#3c3836", "--border:#d5c4a1", "--accent:#b57614"],
    ['.dark[data-theme-preset="gruvbox"]', "--app-bg:#282828", "--text-primary:#ebdbb2", "--border:#504945", "--accent:#fabd2f"],
    ['[data-theme-preset="nord"]', "--app-bg:#eceff4", "--text-primary:#2e3440", "--border:#d8dee9", "--accent:#5e81ac"],
    ['.dark[data-theme-preset="nord"]', "--app-bg:#2e3440", "--text-primary:#eceff4", "--border:#4c566a", "--accent:#88c0d0"],
  ])("defines representative background/text/border/accent values for %s", (selector, ...tokens) => {
    const rule = css.slice(css.indexOf(selector), css.indexOf("}", css.indexOf(selector)) + 1);
    for (const token of tokens) expect(rule).toContain(token);
  });

  it("keeps obsolete accent-only preset selectors and classes out of active UI", () => {
    const active = ["src/components/SettingsDialog.tsx", "src/context/ThemeContext.tsx", "src/globals.css"]
      .map((path) => readFileSync(resolve(process.cwd(), path), "utf8")).join("\n");
    expect(active).not.toMatch(/data-accent|accent-(chooser|option|swatch)|\b(Ocean|Forest|Grape|Rose|Graphite)\b/);
  });
});
