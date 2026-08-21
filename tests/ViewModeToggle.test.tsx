import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ViewModeToggle } from "@/components/ViewModeToggle";

const pressedState = () =>
  Object.fromEntries(
    ["Editor only", "Split view", "Preview only"].map((name) => [
      name,
      screen.getByRole("button", { name }).getAttribute("aria-pressed"),
    ]),
  );

describe("ViewModeToggle", () => {
  it("renders a labelled desktop-only group of three view modes", () => {
    render(<ViewModeToggle ratio={50} onSelect={vi.fn()} />);
    const group = screen.getByRole("group", { name: "View mode" });

    expect(group).toHaveClass("view-mode-group", "hidden", "md:flex");
    expect(group.querySelectorAll("button")).toHaveLength(3);
  });

  it.each([
    [100, { "Editor only": "true", "Split view": "false", "Preview only": "false" }],
    [50, { "Editor only": "false", "Split view": "true", "Preview only": "false" }],
    [0, { "Editor only": "false", "Split view": "false", "Preview only": "true" }],
    [25, { "Editor only": "false", "Split view": "false", "Preview only": "false" }],
    [75, { "Editor only": "false", "Split view": "false", "Preview only": "false" }],
  ])("derives the pressed mode from ratio %i", (ratio, expected) => {
    render(<ViewModeToggle ratio={ratio} onSelect={vi.fn()} />);

    expect(pressedState()).toEqual(expected);
  });

  it.each([
    ["Editor only", 100],
    ["Split view", 50],
    ["Preview only", 0],
  ])("selects the pane ratio behind %s", (name, ratio) => {
    const onSelect = vi.fn();
    render(<ViewModeToggle ratio={50} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name }));

    expect(onSelect).toHaveBeenCalledExactlyOnceWith(ratio);
  });

  it("titles every button for hover discovery", () => {
    render(<ViewModeToggle ratio={50} onSelect={vi.fn()} />);

    for (const button of screen.getByRole("group", { name: "View mode" }).querySelectorAll("button")) {
      expect(button).toHaveAttribute("type", "button");
      expect(button.getAttribute("title")).toBe(button.getAttribute("aria-label"));
    }
  });
});
