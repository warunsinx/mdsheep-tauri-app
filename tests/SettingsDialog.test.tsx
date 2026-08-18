import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EditorLayout } from "@/components/EditorLayout";
import { ThemeProvider } from "@/context/ThemeContext";

const renderEditor = async () => {
  render(<ThemeProvider><EditorLayout /></ThemeProvider>);
  await act(() => new Promise((resolve) => window.setTimeout(resolve, 1)));
};

describe("Settings dialog", () => {
  it("opens an accessible dialog and closes with Escape", async () => {
    const user = userEvent.setup();
    await renderEditor();
    const trigger = screen.getByRole("button", { name: "Settings" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    await user.keyboard("{Escape}");
    expect(dialog).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("restores the last saved settings when dismissed without saving", async () => {
    const user = userEvent.setup();
    await renderEditor();
    await user.click(screen.getByRole("button", { name: "Settings" }));

    const editorSize = screen.getByRole("slider", { name: "Editor font size" });
    fireEvent.keyDown(editorSize, { key: "ArrowRight" });
    expect(screen.getByRole("textbox", { name: "Markdown editor" })).toHaveStyle({ fontSize: "17px" });

    await user.keyboard("{Escape}");
    expect(screen.getByRole("textbox", { name: "Markdown editor" })).toHaveStyle({ fontSize: "16px" });
    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("slider", { name: "Editor font size" })).toHaveValue(16);
  });

  it("renders accessible Radix controls with shadcn data slots", async () => {
    const user = userEvent.setup();
    await renderEditor();
    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByRole("slider", { name: "Editor font size" })).toHaveAttribute("data-slot", "slider-thumb");
    expect(screen.getByRole("slider", { name: "Editor font size" }).closest('[data-slot="slider"]')).not.toBeNull();
    expect(screen.getByRole("combobox", { name: "Line spacing" })).toHaveAttribute("data-slot", "select-trigger");
    expect(screen.getByRole("switch", { name: "Word wrap" })).toHaveAttribute("data-slot", "switch");
    expect(screen.queryByRole("switch", { name: "Show word and line stats" })).not.toBeInTheDocument();
  });

  it("offers clickable font-size snap points across the expanded ranges", async () => {
    const user = userEvent.setup();
    await renderEditor();
    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByRole("slider", { name: "Editor font size" })).toHaveAttribute("aria-valuemax", "36");
    expect(screen.getByRole("slider", { name: "Preview font size" })).toHaveAttribute("aria-valuemin", "12");
    await user.click(screen.getByRole("button", { name: "Set Editor font size to 24 pixels" }));

    expect(screen.getByRole("textbox", { name: "Markdown editor" })).toHaveStyle({ fontSize: "24px" });
    expect(screen.getByText("24 px")).toBeInTheDocument();
  });

  it("provides controls and applies every setting live", async () => {
    const user = userEvent.setup();
    await renderEditor();
    await user.click(screen.getByRole("button", { name: "Settings" }));

    const editorSize = screen.getByRole("slider", { name: "Editor font size" });
    const previewSize = screen.getByRole("slider", { name: "Preview font size" });
    fireEvent.keyDown(editorSize, { key: "ArrowRight" });
    fireEvent.keyDown(editorSize, { key: "ArrowRight" });
    fireEvent.keyDown(previewSize, { key: "ArrowRight" });
    const lineSpacing = screen.getByRole("combobox", { name: "Line spacing" });
    fireEvent.keyDown(lineSpacing, { key: "Enter" });
    fireEvent.click(screen.getByRole("option", { name: "Relaxed" }));
    await user.click(screen.getByRole("switch", { name: "Word wrap" }));
    await user.click(screen.getByRole("switch", { name: "Spellcheck" }));

    expect(screen.getByText("18 px")).toBeInTheDocument();
    expect(screen.getByText("17 px")).toBeInTheDocument();
    const editor = screen.getByRole("textbox", { name: "Markdown editor" });
    expect(editor).toHaveStyle({ fontSize: "18px", lineHeight: "1.75", overflowX: "auto" });
    expect(editor).toHaveAttribute("wrap", "off");
    expect(editor).toHaveAttribute("spellcheck", "false");
    expect(screen.getByLabelText("Preview content")).toHaveStyle({ fontSize: "17px" });
    expect(screen.queryByText(/words ·/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(JSON.parse(window.localStorage.getItem("md-editor:settings:v1") ?? "null")?.settings).toMatchObject({
      editorFontSize: 18,
      previewFontSize: 17,
      lineHeight: "relaxed",
      wordWrap: false,
      spellcheck: false,
      showStats: true,
    });
  });

  it("restores the most recently saved values after later edits are cancelled", async () => {
    const user = userEvent.setup();
    await renderEditor();
    await user.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.keyDown(screen.getByRole("slider", { name: "Editor font size" }), { key: "ArrowRight" });
    await user.click(screen.getByRole("button", { name: "Save" }));

    await user.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.keyDown(screen.getByRole("slider", { name: "Editor font size" }), { key: "ArrowRight" });
    await user.click(screen.getByRole("button", { name: "Close settings" }));

    expect(screen.getByRole("textbox", { name: "Markdown editor" })).toHaveStyle({ fontSize: "17px" });
  });

  it("resets controls and live output to defaults", async () => {
    const user = userEvent.setup();
    await renderEditor();
    await user.click(screen.getByRole("button", { name: "Settings" }));
    const editorSize = screen.getByRole("slider", { name: "Editor font size" });
    fireEvent.keyDown(editorSize, { key: "ArrowRight" });
    await user.click(screen.getByRole("button", { name: "Reset defaults" }));
    expect(editorSize).toHaveValue(16);
    expect(screen.getByRole("switch", { name: "Word wrap" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: "Markdown editor" })).toHaveStyle({ fontSize: "16px" });
  });
});
