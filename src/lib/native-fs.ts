import { basename } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

const MARKDOWN_FILTERS = [{ name: "Markdown", extensions: ["md", "markdown"] }];
const HTML_FILTERS = [{ name: "HTML", extensions: ["html", "htm"] }];

export interface OpenedFile { name: string; content: string }
export interface NativeTestState {
  openResult: string | null;
  fileContents: Record<string, string>;
  saveResult: string | null;
  written: { path: string; content: string }[];
  openedExternal: string[];
}

declare global { var __MDSHEEP_TEST_STATE__: NativeTestState | undefined }

function dateStamp(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function defaultExportName(date = new Date()) {
  return `document-${dateStamp(date)}.md`;
}

export function defaultHtmlExportName(date = new Date()) {
  return `document-${dateStamp(date)}.html`;
}

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function downloadTextFile(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function openBrowserMarkdownFile(): Promise<OpenedFile | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,text/markdown,text/plain";
    input.hidden = true;

    const finish = (result: OpenedFile | null) => {
      input.remove();
      resolve(result);
    };

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }

      file.text()
        .then((content) => finish({ name: file.name, content }))
        .catch((cause: unknown) => {
          input.remove();
          reject(cause);
        });
    }, { once: true });
    input.addEventListener("cancel", () => finish(null), { once: true });

    document.body.append(input);
    input.click();
  });
}

export async function openMarkdownFile(): Promise<OpenedFile | null> {
  const state = globalThis.__MDSHEEP_TEST_STATE__;
  if (!state && !isTauriRuntime()) return openBrowserMarkdownFile();

  const path = state ? state.openResult : await open({ multiple: false, directory: false, filters: MARKDOWN_FILTERS });
  if (!path || Array.isArray(path)) return null;
  const content = state ? state.fileContents[path] : await readTextFile(path);
  if (content === undefined) throw new Error(`No content registered for ${path}`);
  const name = state ? path.split(/[\\/]/).pop() ?? path : await basename(path);
  return { name, content };
}

export async function saveMarkdownFile(markdown: string, date = new Date()): Promise<boolean> {
  const state = globalThis.__MDSHEEP_TEST_STATE__;
  if (!state && !isTauriRuntime()) {
    downloadTextFile(markdown, defaultExportName(date), "text/markdown;charset=utf-8");
    return true;
  }

  const path = state ? state.saveResult : await save({ defaultPath: defaultExportName(date), filters: MARKDOWN_FILTERS });
  if (!path) return false;
  if (state) state.written.push({ path, content: markdown });
  else await writeTextFile(path, markdown);
  return true;
}

export async function saveHtmlFile(html: string, date = new Date()): Promise<boolean> {
  const state = globalThis.__MDSHEEP_TEST_STATE__;
  if (!state && !isTauriRuntime()) {
    downloadTextFile(html, defaultHtmlExportName(date), "text/html;charset=utf-8");
    return true;
  }

  const path = state ? state.saveResult : await save({ defaultPath: defaultHtmlExportName(date), filters: HTML_FILTERS });
  if (!path) return false;
  if (state) state.written.push({ path, content: html });
  else await writeTextFile(path, html);
  return true;
}
