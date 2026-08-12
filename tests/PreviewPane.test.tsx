import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { PreviewPane } from "@/components/PreviewPane";

describe("PreviewPane", () => {
  afterEach(() => { globalThis.__MDSHEEP_TEST_STATE__ = undefined; });
  it("renders GFM while ignoring unsafe raw HTML", () => {
    const { container } = render(<PreviewPane markdown={'## Safe\n\n~~done~~\n\n<script>window.pwned=true</script>\n\n[bad](javascript:alert(1))\n\n| A | B |\n|---|---|\n| 1 | 2 |'} />);
    expect(screen.getByRole("heading", { name: "Safe" })).toBeInTheDocument();
    expect(container.querySelector("del")).toHaveTextContent("done");
    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(container.querySelector("a")?.getAttribute("href") ?? "").not.toMatch(/^javascript:/);
    expect(container.querySelector("table")).toBeInTheDocument();
  });

  it("routes external links to the system shell seam", async () => {
    globalThis.__MDSHEEP_TEST_STATE__ = {
      openResult: null, fileContents: {}, saveResult: null, written: [], openedExternal: [],
    };
    render(<PreviewPane markdown="[Open](https://example.com/path)" />);
    await userEvent.click(screen.getByRole("link", { name: "Open" }));
    expect(globalThis.__MDSHEEP_TEST_STATE__.openedExternal).toEqual(["https://example.com/path"]);
  });
});
