import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { openMarkdownFile } from "@/lib/native-fs";

export function OpenButton({ onOpen }: { onOpen: (markdown: string) => void }) {
  const [error, setError] = useState("");

  const handleOpen = async () => {
    setError("");
    try {
      const file = await openMarkdownFile();
      if (file) onOpen(file.content);
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "Unknown error";
      setError(`Couldn’t open the Markdown file. ${detail}`);
    }
  };

  return (
    <>
      <button type="button" className="button-secondary" aria-label="Open Markdown file" onClick={handleOpen}>
        <FolderOpen className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Open</span>
      </button>
      {error ? <span className="sr-only" role="alert">{error}</span> : null}
    </>
  );
}
