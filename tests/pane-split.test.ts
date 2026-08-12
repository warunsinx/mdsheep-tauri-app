import { describe, expect, it } from "vitest";
import {
  DEFAULT_PANE_RATIO,
  PANE_RATIO_STORAGE_KEY,
  LEGACY_PANE_RATIO_STORAGE_KEY,
  SNAP_POINTS,
  clampPaneRatio,
  loadPaneRatio,
  savePaneRatio,
  snapPaneRatio,
} from "@/lib/pane-split";

describe("pane split utilities", () => {
  it("clamps the editor ratio to the supported range", () => {
    expect(clampPaneRatio(-10)).toBe(0);
    expect(clampPaneRatio(42)).toBe(42);
    expect(clampPaneRatio(110)).toBe(100);
  });

  it("snaps continuous ratios to the nearest supported point", () => {
    expect(SNAP_POINTS).toEqual([0, 25, 50, 75, 100]);
    expect(snapPaneRatio(12)).toBe(0);
    expect(snapPaneRatio(13)).toBe(25);
    expect(snapPaneRatio(63)).toBe(75);
    expect(snapPaneRatio(99)).toBe(100);
  });

  it("persists and restores the ratio under a versioned key", () => {
    savePaneRatio(100);

    expect(PANE_RATIO_STORAGE_KEY).toBe("md-editor:pane-ratio:v2");
    expect(localStorage.getItem(PANE_RATIO_STORAGE_KEY)).toBe("100");
    expect(loadPaneRatio()).toBe(100);
  });

  it("migrates a valid v1 ratio by snapping it and persists v2", () => {
    localStorage.setItem(LEGACY_PANE_RATIO_STORAGE_KEY, "62");
    expect(loadPaneRatio()).toBe(50);
    expect(localStorage.getItem(PANE_RATIO_STORAGE_KEY)).toBe("50");
  });

  it.each([null, "", "not-a-number", "101", "Infinity"])(
    "falls back to 50 for invalid stored value %s",
    (storedValue) => {
      if (storedValue !== null) localStorage.setItem(PANE_RATIO_STORAGE_KEY, storedValue);

      expect(loadPaneRatio()).toBe(DEFAULT_PANE_RATIO);
    },
  );
});
