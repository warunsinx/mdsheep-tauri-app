import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PANE_RATIO, clampPaneRatio, loadPaneRatio, savePaneRatio, snapPaneRatio } from "@/lib/pane-split";

export function usePaneSplit() {
  const [ratio, setRatioState] = useState(DEFAULT_PANE_RATIO);

  useEffect(() => {
    const timer = window.setTimeout(() => setRatioState(loadPaneRatio()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const setRatio = useCallback((nextRatio: number) => {
    const clampedRatio = clampPaneRatio(nextRatio);
    setRatioState(clampedRatio);
  }, []);

  const commitRatio = useCallback((nextRatio: number) => {
    const snappedRatio = snapPaneRatio(nextRatio);
    setRatioState(snappedRatio);
    savePaneRatio(snappedRatio);
  }, []);

  return { ratio, setRatio, commitRatio };
}
