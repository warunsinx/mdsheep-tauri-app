import { useEffect, useRef, useState } from "react";
import { AUTOSAVE_DELAY } from "@/lib/constants";
import { saveDocument } from "@/lib/storage";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export function useAutosave(content: string, ready: boolean) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const firstRun = useRef(true);

  useEffect(() => {
    if (!ready) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setStatus("unsaved");
    const savingTimer = window.setTimeout(() => setStatus("saving"), 250);
    const saveTimer = window.setTimeout(() => {
      try {
        saveDocument(content);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, AUTOSAVE_DELAY);
    return () => {
      window.clearTimeout(savingTimer);
      window.clearTimeout(saveTimer);
    };
  }, [content, ready]);

  return status;
}
