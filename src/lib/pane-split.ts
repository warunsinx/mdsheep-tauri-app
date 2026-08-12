export const MIN_PANE_RATIO = 0;
export const MAX_PANE_RATIO = 100;
export const DEFAULT_PANE_RATIO = 50;
export const SNAP_POINTS = [0, 25, 50, 75, 100] as const;
export const LEGACY_PANE_RATIO_STORAGE_KEY = "md-editor:pane-ratio:v1";
export const PANE_RATIO_STORAGE_KEY = "md-editor:pane-ratio:v2";

export function clampPaneRatio(ratio: number) {
  return Math.min(MAX_PANE_RATIO, Math.max(MIN_PANE_RATIO, ratio));
}

export function snapPaneRatio(ratio: number) {
  const clamped = clampPaneRatio(ratio);
  return SNAP_POINTS.reduce((nearest, point) =>
    Math.abs(point - clamped) < Math.abs(nearest - clamped) ? point : nearest,
  );
}

export function loadPaneRatio() {
  const stored = window.localStorage.getItem(PANE_RATIO_STORAGE_KEY);
  if (stored !== null && stored.trim() !== "") {
    const ratio = Number(stored);
    return SNAP_POINTS.some((point) => point === ratio) ? ratio : DEFAULT_PANE_RATIO;
  }

  const legacy = window.localStorage.getItem(LEGACY_PANE_RATIO_STORAGE_KEY);
  if (legacy === null || legacy.trim() === "") return DEFAULT_PANE_RATIO;
  const legacyRatio = Number(legacy);
  if (!Number.isFinite(legacyRatio) || legacyRatio < 25 || legacyRatio > 75) return DEFAULT_PANE_RATIO;
  const migrated = snapPaneRatio(legacyRatio);
  savePaneRatio(migrated);
  return migrated;
}

export function savePaneRatio(ratio: number) {
  window.localStorage.setItem(PANE_RATIO_STORAGE_KEY, String(snapPaneRatio(ratio)));
}
