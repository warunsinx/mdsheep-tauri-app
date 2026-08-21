import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, Code2, Download, FileText, Printer } from "lucide-react";
import { buildStandaloneHtml } from "@/lib/export-html";
import { saveHtmlFile, saveMarkdownFile } from "@/lib/native-fs";

function documentTitle(markdown: string) {
  return /^#\s+(.+)$/m.exec(markdown)?.[1].trim() || "MdSheep document";
}

export function ExportButton({ markdown }: { markdown: string }) {
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      window.setTimeout(() => triggerRef.current?.focus(), 0);
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      items[(current + direction + items.length) % items.length]?.focus();
    }
  };

  const handleMarkdownExport = async () => {
    setOpen(false);
    setError("");
    try {
      await saveMarkdownFile(markdown);
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "Unknown error";
      setError(`Couldn’t export the Markdown file. ${detail}`);
    }
  };

  const handleHtmlExport = async () => {
    setOpen(false);
    setError("");
    try {
      const html = await buildStandaloneHtml(markdown, documentTitle(markdown));
      await saveHtmlFile(html);
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "Unknown error";
      setError(`Couldn’t export the HTML file. ${detail}`);
    }
  };

  return (
    <div ref={rootRef} className="export-menu-root">
      <button
        ref={triggerRef}
        type="button"
        className="button-secondary"
        aria-label="Export document"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Download className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown className="hidden size-3 sm:block" aria-hidden="true" />
      </button>
      {open ? (
        <div ref={menuRef} role="menu" aria-label="Export formats" className="export-menu" onKeyDown={handleMenuKeyDown}>
          <button type="button" role="menuitem" tabIndex={-1} aria-label="Markdown (.md)" onClick={() => void handleMarkdownExport()}>
            <FileText className="size-4" aria-hidden="true" />
            <span><strong>Markdown (.md)</strong><small>Editable source</small></span>
          </button>
          <button type="button" role="menuitem" tabIndex={-1} aria-label="Standalone HTML (.html)" onClick={() => void handleHtmlExport()}>
            <Code2 className="size-4" aria-hidden="true" />
            <span><strong>Standalone HTML (.html)</strong><small>Styled offline document</small></span>
          </button>
          <button type="button" role="menuitem" tabIndex={-1} aria-label="Print or save as PDF" onClick={() => {
            setOpen(false);
            window.print();
          }}>
            <Printer className="size-4" aria-hidden="true" />
            <span><strong>Print or save as PDF</strong><small>Uses the system print dialog</small></span>
          </button>
        </div>
      ) : null}
      {error ? <span className="file-action-error" role="alert">{error}</span> : null}
    </div>
  );
}
