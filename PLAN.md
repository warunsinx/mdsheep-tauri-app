# MdSheep → Tauri v2 Port: Implementation Plan

**Source (untouched, read-only reference):** `C:\Users\warun\markdown-mermaid-editor`
**Target (new sibling repo, created fresh):** `C:\Users\warun\mdsheep-tauri`

This plan was produced by fully inspecting the source repo (`app/`, `components/`, `hooks/`, `lib/`, `context/`, all 16 test files, both configs, and `globals.css`). It assumes Codex will execute the stages below inside `mdsheep-tauri` only. **No file in `markdown-mermaid-editor` should ever be written to** — it is reference material only, read via a relative path or a copy of its contents.

Toolchain already confirmed present on this machine: Node `v24.19.0`, `rustc 1.89.0`, `cargo 1.89.0`, `rustup`. No installs needed for the Rust side.

---

## 1. Architecture

### 1.1 Current shape (Next.js)
- Next 16 App Router, one route (`app/page.tsx` → `EditorLayout`), SSR-capable but the whole UI is client-only (`"use client"` everywhere; content hydrates from `localStorage` after mount via a `setTimeout(0)` pattern to dodge hydration mismatches).
- Pre-hydration theme flash prevention via an inline `<script>` (`lib/theme-script.ts`) injected in `app/layout.tsx`'s `<head>`.
- Fonts via `next/font` (`geist` package's Next-specific loader entrypoints), exposed as CSS variables on `<html>`.
- File **open** = hidden `<input type="file">` + `FileReader`/`file.text()`. File **export** = `Blob` + object URL + synthetic `<a download>` click (browser download, not a real "save").
- All persistence (document, theme, pane ratio, settings) is `window.localStorage`, versioned JSON blobs.
- Sanitization: `rehype-sanitize` (custom schema) for Markdown HTML, `DOMPurify` (SVG profile) for Mermaid's rendered SVG. `mermaid` runs in `securityLevel: "strict"`.

### 1.2 Target shape (Tauri v2)
- **Frontend**: Vite + React 19 + TypeScript SPA (no router needed — still one screen). Same component tree, same hooks, same `lib/` utilities, verbatim business logic. Files move under `src/` and lose their `"use client"` directives (meaningless outside Next).
- **Native shell**: Tauri v2 Rust host process owns the window (WebView2 on Windows). Two plugins do the OS integration the web version faked:
  - `@tauri-apps/plugin-dialog` — native Open/Save file pickers (replaces the hidden `<input type="file">` and the download link).
  - `@tauri-apps/plugin-fs` — reads/writes the exact bytes of the chosen path (replaces `file.text()` / Blob download).
  - `@tauri-apps/plugin-shell` — opens Markdown-authored links (e.g. in the preview pane) in the user's default OS browser instead of navigating the embedded webview away from the app (a real regression risk that doesn't exist in the browser version, called out explicitly in §3).
- **Storage stays as-is**: WebView2's `localStorage` behaves like a normal browser's, so `lib/storage.ts`, `lib/settings.ts`, `lib/pane-split.ts`, `lib/theme.ts` and their hooks port with **zero logic changes** — only import-path updates.
- **Theme flash script**: same string (`lib/theme-script.ts`), still exported for its unit test, but now injected into `index.html`'s `<head>` via a tiny Vite `transformIndexHtml` plugin instead of a Next `<head>` element, so there is exactly one source of truth.
- **Fonts**: self-hosted static Geist woff2 files (already vendored inside `geist`'s npm package — no `next/font` involved), loaded via plain `@font-face` in `globals.css`, exposed under the same `--font-geist-sans` / `--font-geist-mono` custom-property names so every consumer (Tailwind theme, `MermaidBlock`'s `fontFamily: "var(--font-geist-sans)"`) needs no changes.
- **Native I/O abstraction**: a new `src/lib/native-fs.ts` (and `native-shell.ts`) module is the *only* place that imports Tauri plugins. Components call it, never the plugins directly. This gives clean seams for both unit tests (mock the module) and e2e tests (see §7).

### 1.3 Process/data flow diagram

