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

  it("provides controls and applies every setting live", async () => {
    const user = userEvent.setup();
    await renderEditor();
    await user.click(screen.getByRole("button", { name: "Settings" }));

    const editorSize = screen.getByRole("slider", { name: "Editor font size" });
    const previewSize = screen.getByRole("slider", { name: "Preview font size" });
    fireEvent.change(editorSize, { target: { value: "18" } });
    fireEvent.change(previewSize, { target: { value: "17" } });
    await user.selectOptions(screen.getByRole("combobox", { name: "Line spacing" }), "relaxed");
    await user.click(screen.getByRole("checkbox", { name: "Word wrap" }));
    await user.click(screen.getByRole("checkbox", { name: "Spellcheck" }));
    await user.click(screen.getByRole("checkbox", { name: "Show word and line stats" }));

    expect(screen.getByText("18 px")).toBeInTheDocument();
    expect(screen.getByText("17 px")).toBeInTheDocument();
    const editor = screen.getByRole("textbox", { name: "Markdown editor" });
    expect(editor).toHaveStyle({ fontSize: "18px", lineHeight: "1.75", overflowX: "auto" });
    expect(editor).toHaveAttribute("wrap", "off");
    expect(editor).toHaveAttribute("spellcheck", "false");
    expect(screen.getByLabelText("Preview content")).toHaveStyle({ fontSize: "17px" });
    expect(screen.queryByText(/words ·/)).not.toBeInTheDocument();
  });

  it("resets controls and live output to defaults", async () => {
    const user = userEvent.setup();
    await renderEditor();
    await user.click(screen.getByRole("button", { name: "Settings" }));
    const editorSize = screen.getByRole("slider", { name: "Editor font size" });
    fireEvent.change(editorSize, { target: { value: "17" } });
    await user.click(screen.getByRole("button", { name: "Reset defaults" }));
    expect(editorSize).toHaveValue("16");
    expect(screen.getByRole("checkbox", { name: "Word wrap" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: "Markdown editor" })).toHaveStyle({ fontSize: "16px" });
  });
});
