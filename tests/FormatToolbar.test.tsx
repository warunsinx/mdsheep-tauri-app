import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormatToolbar } from "@/components/FormatToolbar";

const toolbarButtons = () =>
  Array.from(screen.getByRole("toolbar", { name: "Markdown formatting" }).querySelectorAll("button"));

describe("FormatToolbar", () => {
  it("renders an accessible horizontal toolbar", () => {
    render(<FormatToolbar onCommand={vi.fn()} />);
    const toolbar = screen.getByRole("toolbar", { name: "Markdown formatting" });

    expect(toolbar).toHaveAttribute("aria-orientation", "horizontal");
    expect(toolbarButtons()).toHaveLength(14);
  });

  it("labels every button and names the shortcut where one exists", () => {
    render(<FormatToolbar onCommand={vi.fn()} />);

    for (const button of toolbarButtons()) {
      expect(button.getAttribute("aria-label")).toBeTruthy();
      expect(button).toHaveAttribute("type", "button");
      expect(button.getAttribute("title")).toBe(button.getAttribute("aria-label"));
    }
    expect(screen.getByRole("button", { name: "Bold (Ctrl+B)" })).toHaveAttribute("aria-keyshortcuts", "Control+B");
    expect(screen.getByRole("button", { name: "Italic (Ctrl+I)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link (Ctrl+K)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inline code (Ctrl+E)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Table" })).toBeInTheDocument();
  });

  it("does not report transient formatting state as a pressed toggle", () => {
    render(<FormatToolbar onCommand={vi.fn()} />);

    for (const button of toolbarButtons()) expect(button).not.toHaveAttribute("aria-pressed");
  });

  it("exposes exactly one tab stop", () => {
    render(<FormatToolbar onCommand={vi.fn()} />);
    const [first, ...rest] = toolbarButtons();

    expect(first).toHaveAttribute("tabindex", "0");
    for (const button of rest) expect(button).toHaveAttribute("tabindex", "-1");
  });

  it("moves roving focus with the arrow, Home, and End keys", () => {
    render(<FormatToolbar onCommand={vi.fn()} />);
    const toolbar = screen.getByRole("toolbar", { name: "Markdown formatting" });
    const buttons = toolbarButtons();
    const last = buttons.length - 1;

    fireEvent.keyDown(toolbar, { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[1]);
    expect(buttons[1]).toHaveAttribute("tabindex", "0");
    expect(buttons[0]).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(toolbar, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(buttons[0]);

    fireEvent.keyDown(toolbar, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(buttons[0]);

    fireEvent.keyDown(toolbar, { key: "End" });
    expect(document.activeElement).toBe(buttons[last]);

    fireEvent.keyDown(toolbar, { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[last]);

    fireEvent.keyDown(toolbar, { key: "Home" });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("separates groups with decorative dividers that never take focus", () => {
    render(<FormatToolbar onCommand={vi.fn()} />);
    const dividers = screen
      .getByRole("toolbar", { name: "Markdown formatting" })
      .querySelectorAll(".format-divider");

    expect(dividers.length).toBeGreaterThan(0);
    for (const divider of dividers) {
      expect(divider).toHaveAttribute("aria-hidden", "true");
      expect(divider).not.toHaveAttribute("tabindex");
    }
  });

  it("reports the activated command", () => {
    const onCommand = vi.fn();
    render(<FormatToolbar onCommand={onCommand} />);

    fireEvent.click(screen.getByRole("button", { name: "Bold (Ctrl+B)" }));
    fireEvent.click(screen.getByRole("button", { name: "Mermaid flowchart" }));

    expect(onCommand.mock.calls).toEqual([["bold"], ["mermaid"]]);
  });

  it("prevents mousedown so the editor keeps its selection", () => {
    render(<FormatToolbar onCommand={vi.fn()} />);

    const notPrevented = fireEvent.mouseDown(screen.getByRole("button", { name: "Bold (Ctrl+B)" }));

    expect(notPrevented).toBe(false);
  });

  it("disables every button when formatting is unavailable", () => {
    const onCommand = vi.fn();
    render(<FormatToolbar onCommand={onCommand} disabled />);

    for (const button of toolbarButtons()) expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Bold (Ctrl+B)" }));
    expect(onCommand).not.toHaveBeenCalled();
  });
});
