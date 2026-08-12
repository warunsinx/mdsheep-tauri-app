import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaneResizer } from "@/components/PaneResizer";

describe("PaneResizer", () => {
  it("exposes separator semantics and adjusts by keyboard", () => {
    const onChange = vi.fn();
    render(<PaneResizer ratio={50} onChange={onChange} />);
    const separator = screen.getByRole("separator", { name: "Resize editor and preview panes" });

    expect(separator).toHaveAttribute("aria-orientation", "vertical");
    expect(separator).toHaveAttribute("aria-valuemin", "0");
    expect(separator).toHaveAttribute("aria-valuemax", "100");
    expect(separator).toHaveAttribute("aria-valuenow", "50");
    expect(separator).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    fireEvent.keyDown(separator, { key: "ArrowRight" });
    fireEvent.keyDown(separator, { key: "Home" });
    fireEvent.keyDown(separator, { key: "End" });

    expect(onChange.mock.calls.map(([value]) => value)).toEqual([25, 75, 0, 100]);
  });

  it("clamps keyboard changes and resets to an even split on double-click", () => {
    const onChange = vi.fn();
    const { rerender } = render(<PaneResizer ratio={0} onChange={onChange} />);
    const separator = screen.getByRole("separator");
    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith(0);

    rerender(<PaneResizer ratio={100} onChange={onChange} />);
    fireEvent.keyDown(separator, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(100);

    fireEvent.doubleClick(separator);
    expect(onChange).toHaveBeenLastCalledWith(50);
  });

  it.each(["pointerup", "pointercancel"])("updates continuously while dragging, then snaps on %s", (releaseEvent) => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(<div><PaneResizer ratio={50} onChange={onChange} onCommit={onCommit} /></div>);
    const separator = screen.getByRole("separator");
    Object.defineProperty(separator.parentElement, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 1000, top: 0, right: 1000, bottom: 500, height: 500, x: 0, y: 0, toJSON() {} }),
    });
    Object.defineProperty(separator, "setPointerCapture", { value: vi.fn() });
    fireEvent.pointerDown(separator, { pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 630, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(63);
    fireEvent(window, new PointerEvent(releaseEvent, { clientX: 630, pointerId: 1 }));
    expect(onCommit).toHaveBeenCalledWith(75);
  });

  it("keeps the exact clamped live pointer value, then snaps only on release", () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(<main><PaneResizer ratio={50} onChange={onChange} onCommit={onCommit} /></main>);
    const separator = screen.getByRole("separator");
    const layout = separator.parentElement!;
    Object.defineProperty(layout, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 1000, top: 0, right: 1000, bottom: 500, height: 500, x: 0, y: 0, toJSON() {} }),
    });
    Object.defineProperty(separator, "setPointerCapture", { value: vi.fn() });

    fireEvent.pointerDown(separator, { pointerId: 1 });
    expect(layout).toHaveClass("pane-is-dragging");
    fireEvent.pointerMove(window, { clientX: 270, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(27);
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(window, { pointerId: 1 });
    expect(layout).not.toHaveClass("pane-is-dragging");
    expect(onCommit).toHaveBeenLastCalledWith(25);
  });
});
