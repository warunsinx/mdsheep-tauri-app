import { CONTENT_STORAGE_KEY } from "./constants";

export interface StoredDocument {
  version: 1;
  content: string;
  updatedAt: number;
}

export function loadDocument(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(CONTENT_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      parsed.version === 1 &&
      "content" in parsed &&
      typeof parsed.content === "string"
    ) {
      return parsed.content;
    }
  } catch {
    // A malformed or unavailable value should never prevent the editor loading.
  }
  return fallback;
}

export function saveDocument(content: string): void {
  const value: StoredDocument = { version: 1, content, updatedAt: Date.now() };
  window.localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(value));
}

export function debounce<T extends (...args: never[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
  };
  return debounced;
}
