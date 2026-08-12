import { ExportButton } from "./ExportButton";
import { OpenButton } from "./OpenButton";
import { ThemeToggle } from "./ThemeToggle";
import { SettingsDialog } from "./SettingsDialog";
import type { EditorSettings } from "@/lib/settings";

interface ToolbarProps {
  markdown: string;
  editRadioId: string;
  previewRadioId: string;
  onOpen: (markdown: string) => void;
  settings: EditorSettings;
  onSettingsChange: (patch: Partial<EditorSettings>) => void;
  onSettingsReset: () => void;
}

export function Toolbar({ markdown, editRadioId, previewRadioId, onOpen, settings, onSettingsChange, onSettingsReset }: ToolbarProps) {
  return (
    <header className="editor-toolbar z-10 shrink-0 border-b border-neutral-200 bg-white/95 dark:border-neutral-800 dark:bg-neutral-950/95">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-5">
        <div className="toolbar-brand flex min-w-0 items-center gap-2.5">
          <span
            className="grid h-7 min-w-10 place-items-center rounded-md border border-orange-200 bg-white px-1.5 font-mono text-[10px] font-extrabold tracking-tight text-orange-700 dark:border-orange-950 dark:bg-black dark:text-orange-500"
            aria-hidden="true"
          >
            [MD]
          </span>
          <span className="toolbar-brand-name hidden truncate text-sm font-semibold tracking-tight md:inline" aria-hidden="true">Sheep</span>
          <span className="sr-only">MdSheep</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <SettingsDialog settings={settings} onChange={onSettingsChange} onReset={onSettingsReset} />
          <OpenButton onOpen={onOpen} />
          <ExportButton markdown={markdown} />
        </div>
      </div>
      <div className="border-t border-neutral-100 px-4 py-2 md:hidden dark:border-neutral-900">
        <div className="grid grid-cols-2 rounded-md bg-neutral-100 p-0.5 dark:bg-neutral-900" aria-label="Editor view">
          <label htmlFor={editRadioId} className="pane-label-edit pane-mode-label">Edit</label>
          <label htmlFor={previewRadioId} className="pane-label-preview pane-mode-label">Preview</label>
        </div>
      </div>
    </header>
  );
}
