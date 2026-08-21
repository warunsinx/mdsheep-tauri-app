import { memo, type CompositionEventHandler, type KeyboardEventHandler, type RefObject } from "react";
import { LINE_HEIGHT_VALUES, type EditorSettings } from "@/lib/settings";

interface EditorPaneProps {
  value: string;
  onChange: (value: string) => void;
  settings: EditorSettings;
  collapsed?: boolean;
  onReopen?: () => void;
  onExpand?: () => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
  onCompositionStart?: CompositionEventHandler<HTMLTextAreaElement>;
  onCompositionEnd?: CompositionEventHandler<HTMLTextAreaElement>;
}

export const EditorPane = memo(function EditorPane({ value, onChange, settings, collapsed = false, onReopen, onExpand, textareaRef, onKeyDown, onCompositionStart, onCompositionEnd }: EditorPaneProps) {
  return (
    <section id="edit-panel" aria-label="Markdown source" className={`editor-pane flex min-h-0 flex-1 flex-col${collapsed ? " pane-collapsed" : ""}`}>
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
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}

          tabIndex={collapsed ? -1 : undefined}
          spellCheck={settings.spellcheck}
          wrap={settings.wordWrap ? "soft" : "off"}
          style={{ fontSize: `${settings.editorFontSize}px`, lineHeight: LINE_HEIGHT_VALUES[settings.lineHeight], overflowX: settings.wordWrap ? "hidden" : "auto" }}
          className="editor-scroll min-h-0 flex-1 resize-none bg-transparent px-5 py-6 font-mono outline-none md:px-8"
        />
      </div>
      <button type="button" className="pane-rail pane-rail-left" aria-label={collapsed ? "Reopen Markdown editor" : undefined} onClick={onReopen}>
        <span className="pane-rail-label" aria-hidden="true">Markdown</span>
      </button>
    </section>
  );
});
