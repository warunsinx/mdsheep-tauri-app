import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PreviewPane } from "@/components/PreviewPane";
import { applyCommand, type CommandId } from "@/lib/markdown-commands";

// Parser-level coverage: the toolbar's job is not to emit a particular string but
// to emit Markdown that the preview renders back as the text the user selected.
const renderCommand = (id: CommandId, value: string) => {
  const result = applyCommand(id, value, { start: 0, end: value.length });
  const { container } = render(<PreviewPane markdown={result.value} />);
  return { markdown: result.value, container };
};

describe("inline emphasis remains parser-correct in surrounding words", () => {
  it("renders a partial-word italic selection as emphasis", () => {
    const result = applyCommand("italic", "foobar", { start: 3, end: 6 });
    const { container } = render(<PreviewPane markdown={result.value} />);

    expect(result.value).toBe("foo*bar*");
    expect(container.querySelector("em")?.textContent).toBe("bar");
  });
});

describe("delimiter-bearing emphasis selections remain parser-correct", () => {
  it.each([
    ["italic" as const, "a*b", "em"],
    ["bold" as const, "a**b", "strong"],
    ["strikethrough" as const, "a~~b", "del"],
  ])("renders the complete %s selection", (command, source, selector) => {
    const result = applyCommand(command, source, { start: 0, end: source.length });
    const { container } = render(<PreviewPane markdown={result.value} />);

    expect(container.querySelector(selector)?.textContent).toBe(source);
    expect(container.querySelector("[data-pane-content='preview']")?.textContent).toBe(source);
  });
});

describe("inline code renders the selection verbatim", () => {
  it.each(["plain", "a`b", "a``b", "`x", "x`", "`", "``"])("renders %j as one code span", (selected) => {
    const { container, markdown } = renderCommand("code", selected);
    const spans = container.querySelectorAll("[data-pane-content='preview'] code");

    expect(spans).toHaveLength(1);
    expect(spans[0].textContent, markdown).toBe(selected);
  });

  it.each([
    ["`a", { start: 1, end: 2 }],
    ["a`", { start: 0, end: 1 }],
  ] as const)("renders selected a beside an unmatched backtick in %j as code", (value, selection) => {
    const result = applyCommand("code", value, selection);
    const { container } = render(<PreviewPane markdown={result.value} />);
    const spans = container.querySelectorAll("[data-pane-content='preview'] code");

    expect(spans, result.value).toHaveLength(1);
    expect(spans[0].textContent, result.value).toBe("a");
  });

  it("keeps matched adjacent delimiters as a toggle rather than nesting code", () => {
    const result = applyCommand("code", "`a`", { start: 1, end: 2 });
    const { container } = render(<PreviewPane markdown={result.value} />);

    expect(result.value).toBe("a");
    expect(container.querySelector("[data-pane-content='preview'] code")).toBeNull();
    expect(container.querySelector("[data-pane-content='preview']")?.textContent).toBe("a");
  });
});

describe("link labels and image alt text survive rendering", () => {
  it.each(["docs", "a [b] c", "a]b", "back\\slash", "[full]"])("renders %j as the link label", (selected) => {
    const { container, markdown } = renderCommand("link", selected);
    const links = container.querySelectorAll("[data-pane-content='preview'] a");

    expect(links, markdown).toHaveLength(1);
    expect(links[0].textContent, markdown).toBe(selected);
    expect(links[0].getAttribute("href"), markdown).toBe("url");
  });

  it.each(["https://mdsheep.dev docs", "https://mdsheep.dev/a(b)", "https://", "https://example.com\\"])(
    "keeps %j out of the href when it is not a whole target",
    (selected) => {
      const { container, markdown } = renderCommand("link", selected);
      const placeholder = container.querySelector("[data-pane-content='preview'] a[href='url']");

      expect(placeholder, markdown).not.toBeNull();
      expect(placeholder?.textContent, markdown).toBe(selected);
    },
  );

  it.each(["logo", "a [b] c", "a]b", "back\\slash"])("renders %j as the image alt text", (selected) => {
    const { container, markdown } = renderCommand("image", selected);
    const images = container.querySelectorAll("[data-pane-content='preview'] img");

    expect(images, markdown).toHaveLength(1);
    expect(images[0].getAttribute("alt"), markdown).toBe(selected);
  });
});

describe("code blocks keep the whole selection fenced", () => {
  it.each(["let x = 1", "```\nx\n```", "   ````  ", "~~~\nx\n~~~", "```js\nx\n```"])(
    "renders %j inside a single block",
    (selected) => {
      const { container, markdown } = renderCommand("codeBlock", selected);
      const blocks = container.querySelectorAll("[data-pane-content='preview'] pre");

      expect(blocks, markdown).toHaveLength(1);
      expect(blocks[0].textContent?.replace(/\n$/, ""), markdown).toBe(selected);
    },
  );
});
