import { useState } from "react";
import { Download } from "lucide-react";
import { saveMarkdownFile } from "@/lib/native-fs";

export function ExportButton({ markdown }: { markdown: string }) {
  const [error, setError] = useState("");

  const handleExport = async () => {
    setError("");
    try {
      await saveMarkdownFile(markdown);
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "Unknown error";
      setError(`Couldn’t export the Markdown file. ${detail}`);
    }
  };

  return (
    <>
      <button type="button" onClick={handleExport} className="button-secondary" aria-label="Export current Markdown">
        <Download className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Export</span>
      </button>
      {error ? <span className="file-action-error" role="alert">{error}</span> : null}
    </>
  );
}