```
┌─────────────────────────── Tauri Rust host (src-tauri) ───────────────────────────┐
│  registers: plugin-dialog, plugin-fs, plugin-shell                                │
│  owns the native window + OS file dialogs + filesystem access                     │
└───────────────────────────────────▲────────────────────────────────────────────────┘
                                     │ IPC (invoke/plugin commands)
┌───────────────────────────────────┴────────────────────────────────────────────────┐
│  WebView (Vite-built SPA)                                                          │
│  App.tsx → ThemeProvider → EditorLayout                                            │
│    ├── Toolbar (ThemeToggle, SettingsDialog, OpenButton, ExportButton)             │
│    ├── EditorPane  (textarea, settings-driven)                                     │
│    ├── PaneResizer (pointer/keyboard drag, snap points)                           │
│    └── PreviewPane (react-markdown + remark-gfm + rehype-sanitize + MermaidBlock)  │
│  lib/native-fs.ts  ──► @tauri-apps/plugin-dialog + plugin-fs                       │
│  lib/native-shell.ts ─► @tauri-apps/plugin-shell (external links)                  │
│  lib/storage.ts, settings.ts, pane-split.ts, theme.ts ─► window.localStorage       │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Feature inventory (every feature in the README/code, mapped)

| # | Feature | Source file(s) | Port strategy |
|---|---|---|---|
| 1 | Live GFM Markdown preview | `components/PreviewPane.tsx`, `lib/markdown.ts` | 1:1 port, no changes |
| 2 | Mermaid diagrams rendered as you type, strict security, debounced render, error surfaced accessibly, stable across unrelated edits | `components/MermaidBlock.tsx` | 1:1 port, no changes |
| 3 | SVG sanitization of Mermaid output | `MermaidBlock.tsx` (DOMPurify) | 1:1 port, no changes |
| 4 | HTML sanitization of Markdown preview | `lib/markdown.ts`, `rehype-sanitize` | 1:1 port, no changes |
| 5 | Open local `.md`/`.markdown` file | `components/OpenButton.tsx` | **Replaced**: native dialog + fs read (§4) |
| 6 | Export current document as Markdown | `components/ExportButton.tsx` | **Replaced**: native save dialog + fs write (§4) |
| 7 | Local autosave (debounced, status-aware) | `hooks/useAutosave.ts`, `lib/storage.ts` | 1:1 port |
| 8 | Light/dark theme, system-aware first run, persisted, no "system" option, pre-hydration flash prevention | `context/ThemeContext.tsx`, `lib/theme.ts`, `lib/theme-script.ts`, `components/ThemeToggle.tsx` | 1:1 port; script injected via Vite HTML transform instead of Next `<head>` |
| 9 | Adjustable editor/preview font size, line spacing, word wrap, spellcheck, doc stats toggle — all live + persisted + resettable | `components/SettingsDialog.tsx`, `hooks/useSettings.ts`, `lib/settings.ts` | 1:1 port |
| 10 | Resizable desktop panes: pointer drag, keyboard (arrows/Home/End), snap points 0/25/50/75/100, persisted ratio w/ legacy migration | `components/PaneResizer.tsx`, `hooks/usePaneSplit.ts`, `lib/pane-split.ts` | 1:1 port |
| 11 | Collapsible panes → vertical rail, reopen on click, frosted collapse animation via CSS vars | `components/EditorLayout.tsx` (`getCollapseProgress`), `app/globals.css` | 1:1 port, CSS unchanged |
| 12 | Separate Edit/Preview views on mobile via radio-button CSS trick (no JS state) | `EditorLayout.tsx`, `Toolbar.tsx`, `globals.css` | 1:1 port |
| 13 | Keyboard accessibility (dialog focus trap, separator role, aria-live stats, alerts) | `SettingsDialog.tsx`, `PaneResizer.tsx`, `OpenButton.tsx` | 1:1 port |
| 14 | Word/line stats | `EditorPane.tsx` | 1:1 port |
| 15 | Toolbar brand, responsive 320px-safe layout | `Toolbar.tsx`, `globals.css` | 1:1 port |
| 16 (new) | Open links from Markdown in the OS browser, not the app webview | *(did not exist — browser version didn't need it)* | **New, required for parity of intent** — added via `lib/native-shell.ts` + `plugin-shell` (§3) |

**Deliberately out of scope / explicit deviations (flag to user, don't silently add scope):**
- No "recently opened path" / true in-place "Save" (Ctrl+S re-saves same file) — the source app never had this either (Export always prompts a fresh filename). The native Save dialog will default to the same `document-YYYY-MM-DD.md` filename pattern, preserving current behavior exactly. A real Save/Save-As split is a legitimate future enhancement but is **not** part of "port every feature."
- No native menu bar / global keyboard shortcuts (Cmd/Ctrl+O, Ctrl+S) — nice-to-have, not present in the source app, so not required for parity. Note it as an optional Stage 9 stretch task.
- App icon: use the Tauri-scaffolded placeholder icon set unless the user supplies real artwork; not a functional regression.

---

## 3. Native file I/O & external-link design

### 3.1 `src/lib/native-fs.ts` (new file, no source-repo equivalent)

```ts
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { basename } from "@tauri-apps/api/path";

const MARKDOWN_FILTERS = [{ name: "Markdown", extensions: ["md", "markdown"] }];

export interface OpenedFile {
  name: string;
  content: string;
}

