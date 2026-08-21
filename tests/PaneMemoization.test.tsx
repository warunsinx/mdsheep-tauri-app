import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorLayout } from "@/components/EditorLayout";
import { ThemeProvider } from "@/context/ThemeContext";

const markdownRender = vi.hoisted(() => vi.fn());

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => {
    markdownRender();
    return <div data-testid="markdown-render">{children}</div>;
  },
}));

describe("pane memoization", () => {
  beforeEach(() => markdownRender.mockClear());

  it("does not rerender ReactMarkdown during repeated ratio-only changes", async () => {
    render(<ThemeProvider><EditorLayout /></ThemeProvider>);
    await act(() => new Promise((resolve) => window.setTimeout(resolve, 1)));
    const rendersBeforeDrag = markdownRender.mock.calls.length;
    const separator = screen.getByRole("separator", { name: "Resize editor and preview panes" });

    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    fireEvent.keyDown(separator, { key: "ArrowRight" });
    fireEvent.keyDown(separator, { key: "Home" });

    expect(markdownRender).toHaveBeenCalledTimes(rendersBeforeDrag);
  });

  it("rerenders ReactMarkdown exactly once per format command", async () => {
    render(<ThemeProvider><EditorLayout /></ThemeProvider>);
    await act(() => new Promise((resolve) => window.setTimeout(resolve, 1)));
    const editor = screen.getByRole("textbox", { name: "Markdown editor" }) as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "hello world" } });
    editor.focus();
    editor.setSelectionRange(0, 5);
    const rendersBeforeCommand = markdownRender.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Bold (Ctrl+B)" }));

    expect(editor).toHaveValue("**hello** world");
    expect(markdownRender).toHaveBeenCalledTimes(rendersBeforeCommand + 1);
  });
});
