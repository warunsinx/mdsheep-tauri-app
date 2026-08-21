import { Columns2, PanelLeft, PanelRight } from "lucide-react";
import { MAX_PANE_RATIO, MIN_PANE_RATIO, DEFAULT_PANE_RATIO } from "@/lib/pane-split";

interface ViewModeToggleProps {
  ratio: number;
  onSelect: (ratio: number) => void;
}

// Each mode is an existing snap point, so selecting one reuses commitRatio and
// its persistence instead of introducing a second source of layout state.
const VIEW_MODES = [
  { label: "Editor only", ratio: MAX_PANE_RATIO, Icon: PanelLeft },
  { label: "Split view", ratio: DEFAULT_PANE_RATIO, Icon: Columns2 },
  { label: "Preview only", ratio: MIN_PANE_RATIO, Icon: PanelRight },
] as const;

export function ViewModeToggle({ ratio, onSelect }: ViewModeToggleProps) {
  return (
    <div role="group" aria-label="View mode" className="view-mode-group hidden md:flex">
      {VIEW_MODES.map((mode) => (
        <button
          key={mode.label}
          type="button"
          className="icon-button icon-button-sm"
          aria-label={mode.label}
          title={mode.label}
          aria-pressed={ratio === mode.ratio}
          onClick={() => onSelect(mode.ratio)}
        >
          <mode.Icon className="size-4" aria-hidden={true} />
        </button>
      ))}
    </div>
  );
}
