import { ExportButton } from "./ExportButton";
import { OpenButton } from "./OpenButton";
import { ThemeToggle } from "./ThemeToggle";
import { SettingsDialog } from "./SettingsDialog";
import { FormatToolbar } from "./FormatToolbar";
import { ViewModeToggle } from "./ViewModeToggle";
import type { EditorSettings } from "@/lib/settings";
import type { CommandId } from "@/lib/markdown-commands";
import type { ThemePreset } from "@/lib/theme-presets";

interface ToolbarProps {
  markdown: string;
  editRadioId: string;
  previewRadioId: string;
  onOpen: (markdown: string) => void;
  settings: EditorSettings;
  onSettingsChange: (patch: Partial<EditorSettings>) => void;
  onSettingsReset: () => void;
  onSettingsSave: () => boolean;
  onSettingsCancel: () => void;
  onCommand: (id: CommandId) => void;
  formattingDisabled?: boolean;
  ratio: number;
  onRatioSelect: (ratio: number) => void;
  preset: ThemePreset; onPresetChange: (preset: ThemePreset) => void;
}

export function Toolbar({ markdown, editRadioId, previewRadioId, onOpen, settings, onSettingsChange, onSettingsReset, onSettingsSave, onSettingsCancel, onCommand, formattingDisabled = false, ratio, onRatioSelect, preset, onPresetChange }: ToolbarProps) {
  return (
    <header className="editor-toolbar z-10 shrink-0">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-5">
        <div className="toolbar-brand flex min-w-0 items-center gap-2.5">
          <span
            className="brand-badge grid h-7 min-w-10 place-items-center rounded-md border px-1.5 font-mono text-[10px] font-extrabold tracking-tight"
            aria-hidden="true"
          >
            [MD]
          </span>
          <span className="toolbar-brand-name hidden truncate text-sm font-semibold tracking-tight md:inline" aria-hidden="true">Sheep</span>
          <span className="sr-only">MdSheep</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <SettingsDialog settings={settings} onChange={onSettingsChange} onReset={onSettingsReset} onSave={onSettingsSave} onCancel={onSettingsCancel} preset={preset} onPresetChange={onPresetChange} />
          <OpenButton onOpen={onOpen} />
          <ExportButton markdown={markdown} />
        </div>
      </div>
      <div className="format-bar border-t border-neutral-100 dark:border-neutral-900">
        <FormatToolbar onCommand={onCommand} disabled={formattingDisabled} />
        <ViewModeToggle ratio={ratio} onSelect={onRatioSelect} />
      </div>
      <div className="border-t border-neutral-100 px-4 py-2 md:hidden dark:border-neutral-900">
        <div className="pane-mode-switcher grid grid-cols-2 rounded-md p-0.5" aria-label="Editor view">
          <label htmlFor={editRadioId} className="pane-label-edit pane-mode-label">Edit</label>
          <label htmlFor={previewRadioId} className="pane-label-preview pane-mode-label">Preview</label>
        </div>
      </div>
    </header>
  );
}
