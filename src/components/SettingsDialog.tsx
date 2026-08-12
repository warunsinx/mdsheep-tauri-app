import { useEffect, useId, useRef, useState } from "react";
import { Settings, X } from "lucide-react";
import type { EditorSettings, LineHeight } from "@/lib/settings";

interface SettingsDialogProps {
  settings: EditorSettings;
  onChange: (patch: Partial<EditorSettings>) => void;
  onReset: () => void;
}

export function SettingsDialog({ settings, onChange, onReset }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button, input, select")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button, input, select")];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const setNumber = (key: "editorFontSize" | "previewFontSize") => (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ [key]: Number(event.target.value) });

  return (
    <>
      <button ref={triggerRef} type="button" className="icon-button" aria-label="Settings" title="Settings" onClick={() => setOpen(true)}>
        <Settings className="size-4" aria-hidden="true" />
      </button>
      {open && (
        <div className="settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="settings-dialog">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <div><h2 id={titleId} className="text-lg font-semibold">Settings</h2><p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">Tune your writing space.</p></div>
              <button type="button" className="icon-button" aria-label="Close settings" onClick={close}><X className="size-4" aria-hidden="true" /></button>
            </div>
            <div className="space-y-5 overflow-y-auto px-5 py-5">
              <Range label="Editor font size" min={16} max={24} value={settings.editorFontSize} onChange={setNumber("editorFontSize")} />
              <Range label="Preview font size" min={14} max={22} value={settings.previewFontSize} onChange={setNumber("previewFontSize")} />
              <label className="block text-sm font-medium">Line spacing
                <select className="settings-select mt-2" value={settings.lineHeight} onChange={(event) => onChange({ lineHeight: event.target.value as LineHeight })}>
                  <option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="relaxed">Relaxed</option>
                </select>
              </label>
              <div className="space-y-2">
                <Switch label="Word wrap" checked={settings.wordWrap} onChange={(wordWrap) => onChange({ wordWrap })} />
                <Switch label="Spellcheck" checked={settings.spellcheck} onChange={(spellcheck) => onChange({ spellcheck })} />
                <Switch label="Show word and line stats" checked={settings.showStats} onChange={(showStats) => onChange({ showStats })} />
              </div>
            </div>
            <div className="flex justify-between border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <button type="button" className="settings-button" onClick={onReset}>Reset defaults</button>
              <button type="button" className="settings-button settings-button-primary" onClick={close}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Range({ label, ...props }: { label: string; min: number; max: number; value: number; onChange: React.ChangeEventHandler<HTMLInputElement> }) {
  return <label className="block text-sm font-medium"><span className="flex justify-between"><span>{label}</span><output className="tabular-nums text-neutral-500 dark:text-neutral-400">{props.value} px</output></span><input type="range" aria-label={label} className="settings-range mt-3" {...props} /></label>;
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between rounded-lg px-1 py-2 text-sm font-medium"><span>{label}</span><span className="settings-switch"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span aria-hidden="true" /></span></label>;
}
