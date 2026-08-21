import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportButton } from "@/components/ExportButton";
import { defaultExportName, saveHtmlFile, saveMarkdownFile } from "@/lib/native-fs";

vi.mock("@/lib/native-fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/native-fs")>();
  return { ...original, saveMarkdownFile: vi.fn(), saveHtmlFile: vi.fn() };
});
const mockedSave = vi.mocked(saveMarkdownFile);
const mockedSaveHtml = vi.mocked(saveHtmlFile);

afterEach(() => {
  mockedSave.mockReset();
  mockedSaveHtml.mockReset();
});

describe("ExportButton", () => {
  it("opens an accessible menu for Markdown, HTML, and print/PDF formats", async () => {
    render(<ExportButton markdown="# Exact" />);

    await userEvent.click(screen.getByRole("button", { name: "Export document" }));

    expect(screen.getByRole("menu", { name: "Export formats" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Markdown (.md)" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Standalone HTML (.html)" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Print or save as PDF" })).toBeInTheDocument();
  });

  it("moves focus through the menu and restores it on Escape", async () => {
    const user = userEvent.setup();
    render(<ExportButton markdown="# Exact" />);
    const trigger = screen.getByRole("button", { name: "Export document" });

    await user.click(trigger);
    expect(screen.getByRole("menuitem", { name: "Markdown (.md)" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Standalone HTML (.html)" })).toHaveFocus();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu", { name: "Export formats" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes the menu when keyboard users Tab away", async () => {
    const user = userEvent.setup();
    render(<ExportButton markdown="# Exact" />);

    await user.click(screen.getByRole("button", { name: "Export document" }));
    await user.keyboard("{Tab}");

    expect(screen.queryByRole("menu", { name: "Export formats" })).not.toBeInTheDocument();
  });

  it("closes when focus moves to an outside pointer target", async () => {
    const user = userEvent.setup();
    render(<div><ExportButton markdown="# Exact" /><button type="button">Outside</button></div>);

    await user.click(screen.getByRole("button", { name: "Export document" }));
    await user.click(screen.getByRole("button", { name: "Outside" }));

    expect(screen.queryByRole("menu", { name: "Export formats" })).not.toBeInTheDocument();
  });

  it("passes the exact current Markdown to native save", async () => {
    mockedSave.mockResolvedValue(true);
    render(<ExportButton markdown={"# Exact\n\nTrailing  \n"} />);
    await userEvent.click(screen.getByRole("button", { name: "Export document" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Markdown (.md)" }));
    expect(mockedSave).toHaveBeenCalledWith("# Exact\n\nTrailing  \n");
  });

  it("builds and saves sanitized standalone HTML", async () => {
    mockedSaveHtml.mockResolvedValue(true);
    render(<ExportButton markdown={"# Exported\n\n<script>alert(1)</script>"} />);

    await userEvent.click(screen.getByRole("button", { name: "Export document" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Standalone HTML (.html)" }));

    const html = mockedSaveHtml.mock.calls[0]?.[0];
    expect(html).toContain("<h1>Exported</h1>");
    expect(html).not.toContain("<script>");
  });

  it("opens the platform print dialog for PDF output", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<ExportButton markdown="# Print" />);

    await userEvent.click(screen.getByRole("button", { name: "Export document" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Print or save as PDF" }));

    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });

  it("keeps the dated export filename", () => {
    expect(defaultExportName(new Date(2026, 7, 11))).toBe("document-2026-08-11.md");
  });

  it("reports export failures accessibly", async () => {
    mockedSave.mockRejectedValue(new Error("download blocked"));
    render(<ExportButton markdown="# Draft" />);

    await userEvent.click(screen.getByRole("button", { name: "Export document" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Markdown (.md)" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("download blocked");
  });
});
