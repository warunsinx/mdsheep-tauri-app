import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditorPane } from "@/components/EditorPane";
import { PreviewPane } from "@/components/PreviewPane";
import { DEFAULT_SETTINGS } from "@/lib/settings";

describe("collapsed desktop pane rails", () => {
  it("keeps the hidden Markdown content mounted and reopens the editor", () => {
    const onReopen = vi.fn();
    const { rerender } = render(<EditorPane value="draft" onChange={vi.fn()} settings={DEFAULT_SETTINGS} collapsed onReopen={onReopen} />);
    const editor = document.querySelector<HTMLTextAreaElement>("#markdown-editor")!;
    const shell = document.querySelector<HTMLElement>(".editor-pane .pane-content-shell")!;
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute("tabindex", "-1");
    expect(shell).toHaveAttribute("aria-hidden", "true");
    expect(shell).toHaveClass("pane-content-shell-collapsed");
    fireEvent.click(screen.getByRole("button", { name: "Reopen Markdown editor" }));
    expect(onReopen).toHaveBeenCalledOnce();
    rerender(<EditorPane value="draft" onChange={vi.fn()} settings={DEFAULT_SETTINGS} onReopen={onReopen} />);
    expect(document.querySelector("#markdown-editor")).toBe(editor);
    expect(editor).not.toHaveAttribute("tabindex");
    expect(shell).toHaveAttribute("aria-hidden", "false");
  });

  it("keeps hidden Preview content mounted and reopens the preview", () => {
    const onReopen = vi.fn();
    render(<PreviewPane markdown="# Hidden heading" collapsed onReopen={onReopen} />);
    const shell = document.querySelector<HTMLElement>(".preview-pane .pane-content-shell")!;
    expect(shell).toHaveAttribute("aria-hidden", "true");
    expect(shell).toHaveClass("pane-content-shell-collapsed");
    expect(shell.querySelector("h1")).toHaveTextContent("Hidden heading");
    fireEvent.click(screen.getByRole("button", { name: "Reopen Preview pane" }));
    expect(onReopen).toHaveBeenCalledOnce();
  });
});
