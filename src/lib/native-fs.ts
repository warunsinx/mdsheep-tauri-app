import { basename } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

const MARKDOWN_FILTERS = [{ name: "Markdown", extensions: ["md", "markdown"] }];

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

export async function openMarkdownFile(): Promise<OpenedFile | null> {
  const state = globalThis.__MDSHEEP_TEST_STATE__;
  const path = state ? state.openResult : await open({ multiple: false, directory: false, filters: MARKDOWN_FILTERS });
  if (!path || Array.isArray(path)) return null;
  const content = state ? state.fileContents[path] : await readTextFile(path);
  if (content === undefined) throw new Error(`No content registered for ${path}`);
  const name = state ? path.split(/[\\/]/).pop() ?? path : await basename(path);
  return { name, content };
}

export async function saveMarkdownFile(markdown: string, date = new Date()): Promise<boolean> {
  const state = globalThis.__MDSHEEP_TEST_STATE__;
  const path = state ? state.saveResult : await save({ defaultPath: defaultExportName(date), filters: MARKDOWN_FILTERS });
  if (!path) return false;
  if (state) state.written.push({ path, content: markdown });
  else await writeTextFile(path, markdown);
  return true;
}
