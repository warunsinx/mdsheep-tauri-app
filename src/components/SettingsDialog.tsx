import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Settings, X } from "lucide-react";
import type { EditorSettings, LineHeight } from "@/lib/settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface SettingsDialogProps {
  settings: EditorSettings;
  onChange: (patch: Partial<EditorSettings>) => void;
  onReset: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const focusableSelector = "button, input, select, [tabindex]:not([tabindex='-1'])";

export function SettingsDialog({ settings, onChange, onReset, onSave, onCancel }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const finishClose = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  const cancel = useCallback(() => {
    onCancel();
    finishClose();
  }, [finishClose, onCancel]);

  const save = useCallback(() => {
    onSave();
    finishClose();
  }, [finishClose, onSave]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)];
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
  }, [cancel, open]);

  return (
    <>
      <button ref={triggerRef} type="button" className="icon-button" aria-label="Settings" title="Settings" onClick={() => setOpen(true)}>
        <Settings className="size-4" aria-hidden="true" />
      </button>
      {open && (
        <div className="settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) cancel(); }}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="settings-dialog">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <div><h2 id={titleId} className="text-lg font-semibold">Settings</h2><p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">Tune your writing space.</p></div>
              <button type="button" className="icon-button" aria-label="Close settings" onClick={cancel}><X className="size-4" aria-hidden="true" /></button>
            </div>
            <div className="space-y-6 overflow-y-auto px-5 py-5">
              <section aria-labelledby={`${titleId}-type`} className="space-y-5">
                <div>
                  <h3 id={`${titleId}-type`} className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">Typography</h3>
                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">Adjust how your document reads while you work.</p>
                </div>
                <Range label="Editor font size" min={16} max={24} value={settings.editorFontSize} onChange={(editorFontSize) => onChange({ editorFontSize })} />
                <Range label="Preview font size" min={14} max={22} value={settings.previewFontSize} onChange={(previewFontSize) => onChange({ previewFontSize })} />
                <LineHeightSelect value={settings.lineHeight} onChange={(lineHeight) => onChange({ lineHeight })} />
              </section>

              <section aria-labelledby={`${titleId}-editor`} className="space-y-3">
                <div>
                  <h3 id={`${titleId}-editor`} className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">Editor</h3>
                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">Choose the helpers that stay active as you type.</p>
                </div>
                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50/70 px-3 dark:border-neutral-800 dark:bg-neutral-900/60">
                  <SwitchSetting label="Word wrap" description="Keep long lines inside the editor pane." checked={settings.wordWrap} onChange={(wordWrap) => onChange({ wordWrap })} />
                  <SwitchSetting label="Spellcheck" description="Use your system spelling suggestions." checked={settings.spellcheck} onChange={(spellcheck) => onChange({ spellcheck })} />
                  <SwitchSetting label="Show word and line stats" description="Display document counts in the toolbar." checked={settings.showStats} onChange={(showStats) => onChange({ showStats })} />
                </div>
              </section>
            </div>
            <div className="flex justify-between border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <button type="button" className="settings-button" onClick={onReset}>Reset defaults</button>
              <button type="button" className="settings-button settings-button-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Range({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (value: number) => void }) {
  return (
    <div className="text-sm font-medium">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <output className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs tabular-nums text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{value} px</output>
      </div>
      <Slider aria-label={label} min={min} max={max} step={1} value={[value]} onValueChange={([nextValue]) => onChange(nextValue)} className="mt-2" />
      <div aria-hidden="true" className="mt-0.5 flex justify-between text-[10px] tabular-nums text-neutral-400 dark:text-neutral-500"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}

function LineHeightSelect({ value, onChange }: { value: LineHeight; onChange: (value: LineHeight) => void }) {
  const labelId = useId();
  return (
    <div>
      <label id={labelId} className="mb-2 block text-sm font-medium">Line spacing</label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as LineHeight)}>
        <SelectTrigger aria-labelledby={labelId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="compact">Compact</SelectItem>
          <SelectItem value="comfortable">Comfortable</SelectItem>
          <SelectItem value="relaxed">Relaxed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function SwitchSetting({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const labelId = useId();
  const descriptionId = useId();
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-200 py-3.5 last:border-b-0 dark:border-neutral-800">
      <div>
        <div id={labelId} className="text-sm font-medium">{label}</div>
        <div id={descriptionId} className="mt-0.5 text-xs leading-5 text-neutral-500 dark:text-neutral-400">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-labelledby={labelId} aria-describedby={descriptionId} />
    </div>
  );
}
