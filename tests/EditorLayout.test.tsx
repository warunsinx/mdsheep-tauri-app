import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EditorLayout } from "@/components/EditorLayout";
import { getCollapseProgress } from "@/components/EditorLayout";
import { ThemeProvider } from "@/context/ThemeContext";
import { openMarkdownFile } from "@/lib/native-fs";
import { vi } from "vitest";

vi.mock("@/lib/native-fs", () => ({ openMarkdownFile: vi.fn(), saveMarkdownFile: vi.fn() }));

const renderEditor = () => render(<ThemeProvider><EditorLayout /></ThemeProvider>);

describe("EditorLayout mobile pane controls", () => {
  it("renders the MD badge, desktop Sheep label, and accessible full brand", () => {
    renderEditor();

    expect(screen.getByText("MdSheep")).toHaveClass("sr-only");
    expect(screen.getByText("Sheep")).toHaveClass("toolbar-brand-name", "hidden", "md:inline");
    expect(screen.getByText("[MD]")).toHaveClass("brand-badge");
    expect(screen.getByText("[MD]")).not.toHaveClass("bg-white", "dark:bg-black");
  });

  it("associates visible Edit and Preview labels with same-name native radios", () => {
    renderEditor();

    const editRadio = screen.getByRole("radio", { name: "Edit" });
    const previewRadio = screen.getByRole("radio", { name: "Preview" });
    const editLabel = document.querySelector<HTMLLabelElement>("label.pane-label-edit");
    const previewLabel = document.querySelector<HTMLLabelElement>("label.pane-label-preview");

    expect(editRadio).toHaveAttribute("type", "radio");
    expect(editRadio).toBeChecked();
    expect(previewRadio).not.toBeChecked();
    expect(editRadio).toHaveAttribute("name", previewRadio.getAttribute("name"));
    expect(editRadio.getAttribute("name")).toBeTruthy();
    expect(editLabel).toHaveAttribute("for", editRadio.id);
    expect(previewLabel).toHaveAttribute("for", previewRadio.id);
  });

  it("uses a native Preview label without synthetic interaction handlers", () => {
    renderEditor();

    const previewLabel = document.querySelector<HTMLLabelElement>("label.pane-label-preview");
    expect(previewLabel).toBeInstanceOf(HTMLLabelElement);
    expect(previewLabel).not.toHaveAttribute("role");
    expect(previewLabel).not.toHaveAttribute("tabindex");
    expect(previewLabel).not.toHaveAttribute("aria-selected");
    expect(previewLabel).not.toHaveAttribute("aria-controls");
    expect(previewLabel?.onclick).toBeNull();
    expect(previewLabel?.onpointerdown).toBeNull();
    expect(previewLabel?.ontouchstart).toBeNull();
  });

  it("exposes pane-mode hooks whose CSS is driven only by the checked radio", () => {
    renderEditor();
    const editRadio = screen.getByRole("radio", { name: "Edit" });
    const previewRadio = screen.getByRole("radio", { name: "Preview" });

    fireEvent.click(previewRadio);

    expect(previewRadio).toBeChecked();
    expect(editRadio).not.toBeChecked();
    expect(screen.getByLabelText("Markdown source")).toHaveClass("editor-pane");
    expect(screen.getByLabelText("Rendered preview")).toHaveClass("preview-pane");

    const css = readFileSync("src/globals.css", "utf8");
    expect(css).toContain(".pane-mode-edit:checked ~ main .preview-pane");
    expect(css).toContain(".pane-mode-preview:checked ~ main .editor-pane");
    expect(css).toContain(".pane-mode-edit:checked ~ .editor-toolbar .pane-label-edit");
    expect(css).toContain(".pane-mode-preview:focus-visible ~ .editor-toolbar .pane-label-preview");
  });

  it("preserves edited text while the checked radio changes", async () => {
    const user = userEvent.setup();
    renderEditor();
    const editor = screen.getByRole("textbox", { name: "Markdown editor" });
    await act(() => new Promise((resolve) => window.setTimeout(resolve, 1)));
    await user.clear(editor);
    await user.type(editor, "# Fresh draft");

    await user.click(document.querySelector("label.pane-label-preview")!);

    expect(screen.getByRole("radio", { name: "Preview" })).toBeChecked();
    expect(screen.getByRole("heading", { name: "Fresh draft" })).toBeInTheDocument();
    await user.click(document.querySelector("label.pane-label-edit")!);
    expect(editor).toHaveValue("# Fresh draft");
  });

  it("selects Edit after opening a file from Preview", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(document.querySelector("label.pane-label-preview")!);
    expect(screen.getByRole("radio", { name: "Preview" })).toBeChecked();

    vi.mocked(openMarkdownFile).mockResolvedValue({ name: "opened.markdown", content: "# Opened locally" });
    await user.click(screen.getByRole("button", { name: "Open Markdown file" }));

    expect(await screen.findByRole("textbox", { name: "Markdown editor" })).toHaveValue("# Opened locally");
    expect(screen.getByRole("radio", { name: "Edit" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Preview" })).not.toBeChecked();
  });

  it("keeps pane title bars free of live and document-stat metadata", () => {
    renderEditor();

    expect(document.querySelector(".editor-pane .pane-heading-title")).toHaveTextContent("Markdown");
    expect(document.querySelector(".preview-pane .pane-heading-title")).toHaveTextContent("Preview");
    expect(document.querySelector("#document-count")).not.toBeInTheDocument();
    expect(screen.queryByText("Live")).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Show word and line stats" })).not.toBeInTheDocument();

    const css = readFileSync("src/globals.css", "utf8");
    expect(css).toMatch(/\.pane-layout\s*\{[\s\S]*?overflow:\s*hidden/);
    expect(css).toMatch(/\.editor-pane,\s*\.preview-pane\s*\{[\s\S]*?min-width:\s*0[\s\S]*?min-height:\s*0[\s\S]*?height:\s*100%[\s\S]*?overflow:\s*hidden/);
    expect(css).toMatch(/\.editor-scroll,\s*\.preview-scroll\s*\{[\s\S]*?overflow-y:\s*auto[\s\S]*?overscroll-behavior:\s*contain[\s\S]*?-webkit-overflow-scrolling:\s*touch/);
    expect(css).toMatch(/\.editor-pane,\s*\.preview-pane\s*\{[\s\S]*?container-type:\s*inline-size/);
    expect(css).toMatch(/@container\s*\(max-width:\s*340px\)[\s\S]*?\.pane-heading\s*\{[\s\S]*?justify-content:\s*center/);
    expect(css).toMatch(/\.pane-layout\s*\{[\s\S]*?transition:\s*grid-template-columns/);
    expect(css).toMatch(/\.pane-layout\.pane-is-dragging\s*\{[\s\S]*?transition:\s*none/);
  });

  it("renders the formatting row between the brand row and the mobile view switch", () => {
    renderEditor();

    const rows = Array.from(document.querySelector(".editor-toolbar")!.children);
    expect(rows).toHaveLength(3);
    expect(rows[0].className).toContain("h-14");
    expect(rows[1]).toHaveClass("format-bar");
    expect(rows[1]).toContainElement(screen.getByRole("toolbar", { name: "Markdown formatting" }));
    expect(rows[2].className).toContain("md:hidden");
  });

  it("scrolls the formatting row instead of the header and hides it in mobile preview mode", () => {
    const css = readFileSync("src/globals.css", "utf8");

    expect(css).toMatch(/\.format-bar\s*\{[\s\S]*?min-width:\s*0/);
    expect(css).toMatch(/\.format-bar-scroll\s*\{[\s\S]*?min-width:\s*0[\s\S]*?overflow-x:\s*auto/);
    expect(css).toContain(".pane-mode-preview:checked ~ .editor-toolbar .format-bar");
    expect(css).toMatch(/\.view-mode-group\s*\{[\s\S]*?flex:\s*none/);
    expect(css).toMatch(/\.view-mode-group\s+button\[aria-pressed="true"\]\s*\{[\s\S]*?color:\s*var\(--accent-soft-text\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*380px\)[\s\S]*?\.editor-toolbar\s*>\s*div:first-child/);
  });

  it("exposes progressive collapse variables and frosted pane overlays", () => {
    renderEditor();

    const layout = document.querySelector<HTMLElement>("main.pane-layout")!;
    expect(layout.style.getPropertyValue("--editor-collapse-progress")).toBe("0");
    expect(layout.style.getPropertyValue("--preview-collapse-progress")).toBe("0");

    const css = readFileSync("src/globals.css", "utf8");
    expect(getCollapseProgress(12, "editor")).toBeCloseTo(0.9745196032, 6);
    expect(getCollapseProgress(88, "preview")).toBeCloseTo(0.9745196032, 6);
    expect(css).toMatch(/\.editor-pane::after,\s*\.preview-pane::after\s*\{[\s\S]*?pointer-events:\s*none[\s\S]*?background:\s*rgb\(255 255 255 \/ \.9\)[\s\S]*?backdrop-filter:\s*blur\((?:1[2-6])px\)/);
    expect(css).toMatch(/\.editor-pane::after\s*\{[\s\S]*?opacity:\s*var\(--editor-collapse-progress\)/);
    expect(css).toMatch(/\.preview-pane::after\s*\{[\s\S]*?opacity:\s*var\(--preview-collapse-progress\)/);
    expect(css).toMatch(/\.pane-layout\.pane-is-dragging[\s\S]*?::after\s*\{[\s\S]*?background:\s*rgb\(255 255 255 \/ \.99[0-9]?\)[\s\S]*?backdrop-filter:\s*blur\([0-2]px\)[\s\S]*?transition:\s*none/);
  });
});

describe("EditorLayout desktop view mode", () => {
  const nativeMatchMedia = window.matchMedia;

  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query === "(min-width: 768px)",
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: nativeMatchMedia });
  });

  it("maps the view-mode buttons onto the persisted pane ratios", async () => {
    renderEditor();
    await act(() => new Promise((resolve) => window.setTimeout(resolve, 1)));
    const separator = screen.getByRole("separator", { name: "Resize editor and preview panes" });
    expect(document.querySelector(".format-bar")).toContainElement(screen.getByRole("group", { name: "View mode" }));

    fireEvent.click(screen.getByRole("button", { name: "Editor only" }));
    expect(separator).toHaveAttribute("aria-valuenow", "100");
    expect(window.localStorage.getItem("md-editor:pane-ratio:v2")).toBe("100");

    fireEvent.click(screen.getByRole("button", { name: "Preview only" }));
    expect(separator).toHaveAttribute("aria-valuenow", "0");
    expect(window.localStorage.getItem("md-editor:pane-ratio:v2")).toBe("0");
    expect(screen.getByRole("button", { name: "Preview only" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Split view" }));
    expect(separator).toHaveAttribute("aria-valuenow", "50");
    expect(window.localStorage.getItem("md-editor:pane-ratio:v2")).toBe("50");
  });

  it("disables formatting while the editor pane is collapsed", async () => {
    renderEditor();
    await act(() => new Promise((resolve) => window.setTimeout(resolve, 1)));
    expect(screen.getByRole("button", { name: "Bold (Ctrl+B)" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Preview only" }));

    expect(screen.getByRole("button", { name: "Bold (Ctrl+B)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mermaid flowchart" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Split view" }));

    expect(screen.getByRole("button", { name: "Bold (Ctrl+B)" })).toBeEnabled();
  });
});
