import { Download } from "lucide-react";
import { saveMarkdownFile } from "@/lib/native-fs";

export function ExportButton({ markdown }: { markdown: string }) {
  return (
    <button type="button" onClick={() => void saveMarkdownFile(markdown)} className="button-secondary" aria-label="Export current Markdown">
      <Download className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">Export</span>
    </button>
  );
}
