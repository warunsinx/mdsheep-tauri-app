import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorLayout } from "@/components/EditorLayout";
import { ThemeProvider } from "@/context/ThemeContext";

const renderEditor = async (value: string, start: number, end: number) => {
  render(<ThemeProvider><EditorLayout /></ThemeProvider>);
  await act(() => new Promise((resolve) => window.setTimeout(resolve, 1)));
  const editor = screen.getByRole("textbox", { name: "Markdown editor" }) as HTMLTextAreaElement;
  fireEvent.change(editor, { target: { value } });
  editor.focus();
  editor.setSelectionRange(start, end);
  return editor;
};

const selectionOf = (editor: HTMLTextAreaElement) => [editor.selectionStart, editor.selectionEnd];

afterEach(() => {
  Reflect.deleteProperty(document, "execCommand");
});

describe("format toolbar commands", () => {
  it("applies a clicked command to the editor selection and renders it in the preview", async () => {
    const editor = await renderEditor("hello world", 0, 5);

    fireEvent.click(screen.getByRole("button", { name: "Bold (Ctrl+B)" }));

    expect(editor).toHaveValue("**hello** world");
    expect(selectionOf(editor)).toEqual([2, 7]);
    expect(document.querySelector(".preview-pane strong")).toHaveTextContent("hello");
  });

  it("returns the caret to the editor after a toolbar click", async () => {
    const editor = await renderEditor("hello world", 0, 5);

    fireEvent.click(screen.getByRole("button", { name: "Mermaid flowchart" }));

    expect(document.activeElement).toBe(editor);
    expect(editor.value).toContain("```mermaid");
  });

  it("ignores toolbar clicks throughout IME composition and resumes after compositionend", async () => {
    const editor = await renderEditor("hello world", 0, 5);
    const bold = screen.getByRole("button", { name: "Bold (Ctrl+B)" });

    fireEvent.compositionStart(editor);
    fireEvent.click(bold);
    expect(editor).toHaveValue("hello world");

    fireEvent.compositionEnd(editor);
    fireEvent.click(bold);
    expect(editor).toHaveValue("**hello** world");
  });
});

describe("editor keyboard commands", () => {
  it.each([
    ["b", "**hello** world", 2, 7],
    ["i", "*hello* world", 1, 6],
    ["e", "`hello` world", 1, 6],
    ["k", "[hello](url) world", 8, 11],
  ])("applies the Ctrl+%s command to the live selection", async (key, expected, start, end) => {
    const editor = await renderEditor("hello world", 0, 5);

    fireEvent.keyDown(editor, { key, ctrlKey: true });

    expect(editor).toHaveValue(expected);
    expect(selectionOf(editor)).toEqual([start, end]);
  });

  it("accepts the Meta modifier and uppercase keys", async () => {
    const editor = await renderEditor("hello world", 0, 5);

    fireEvent.keyDown(editor, { key: "B", metaKey: true });

    expect(editor).toHaveValue("**hello** world");
  });

  it("renders the applied formatting in the live preview", async () => {
    const editor = await renderEditor("hello world", 0, 5);

    fireEvent.keyDown(editor, { key: "b", ctrlKey: true });

    expect(document.querySelector(".preview-pane strong")).toHaveTextContent("hello");
  });

  it("keeps focus in the editor after a command", async () => {
    const editor = await renderEditor("hello world", 0, 5);

    fireEvent.keyDown(editor, { key: "b", ctrlKey: true });

    expect(document.activeElement).toBe(editor);
  });

  it("ignores shortcuts while an IME composition is active", async () => {
    const editor = await renderEditor("hello world", 0, 5);

    fireEvent.keyDown(editor, { key: "b", ctrlKey: true, isComposing: true });

    expect(editor).toHaveValue("hello world");
  });

  it("leaves unmapped modifier combinations alone", async () => {
    const editor = await renderEditor("hello world", 0, 5);

    fireEvent.keyDown(editor, { key: "b", ctrlKey: true, altKey: true });
    fireEvent.keyDown(editor, { key: "b" });

    expect(editor).toHaveValue("hello world");
  });

  it("does not indent when Tab is pressed with a collapsed caret", async () => {
    const editor = await renderEditor("one\ntwo", 2, 2);

    const notPrevented = fireEvent.keyDown(editor, { key: "Tab" });

    expect(notPrevented).toBe(true);
    expect(editor).toHaveValue("one\ntwo");
  });

  it("indents and outdents a multi-line selection by two spaces", async () => {
    const editor = await renderEditor("one\ntwo", 0, 7);

    fireEvent.keyDown(editor, { key: "Tab" });
    expect(editor).toHaveValue("  one\n  two");
    expect(selectionOf(editor)).toEqual([0, 11]);

    fireEvent.keyDown(editor, { key: "Tab", shiftKey: true });
    expect(editor).toHaveValue("one\ntwo");
    expect(selectionOf(editor)).toEqual([0, 7]);
  });

  it("produces an identical value and selection through the execCommand path", async () => {
    const insertText = vi.fn((command: string, _showUi: boolean, text: string) => {
      const target = document.activeElement as HTMLTextAreaElement;
      if (command !== "insertText") return false;
      const { selectionStart, selectionEnd } = target;
      const next = target.value.slice(0, selectionStart!) + text + target.value.slice(selectionEnd!);
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
      nativeSetter.call(target, next);
      target.setSelectionRange(selectionStart! + text.length, selectionStart! + text.length);
      target.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    });
    Object.defineProperty(document, "execCommand", { configurable: true, writable: true, value: insertText });
    const editor = await renderEditor("hello world", 0, 5);

    fireEvent.keyDown(editor, { key: "b", ctrlKey: true });

    expect(insertText).toHaveBeenCalledWith("insertText", false, "**hello**");
    expect(editor).toHaveValue("**hello** world");
    expect(selectionOf(editor)).toEqual([2, 7]);
  });

  it("falls back to a direct value update when execCommand is unavailable", async () => {
    const editor = await renderEditor("hello world", 0, 5);
    expect(document.execCommand).toBeUndefined();

    fireEvent.keyDown(editor, { key: "b", ctrlKey: true });

    expect(editor).toHaveValue("**hello** world");
    expect(selectionOf(editor)).toEqual([2, 7]);
  });
});