function dateStamp(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function defaultExportName(date = new Date()) {
  return `document-${dateStamp(date)}.md`;
}

// Test seam: if Playwright (or any harness) has defined this global, route
// through it instead of the real Tauri plugins. See tests/e2e/support/native-mock.ts.
function testState() {
  return (globalThis as typeof globalThis & { __MDSHEEP_TEST_STATE__?: NativeTestState }).__MDSHEEP_TEST_STATE__;
}

interface NativeTestState {
  openResult: string | null;
  fileContents: Record<string, string>;
  saveResult: string | null;
  written: { path: string; content: string }[];
}

export async function openMarkdownFile(): Promise<OpenedFile | null> {
  const state = testState();
  const path = state ? state.openResult : await open({ multiple: false, directory: false, filters: MARKDOWN_FILTERS });
  if (!path || Array.isArray(path)) return null;
  const content = state ? state.fileContents[path] : await readTextFile(path);
  if (content === undefined) throw new Error(`No content registered for ${path}`);
  const name = state ? path.split(/[\\/]/).pop() ?? path : await basename(path);
  return { name, content };
}

export async function saveMarkdownFile(markdown: string, date = new Date()): Promise<boolean> {
  const state = testState();
  const path = state ? state.saveResult : await save({ defaultPath: defaultExportName(date), filters: MARKDOWN_FILTERS });
  if (!path) return false;
  if (state) state.written.push({ path, content: markdown });
  else await writeTextFile(path, markdown);
  return true;
}
```

- `OpenButton.tsx` becomes a plain `<button>` (drop the `<input type="file">`/`<label>` pattern entirely) that calls `openMarkdownFile()`, forwards `content` to `onOpen`, and on thrown error shows the same `sr-only role="alert"` message keyed off `err instanceof Error ? err.message : ...` and the file's `name`.
- `ExportButton.tsx` calls `saveMarkdownFile(markdown)` — same icon/label ("Export" text can stay, or be renamed "Save"; recommend keeping the label **"Export"** to avoid an unannounced UX rename, since the button still produces a new file each time rather than true in-place save).
- Cancelling either dialog (`null` result) is a silent no-op — matches "no file chosen" behavior of the original `<input type="file">` and "revoked" `URL.createObjectURL` cleanup path.

### 3.2 `src/lib/native-shell.ts` (new file)

```ts
import { open as openExternal } from "@tauri-apps/plugin-shell";

export function isExternalHref(href: string) {
  return /^https?:|^mailto:/i.test(href);
}

export async function openInSystemBrowser(href: string) {
  await openExternal(href);
}
```

`PreviewPane.tsx`'s `a` component renderer gains an `onClick` that calls `event.preventDefault(); void openInSystemBrowser(href)` when `isExternalHref(href)` is true, otherwise behaves as before. This is required because an anchor click inside a Tauri WebView2 window navigates the *app itself* away by default — a real functional regression versus the browser version that the plan must not silently drop.

---

## 4. Dependency mapping

| Source package | Version (pinned in source lockfile) | Target | Notes |
|---|---|---|---|
| `next` | 16.3.0 | — removed | replaced by Vite + Tauri |
| `eslint-config-next` | 16.3.0 | — removed | replaced by flat `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` config |
| `geist` | 1.7.2 | kept, **devDependency only**, used purely to vendor static `.woff2` files at `postinstall` time (no `geist/font/*` import) | see §5 |
| `react`, `react-dom` | 19.2.8 | same versions | unchanged |
| `react-markdown` | 10.1.0 | same | unchanged |
| `remark-gfm` | 4.0.1 | same | unchanged |
| `rehype-sanitize` | 6.0.0 | same | unchanged |
| `hast-util-sanitize` | 5.0.2 | same | unchanged |
| `mermaid` | 11.16.1 | same | unchanged |
| `dompurify` + `@types/dompurify` | 3.4.13 | same | unchanged |
| `lucide-react` | 1.31.0 | same | unchanged |
| `clsx` | 2.1.1 | same | unchanged (currently unused in components read, but keep if referenced elsewhere) |
| `tailwindcss`, `@tailwindcss/postcss`, `@tailwindcss/typography` | 4.3.3 / 4.3.3 / 0.5.20 | same | Tailwind v4 works identically under Vite's PostCSS pipeline |
| `typescript` | 6.0.3 | same | unchanged |
| `eslint` | 9.39.5 | same | unchanged (flat config) |
| `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | 4.1.10 / 30.0.1 / 16.3.2 / 14.6.3 / 7.0.1 | same | unchanged |
| `@playwright/test`, `@axe-core/playwright` | 1.62.1 / 4.12.1 | same | unchanged |
| — | — | **`vite`, `@vitejs/plugin-react`** | new, standard Vite React-TS toolchain |
| — | — | **`vite-tsconfig-paths`** | new, resolves `@/*` alias the same way `next.config`'s bundler resolution did |
| — | — | **`@tauri-apps/cli`** `^2` (devDependency) | Tauri build/dev CLI |
| — | — | **`@tauri-apps/api`** `^2` | core JS bindings (`@tauri-apps/api/path`, environment detection) |
| — | — | **`@tauri-apps/plugin-dialog`** `^2` | native Open/Save dialogs |
| — | — | **`@tauri-apps/plugin-fs`** `^2` | native file read/write |
| — | — | **`@tauri-apps/plugin-shell`** `^2` | open external links |
| Rust: `tauri` `2`, `tauri-build` `2`, `tauri-plugin-dialog` `2`, `tauri-plugin-fs` `2`, `tauri-plugin-shell` `2`, `serde`, `serde_json` | new (`src-tauri/Cargo.toml`) | | |

> **Version-drift caveat (be explicit with the user/Codex):** exact Tauri v2 plugin permission-identifier strings and `create-tauri-app` CLI flags can shift across minor releases. Codex has live npm/cargo access during implementation — treat the capability JSON and scaffold commands below as the best-known-accurate baseline, but validate against `node_modules/@tauri-apps/plugin-*/permissions/*.json` (or the auto-generated `src-tauri/gen/schemas/*.json` after the first `tauri dev`) and adjust identifiers if the installed version renamed anything, rather than trusting this document blindly.

---

## 5. Font strategy

`geist`'s npm package ships plain static font files independent of its Next.js-specific loader entrypoints:

```
node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2
node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2
```

Plan:
1. Keep `geist` as a `devDependency` (source of the static files only — never import `geist/font/sans` or `geist/font/mono`).
2. Add `scripts/copy-fonts.mjs`, wired as `"postinstall"` in `package.json`, that copies those two files into:
   ```
   public/fonts/geist-sans/Geist-Variable.woff2
   public/fonts/geist-mono/GeistMono-Variable.woff2
   ```
3. In `src/globals.css`, above the existing `@theme inline` block, add:
   ```css
   @font-face {
     font-family: "GeistSans";
     src: url("/fonts/geist-sans/Geist-Variable.woff2") format("woff2-variations"), url("/fonts/geist-sans/Geist-Variable.woff2") format("woff2");
     font-weight: 100 900;
     font-style: normal;
     font-display: swap;
   }
   @font-face {
     font-family: "GeistMono";
     src: url("/fonts/geist-mono/GeistMono-Variable.woff2") format("woff2-variations"), url("/fonts/geist-mono/GeistMono-Variable.woff2") format("woff2");
     font-weight: 100 900;
     font-style: normal;
     font-display: swap;
   }
   :root { --font-geist-sans: "GeistSans"; --font-geist-mono: "GeistMono"; }
   ```
4. Everything downstream (`--font-sans`, `--font-mono` in `@theme inline`, `body { font-family: var(--font-geist-sans)... }`, `MermaidBlock`'s inline `fontFamily: "var(--font-geist-sans)"`) is untouched — the custom-property **names** stay identical, only how they get their value changes (static `@font-face` instead of a `next/font`-injected class on `<html>`).
5. Drop `GeistSans.variable`/`GeistMono.variable` className wiring from the root layout entirely (no longer needed).

---

## 6. Exact target directory tree

```
mdsheep-tauri/
├── .gitignore
├── package.json
├── package-lock.json                  (generated by npm install)
├── index.html
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.mjs
├── README.md
├── scripts/
│   └── copy-fonts.mjs
├── public/
│   └── fonts/
│       ├── geist-sans/Geist-Variable.woff2
│       └── geist-mono/GeistMono-Variable.woff2
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── globals.css
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── EditorLayout.tsx
│   │   ├── EditorPane.tsx
│   │   ├── PreviewPane.tsx
│   │   ├── MermaidBlock.tsx
│   │   ├── OpenButton.tsx
│   │   ├── ExportButton.tsx
│   │   ├── Toolbar.tsx
│   │   ├── PaneResizer.tsx
│   │   ├── SettingsDialog.tsx
│   │   └── ThemeToggle.tsx
│   ├── context/
│   │   └── ThemeContext.tsx
│   ├── hooks/
│   │   ├── useAutosave.ts
│   │   ├── useMediaQuery.ts
│   │   ├── usePaneSplit.ts
│   │   └── useSettings.ts
│   └── lib/
│       ├── constants.ts
│       ├── markdown.ts
│       ├── native-fs.ts               (new)
│       ├── native-shell.ts            (new)
│       ├── pane-split.ts
│       ├── settings.ts
│       ├── storage.ts
│       ├── theme.ts
│       └── theme-script.ts
├── tests/
│   ├── setup.ts
│   ├── EditorLayout.test.tsx
│   ├── CollapsedPaneRails.test.tsx
│   ├── PaneMemoization.test.tsx
│   ├── PaneResizer.test.tsx
│   ├── pane-split.test.ts
│   ├── PreviewPane.test.tsx
│   ├── MermaidBlock.test.tsx
│   ├── OpenButton.test.tsx            (rewritten for native-fs)
│   ├── ExportButton.test.tsx          (rewritten for native-fs)
│   ├── SettingsDialog.test.tsx
│   ├── settings.test.ts
│   ├── storage.test.ts
│   ├── theme.test.ts
│   ├── theme-script.test.ts
│   ├── ThemeToggle.test.tsx
│   └── e2e/
│       ├── editor.spec.ts             (ported, open-file case rewritten)
│       └── support/
│           └── native-mock.ts         (new)
└── src-tauri/
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json
    ├── capabilities/
    │   └── default.json
    ├── icons/                          (CLI-generated placeholder set)
    └── src/
        ├── main.rs
        └── lib.rs
```

---

## 7. Testing strategy (unit + e2e, native I/O seam)

### 7.1 Vitest (unit/component)
- `vitest.config.ts`, `tests/setup.ts` port unchanged (jsdom env, RTL cleanup, `matchMedia` stub).
- All logic-only test files (`pane-split.test.ts`, `settings.test.ts`, `storage.test.ts`, `theme.test.ts`, `theme-script.test.ts`) port **verbatim** — they test pure functions with no Next/Tauri dependency.
- All component tests that don't touch file I/O (`EditorLayout.test.tsx`, `CollapsedPaneRails.test.tsx`, `PaneMemoization.test.tsx`, `PaneResizer.test.tsx`, `PreviewPane.test.tsx`, `MermaidBlock.test.tsx`, `SettingsDialog.test.tsx`, `ThemeToggle.test.tsx`) port **verbatim**, only import paths change (`@/components/...` alias resolves into `src/`).
  - `EditorLayout.test.tsx`'s "selects Edit after opening a file from Preview" test currently drives the flow via `userEvent.upload(screen.getByLabelText("Choose a Markdown file"), file)`. Since the native `OpenButton` has no file input, rewrite this one interaction to `vi.mock("@/lib/native-fs")` and resolve `openMarkdownFile` to `{ name: "opened.markdown", content: "# Opened locally" }`, then click the Open button.
- `OpenButton.test.tsx` and `ExportButton.test.tsx` are **rewritten** (not literal ports — the DOM mechanism they exercised no longer exists) but must cover the **same behavioral guarantees**:
  - `OpenButton`: clicking invokes `openMarkdownFile()`; on success calls `onOpen` with the *exact* returned content (byte-for-byte, including trailing whitespace — mirrors the source test's `"Trailing space  \n"` assertion); on `null` (cancel) does nothing; on a thrown error, renders an accessible `role="alert"` containing the file name and doesn't call `onOpen`; calling Open twice in a row works both times (no leftover internal state).
  - `ExportButton`: clicking invokes `saveMarkdownFile(markdown, date)` with a `defaultPath` of `document-YYYY-MM-DD.md` for a fixed injected `Date`; the exact markdown string is what gets passed to the write call; cancelling (`null`) results in no write.

### 7.2 Playwright e2e — native I/O test seam
Tauri's real OS dialogs cannot be driven by Playwright (there is no `filechooser` event for `plugin-dialog`/`plugin-fs` — that API only exists for a real `<input type="file">`, which no longer exists in the ported app). Two viable strategies, ranked:

**Recommended (Option A — app-level seam, used by `native-fs.ts` above):** the app itself checks for `globalThis.__MDSHEEP_TEST_STATE__` and, if present, short-circuits the real plugin calls. Playwright's `tests/e2e/support/native-mock.ts` uses `page.addInitScript` to install that global *before app code runs*, and small helpers to prime results:

```ts
// tests/e2e/support/native-mock.ts
import type { Page } from "@playwright/test";

export async function installNativeMock(page: Page) {
  await page.addInitScript(() => {
    (window as any).__MDSHEEP_TEST_STATE__ = {
      openResult: null, fileContents: {}, saveResult: null, written: [],
    };
  });
}

export async function primeOpenFile(page: Page, path: string, content: string) {
  await page.evaluate(({ path, content }) => {
    const s = (window as any).__MDSHEEP_TEST_STATE__;
    s.openResult = path;
    s.fileContents[path] = content;
  }, { path, content });
}
```

This keeps the seam entirely inside first-party code (a documented, intentional test hook), not a reverse-engineered Tauri IPC command name — far more stable across Tauri plugin upgrades.

**Optional/stretch (Option B — official Tauri mocks, higher fidelity):** `@tauri-apps/api/mocks`'s `mockIPC()` monkey-patches `window.__TAURI_INTERNALS__.invoke`, letting tests stub the actual `plugin:dialog|open`, `plugin:dialog|save`, `plugin:fs|read_text_file`, `plugin:fs|write_text_file` command names. This exercises the real plugin JS wrappers, at the cost of depending on internal command-name strings that are not part of the plugins' public API contract and could rename across majors. Document this as a follow-up hardening task, not required for initial acceptance.

- Port `tests/e2e/editor.spec.ts` verbatim **except** the "opens a selected local Markdown file on desktop and mobile" test, which is rewritten to call `installNativeMock(page)` in a `beforeEach`, `primeOpenFile(page, "C:/fake/local.markdown", exactMarkdown)`, then click "Open Markdown file" and assert on the editor value exactly as before (no more `waitForEvent("filechooser")`/`chooser.setFiles`).
- No e2e test currently exercises Export/download (confirmed by reading `editor.spec.ts` — only the unit test covers it), so no other e2e rewrite is needed for native save.
- `playwright.config.ts` ports with `baseURL: "http://127.0.0.1:5173"` and `webServer.command: "npm run dev"` / `url: "http://127.0.0.1:5173"` (Vite's default port replacing Next's 3000). All three projects (`desktop`, `mobile-chromium`, `mobile-webkit`) and `@axe-core/playwright` accessibility assertions carry over unchanged — this suite runs against the Vite dev server in a plain browser, not inside the actual Tauri window (true native-window e2e via `tauri-driver` + WebView2's WebDriver support is a legitimate but separate stretch goal — Windows-only, needs `msedgedriver`, and is **not** required for this port's acceptance).

---

## 8. Config content (verbatim, ready to write)

### 8.1 `vite.config.ts`
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { themeScript } from "./src/lib/theme-script";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    {
      name: "inject-theme-script",
      transformIndexHtml(html) {
        return html.replace("<!--THEME_SCRIPT-->", `<script>${themeScript}</script>`);
      },
    },
  ],
  clearScreen: false,
  server: {
    host: host || "127.0.0.1",
    port: 5173,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
```

### 8.2 `index.html`
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>MdSheep — Markdown + Mermaid Editor</title>
    <meta name="description" content="MdSheep is a fast, private Markdown editor with live Mermaid diagrams." />
    <!--THEME_SCRIPT-->
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 8.3 `src/main.tsx`
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/context/ThemeContext";
import { App } from "./App";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
```

### 8.4 `src/App.tsx`
```tsx
import { EditorLayout } from "@/components/EditorLayout";

export function App() {
  return <EditorLayout />;
}
```

### 8.5 `vitest.config.ts` (unchanged shape, path only)
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    css: false,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

### 8.6 `playwright.config.ts`
```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:5173", trace: "on-first-retry" },
  webServer: { command: "npm run dev", url: "http://127.0.0.1:5173", reuseExistingServer: true },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["iPhone 13"], browserName: "chromium" } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"], browserName: "webkit" } },
  ],
});
```

### 8.7 `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`
```json
// tsconfig.json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```
```json
// tsconfig.app.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "tests"]
}
```
```json
// tsconfig.node.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "playwright.config.ts", "scripts"]
}
```

### 8.8 `eslint.config.mjs`
```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist/**", "src-tauri/target/**", "coverage/**", "playwright-report/**", "test-results/**"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
]);
```

### 8.9 `package.json`
```json
{
  "name": "mdsheep-tauri",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "postinstall": "node scripts/copy-fonts.mjs",
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview --port 5173",
    "tauri": "tauri",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit -p tsconfig.app.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@tailwindcss/typography": "^0.5.20",
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-dialog": "^2",
    "@tauri-apps/plugin-fs": "^2",
    "@tauri-apps/plugin-shell": "^2",
    "clsx": "^2.1.1",
    "dompurify": "^3.4.13",
    "hast-util-sanitize": "^5.0.2",
    "lucide-react": "^1.31.0",
    "mermaid": "^11.16.1",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-markdown": "^10.1.0",
    "rehype-sanitize": "^6.0.0",
    "remark-gfm": "^4.0.1"
  },
  "devDependencies": {
    "@axe-core/playwright": "^4.12.1",
    "@eslint/js": "^9.39.5",
    "@playwright/test": "^1.62.1",
    "@tailwindcss/postcss": "^4.3.3",
    "@tauri-apps/cli": "^2",
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.3",
    "@types/dompurify": "^3.0.5",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^4",
    "eslint": "^9.39.5",
    "eslint-plugin-react-hooks": "^5",
    "eslint-plugin-react-refresh": "^0.4",
    "geist": "^1.7.2",
    "jsdom": "^30.0.1",
    "tailwindcss": "^4.3.3",
    "typescript": "^6.0.3",
    "typescript-eslint": "^8",
    "vite": "^6",
    "vite-tsconfig-paths": "^5",
    "vitest": "^4.1.10"
  }
}
```

### 8.10 `scripts/copy-fonts.mjs`
```js
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url) + "/..");
const pairs = [
  ["node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2", "public/fonts/geist-sans/Geist-Variable.woff2"],
  ["node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2", "public/fonts/geist-mono/GeistMono-Variable.woff2"],
];
for (const [from, to] of pairs) {
  mkdirSync(dirname(join(root, to)), { recursive: true });
  copyFileSync(join(root, from), join(root, to));
}
```

---

## 9. Tauri config, capabilities, CSP

### 9.1 `src-tauri/tauri.conf.json`
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "MdSheep",
  "version": "1.0.0",
  "identifier": "dev.mdsheep.desktop",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://127.0.0.1:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "MdSheep — Markdown + Mermaid Editor",
        "width": 1200,
        "height": 800,
        "minWidth": 420,
        "minHeight": 420,
        "resizable": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' ipc: http://ipc.localhost; img-src 'self' data: blob:; style-src 'self'; font-src 'self'; script-src 'self'"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"]
  }
}
```
Notes:
- `script-src 'self'` deliberately omits `'unsafe-inline'`. Tauri v2 auto-hashes inline `<script>`/`<style>` blocks found in bundled HTML at build time and augments the emitted CSP — verify this by inspecting the built `dist/index.html`'s CSP meta tag after `tauri build`; if the inline theme script is blocked in a packaged build, that auto-hashing didn't fire as expected and `script-src` needs a `'sha256-...'` entry (compute via `tauri build`'s own tooling) rather than falling back to `'unsafe-inline'`.
- `connect-src` includes both `ipc:` and `http://ipc.localhost` for cross-platform IPC transport compatibility.

### 9.2 `src-tauri/capabilities/default.json`
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capabilities for the main MdSheep window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:default",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    { "identifier": "fs:scope", "allow": [{ "path": "**" }] },
    "shell:allow-open"
  ]
}
```
- `fs:scope` is intentionally broad (`**`) because every path the app touches comes from a user-driven native dialog selection, not attacker-controlled input — narrower scoping (e.g. `$DOCUMENT/**`) is possible but would block opening files from arbitrary locations, which the source app supports today via the unrestricted `<input type="file">`.
- **Action for Codex**: after first `npm run tauri dev`, Tauri auto-generates `src-tauri/gen/schemas/*.json` — diff the actual permission identifiers shipped by the installed plugin versions against this file and correct any renames before relying on it.

### 9.3 `src-tauri/Cargo.toml`
```toml
[package]
name = "mdsheep-tauri"
version = "1.0.0"
description = "MdSheep desktop — a fast, private Markdown + Mermaid editor"
edition = "2021"

[lib]
name = "mdsheep_tauri_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

### 9.4 `src-tauri/build.rs`
```rust
fn main() {
    tauri_build::build()
}
```

### 9.5 `src-tauri/src/main.rs`
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    mdsheep_tauri_lib::run();
}
```

### 9.6 `src-tauri/src/lib.rs`
```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running MdSheep");
}
```

---

## 10. Staged implementation tasks for Codex

Work strictly inside `C:\Users\warun\mdsheep-tauri`. Treat `C:\Users\warun\markdown-mermaid-editor` as read-only reference (copy file contents out of it; never open it for writing).

**Stage 0 — Scaffold**
1. `cd C:\Users\warun && npm create tauri-app@latest mdsheep-tauri` → choose: package manager `npm`, UI template `React`, UI flavor `TypeScript`. (Flags for a non-interactive run vary by CLI version — check `npm create tauri-app@latest -- --help` first and prefer explicit flags like `--template react-ts --manager npm` if supported; otherwise answer prompts.)
2. Delete the scaffold's placeholder `src/App.tsx`, `src/App.css`, `src/assets/*` demo content — keep `src-tauri/icons/` as-is.
3. Verify `cargo build` succeeds once from `src-tauri/` before touching frontend code (validates the Rust toolchain end to end).

**Stage 1 — Config files**
4. Replace/create `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.mjs`, `postcss.config.mjs`, `index.html`, `package.json` scripts/deps exactly as in §8.
5. `npm install`, confirm `postinstall` copies the two font files into `public/fonts/`.

**Stage 2 — Port `lib/` (pure logic, no native I/O)**
6. Copy `lib/constants.ts`, `lib/markdown.ts`, `lib/pane-split.ts`, `lib/settings.ts`, `lib/storage.ts`, `lib/theme.ts`, `lib/theme-script.ts` verbatim into `src/lib/`. No content changes expected — diff against source after copy to confirm.

**Stage 3 — Port `context/` and `hooks/`**
7. Copy `context/ThemeContext.tsx`, `hooks/useAutosave.ts`, `hooks/useMediaQuery.ts`, `hooks/usePaneSplit.ts`, `hooks/useSettings.ts` into `src/context/` and `src/hooks/`, stripping `"use client"` lines (harmless no-ops outside Next, remove for cleanliness).

**Stage 4 — Native I/O modules (new)**
8. Create `src/lib/native-fs.ts` and `src/lib/native-shell.ts` exactly as in §3.

**Stage 5 — Port components**
9. Copy `EditorLayout.tsx`, `EditorPane.tsx`, `Toolbar.tsx`, `PaneResizer.tsx`, `MermaidBlock.tsx`, `SettingsDialog.tsx`, `ThemeToggle.tsx` verbatim (minus `"use client"`) into `src/components/`.
10. Rewrite `OpenButton.tsx` to the native-button design in §3.1 (drop the hidden `<input>`/`<label>` pattern, keep the same visible label/icon/`aria-label="Open Markdown file"`).
11. Rewrite `ExportButton.tsx` to call `saveMarkdownFile` (§3.1), keeping the same visible label/icon.
12. Update `PreviewPane.tsx`'s `a` renderer to intercept external links via `native-shell.ts` (§3.2).
13. Port `app/globals.css` → `src/globals.css` verbatim, then prepend the `@font-face` block from §5.

**Stage 6 — Bootstrap**
14. Write `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts` per §8.3–8.4.
15. `npm run dev` (Vite only) and confirm the SPA renders in a plain browser at `http://127.0.0.1:5173` with correct theme, fonts, and layout, even though native Open/Save will error (no Tauri runtime yet) — expected at this stage.
16. `npm run tauri dev` and confirm the native window opens, Open/Save dialogs work end-to-end against real files, and external Markdown links open the OS browser instead of navigating the app window.

**Stage 7 — Port tests**
17. Copy `tests/setup.ts` verbatim.
18. Copy the eight logic/UI-only test files verbatim (`pane-split.test.ts`, `settings.test.ts`, `storage.test.ts`, `theme.test.ts`, `theme-script.test.ts`, `PaneResizer.test.tsx`, `PreviewPane.test.tsx`, `MermaidBlock.test.tsx`, `SettingsDialog.test.tsx`, `ThemeToggle.test.tsx`, `CollapsedPaneRails.test.tsx`, `PaneMemoization.test.tsx`), updating only import paths if needed (should already resolve via the `@/*` alias).
19. Port `EditorLayout.test.tsx`, rewriting only the "opens a file" sub-test to mock `@/lib/native-fs` (§7.1).
20. Rewrite `OpenButton.test.tsx` and `ExportButton.test.tsx` per §7.1.
21. `npm test` — all suites green.

**Stage 8 — Port e2e**
22. Create `tests/e2e/support/native-mock.ts` (§7.2).
23. Copy `tests/e2e/editor.spec.ts`, rewriting only the "opens a selected local Markdown file" test to use the mock harness instead of `filechooser`.
24. `npx playwright install` then `npm run test:e2e` (against the Vite dev server, not the Tauri window) — all suites green across `desktop`, `mobile-chromium`, `mobile-webkit`.

**Stage 9 — Polish / optional stretch (not required for acceptance)**
25. Generate a real app icon set via `npm run tauri icon <source.png>` if artwork is supplied.
26. Consider native menu items / global shortcuts for Open/Save (Ctrl+O / Ctrl+S) bound to the same `native-fs.ts` functions.
27. Consider Option B (`@tauri-apps/api/mocks`) for higher-fidelity e2e coverage of the real IPC layer.

---

## 11. Verification / build commands

Run from `C:\Users\warun\mdsheep-tauri` after each relevant stage:

```powershell
npm install                       # Stage 1
npm run typecheck                 # after Stage 2+
npm run lint                      # after Stage 5+
npm test                          # after Stage 7
npx playwright install            # once, before Stage 8
npm run test:e2e                  # after Stage 8
npm run dev                       # Vite-only smoke check (Stage 6)
npm run tauri dev                 # native window smoke check (Stage 6, real Open/Save)
npm run build                     # production frontend build (tsc -b && vite build)
npm run tauri build               # full native installer/bundle build
```

Full gate before declaring the port done:
```powershell
npm run typecheck && npm run lint && npm test && npm run test:e2e && npm run build && npm run tauri build
```

---

## 12. Acceptance criteria

- [ ] `markdown-mermaid-editor` has zero modified files (verify with `git status` / `git diff` in the source repo before and after — should be identical).
- [ ] `mdsheep-tauri` builds cleanly: `npm run build` and `npm run tauri build` both succeed with no errors.
- [ ] `npm run typecheck` and `npm run lint` pass with zero errors.
- [ ] `npm test` (Vitest) passes — all 16 source test files present in some form (14 ported verbatim, 2 rewritten for native I/O), plus the one `EditorLayout.test.tsx` sub-test updated.
- [ ] `npm run test:e2e` (Playwright) passes across all 3 projects (`desktop`, `mobile-chromium`, `mobile-webkit`), including the `@axe-core/playwright` accessibility assertions.
- [ ] `npm run tauri dev` opens a native window where:
  - [ ] Typing in the editor live-updates the preview, including Mermaid diagrams, with the same debounce/error/stability behavior as the source app.
  - [ ] "Open" shows a native OS file picker filtered to `.md`/`.markdown`, and the exact byte content of the chosen file appears in the editor (including trailing whitespace).
  - [ ] "Export" shows a native OS save dialog defaulting to `document-YYYY-MM-DD.md`, and writes the exact current Markdown to the chosen path.
  - [ ] Clicking an external link (`http(s)://`, `mailto:`) in the preview opens the OS default browser/mail client instead of navigating the app window.
  - [ ] Theme, pane ratio/collapse state, and all settings persist across app restarts (same `localStorage` keys/versions as source).
  - [ ] Resizing behavior (drag, keyboard, snap points, collapse rails) is pixel/behavior-identical to the source app.
  - [ ] Mobile-width behavior (resize the window narrow) still switches to single-pane Edit/Preview via the same radio-button CSS mechanism.
- [ ] No Content-Security-Policy violations appear in the WebView devtools console during normal use (theme script executes, Mermaid SVG renders, no blocked resources).
- [ ] `src-tauri/capabilities/default.json` grants only `dialog`, `fs`, and `shell` permissions actually used — no broader capability set.
