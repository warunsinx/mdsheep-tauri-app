import { memo } from "react";
import { LINE_HEIGHT_VALUES, type EditorSettings } from "@/lib/settings";

interface EditorPaneProps {
  value: string;
  onChange: (value: string) => void;
  settings: EditorSettings;
  collapsed?: boolean;
  onReopen?: () => void;
  onExpand?: () => void;
}

export const EditorPane = memo(function EditorPane({ value, onChange, settings, collapsed = false, onReopen, onExpand }: EditorPaneProps) {
  return (
    <section id="edit-panel" aria-label="Markdown source" className={`editor-pane flex min-h-0 flex-1 flex-col bg-neutral-50/50 dark:bg-neutral-950${collapsed ? " pane-collapsed" : ""}`}>
      <div className={`pane-content-shell${collapsed ? " pane-content-shell-collapsed" : ""}`} aria-hidden={collapsed}>
        {onExpand ? (
          <button type="button" className="pane-heading pane-heading-button" aria-label="Expand Markdown pane" onClick={onExpand}>
            <span className="pane-heading-title">Markdown</span>
          </button>
        ) : <div className="pane-heading"><span className="pane-heading-title">Markdown</span></div>}
        <label htmlFor="markdown-editor" className="sr-only">Markdown editor</label>
        <textarea
          id="markdown-editor"
          data-pane-content="editor"
          value={value}
          onChange={(event) => onChange(event.target.value)}

          tabIndex={collapsed ? -1 : undefined}
          spellCheck={settings.spellcheck}
          wrap={settings.wordWrap ? "soft" : "off"}
          style={{ fontSize: `${settings.editorFontSize}px`, lineHeight: LINE_HEIGHT_VALUES[settings.lineHeight], overflowX: settings.wordWrap ? "hidden" : "auto" }}
          className="editor-scroll min-h-0 flex-1 resize-none bg-transparent px-5 py-6 font-mono text-neutral-800 caret-orange-600 outline-none placeholder:text-neutral-400 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-600 md:px-8 dark:text-neutral-200"
        />
      </div>
      <button type="button" className="pane-rail pane-rail-left" aria-label={collapsed ? "Reopen Markdown editor" : undefined} onClick={onReopen}>
        <span className="pane-rail-label" aria-hidden="true">Markdown</span>
      </button>
    </section>
  );
});
