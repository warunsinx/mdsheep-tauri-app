import type { KeyboardEvent, PointerEvent } from "react";
import { DEFAULT_PANE_RATIO, MAX_PANE_RATIO, MIN_PANE_RATIO, SNAP_POINTS, clampPaneRatio, snapPaneRatio } from "@/lib/pane-split";

interface PaneResizerProps {
  ratio: number;
  onChange: (ratio: number) => void;
  onCommit?: (ratio: number) => void;
}

export function PaneResizer({ ratio, onChange, onCommit }: PaneResizerProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = SNAP_POINTS.indexOf(snapPaneRatio(ratio));
    const ratios: Record<string, number> = {
      ArrowLeft: SNAP_POINTS[Math.max(0, currentIndex - 1)] ?? MIN_PANE_RATIO,
      ArrowRight: SNAP_POINTS[Math.min(SNAP_POINTS.length - 1, currentIndex + 1)] ?? MAX_PANE_RATIO,
      Home: MIN_PANE_RATIO,
      End: MAX_PANE_RATIO,
    };
    if (!(event.key in ratios)) return;
    event.preventDefault();
    const nextRatio = clampPaneRatio(ratios[event.key]);
    onChange(nextRatio);
    onCommit?.(nextRatio);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const layout = event.currentTarget.parentElement;
    if (!layout) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    layout.classList.add("pane-is-dragging");

    let latestRatio = ratio;
    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const bounds = layout.getBoundingClientRect();
      latestRatio = clampPaneRatio(((moveEvent.clientX - bounds.left) / bounds.width) * 100);
      onChange(latestRatio);
      // Leaving an endpoint changes the React-owned layout class list. Restore
      // the transient drag marker after that update so the low-cost mask stays active.
      layout.classList.add("pane-is-dragging");
    };
    const finishDragging = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDragging);
      window.removeEventListener("pointercancel", finishDragging);
      layout.classList.remove("pane-is-dragging");
      const snappedRatio = snapPaneRatio(latestRatio);
      onChange(snappedRatio);
      onCommit?.(snappedRatio);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishDragging);
    window.addEventListener("pointercancel", finishDragging);
  };

  return (
    <div
      role="separator"
      aria-label="Resize editor and preview panes"
      aria-orientation="vertical"
      aria-valuemin={MIN_PANE_RATIO}
      aria-valuemax={MAX_PANE_RATIO}
      aria-valuenow={Math.round(ratio)}
      tabIndex={0}
      className="pane-resizer"
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onDoubleClick={() => { onChange(DEFAULT_PANE_RATIO); onCommit?.(DEFAULT_PANE_RATIO); }}
    >
      <span aria-hidden="true" />
    </div>
  );
}
