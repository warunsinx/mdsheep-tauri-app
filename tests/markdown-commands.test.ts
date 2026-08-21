import { describe, expect, it } from "vitest";
import { COMMAND_SHORTCUTS, applyCommand, indentLines, type CommandId } from "@/lib/markdown-commands";

describe("inline wrap commands", () => {
  it("wraps a selection and keeps the original text selected inside the markers", () => {
    expect(applyCommand("bold", "hello world", { start: 0, end: 5 })).toEqual({
      value: "**hello** world",
      selectionStart: 2,
      selectionEnd: 7,
    });
  });

  it("inserts both markers with the caret between them in an empty document", () => {
    expect(applyCommand("bold", "", { start: 0, end: 0 })).toEqual({
      value: "****",
      selectionStart: 2,
      selectionEnd: 2,
    });
  });

  it("wraps the whole word when the caret sits inside a word", () => {
    expect(applyCommand("bold", "hello world", { start: 2, end: 2 })).toEqual({
      value: "**hello** world",
      selectionStart: 2,
      selectionEnd: 7,
    });
  });

  it("unwraps when the markers are inside the selection", () => {
    expect(applyCommand("bold", "**bold**", { start: 0, end: 8 })).toEqual({
      value: "bold",
      selectionStart: 0,
      selectionEnd: 4,
    });
  });

  it("unwraps when the markers sit immediately outside the selection", () => {
    expect(applyCommand("bold", "**bold**", { start: 2, end: 6 })).toEqual({
      value: "bold",
      selectionStart: 0,
      selectionEnd: 4,
    });
  });

  it.each([
    ["italic" as const, "*word*"],
    ["strikethrough" as const, "~~word~~"],
    ["code" as const, "`word`"],
  ])("uses the expected markers for %s", (id, expected) => {
    expect(applyCommand(id, "word", { start: 0, end: 4 }).value).toBe(expected);
  });
});

describe("inline code delimiters", () => {
  it.each([
    ["`a", { start: 1, end: 2 }, "` ``a``", 4, 5],
    ["a`", { start: 0, end: 1 }, "``a`` `", 2, 3],
  ] as const)("keeps an unmatched adjacent backtick literal in %j", (value, selection, expected, start, end) => {
    expect(applyCommand("code", value, selection)).toEqual({
      value: expected,
      selectionStart: start,
      selectionEnd: end,
    });
  });

  it("still unwraps code whose matched delimiters sit outside the selection", () => {
    expect(applyCommand("code", "`a`", { start: 1, end: 2 })).toEqual({
      value: "a",
      selectionStart: 0,
      selectionEnd: 1,
    });
  });

  it("uses a delimiter longer than the longest backtick run in the selection", () => {
    expect(applyCommand("code", "a`b", { start: 0, end: 3 })).toEqual({
      value: "``a`b``",
      selectionStart: 2,
      selectionEnd: 5,
    });
    expect(applyCommand("code", "a``b", { start: 0, end: 4 }).value).toBe("```a``b```");
  });

  it("pads with spaces when the selection starts or ends with a backtick", () => {
    expect(applyCommand("code", "`x", { start: 0, end: 2 })).toEqual({
      value: "`` `x ``",
      selectionStart: 3,
      selectionEnd: 5,
    });
    expect(applyCommand("code", "x`", { start: 0, end: 2 }).value).toBe("`` x` ``");
  });

  it("unwraps a multi-backtick span inside the selection", () => {
    expect(applyCommand("code", "``a`b``", { start: 0, end: 7 })).toEqual({
      value: "a`b",
      selectionStart: 0,
      selectionEnd: 3,
    });
  });

  it("unwraps a padded span from inside or outside the selection", () => {
    expect(applyCommand("code", "`` `x ``", { start: 0, end: 8 })).toEqual({
      value: "`x",
      selectionStart: 0,
      selectionEnd: 2,
    });
    expect(applyCommand("code", "`` `x ``", { start: 3, end: 5 })).toEqual({
      value: "`x",
      selectionStart: 0,
      selectionEnd: 2,
    });
  });

  it.each(["a`b", "`x", "x`", "a``b", "`"])("round-trips %j through the code command", (selected) => {
    const wrapped = applyCommand("code", selected, { start: 0, end: selected.length });
    expect(applyCommand("code", wrapped.value, { start: wrapped.selectionStart, end: wrapped.selectionEnd })).toEqual({
      value: selected,
      selectionStart: 0,
      selectionEnd: selected.length,
    });
  });
});

describe("line prefix commands", () => {
  it("cycles the heading level and back to plain text", () => {
    const first = applyCommand("heading", "x", { start: 1, end: 1 });
    expect(first).toEqual({ value: "# x", selectionStart: 0, selectionEnd: 3 });
    const second = applyCommand("heading", first.value, { start: first.selectionStart, end: first.selectionEnd });
    expect(second.value).toBe("## x");
    const third = applyCommand("heading", second.value, { start: second.selectionStart, end: second.selectionEnd });
    expect(third.value).toBe("### x");
    const fourth = applyCommand("heading", third.value, { start: third.selectionStart, end: third.selectionEnd });
    expect(fourth).toEqual({ value: "x", selectionStart: 0, selectionEnd: 1 });
  });

  it.each([
    ["quote" as const, "> a\n> b"],
    ["bulletList" as const, "- a\n- b"],
    ["taskList" as const, "- [ ] a\n- [ ] b"],
  ])("prefixes every line of a multi-line selection for %s and toggles it off", (id, expected) => {
    const applied = applyCommand(id, "a\nb", { start: 0, end: 3 });
    expect(applied.value).toBe(expected);
    expect(applied.selectionStart).toBe(0);
    expect(applied.selectionEnd).toBe(expected.length);

    expect(applyCommand(id, applied.value, { start: applied.selectionStart, end: applied.selectionEnd })).toEqual({
      value: "a\nb",
      selectionStart: 0,
      selectionEnd: 3,
    });
  });

  it("expands a collapsed caret to the whole line", () => {
    expect(applyCommand("quote", "one\ntwo", { start: 5, end: 5 })).toEqual({
      value: "one\n> two",
      selectionStart: 4,
      selectionEnd: 9,
    });
  });

  it("renumbers an ordered list sequentially from one", () => {
    const applied = applyCommand("orderedList", "a\nb\nc", { start: 0, end: 5 });
    expect(applied.value).toBe("1. a\n2. b\n3. c");
    expect(applyCommand("orderedList", applied.value, { start: 0, end: applied.value.length }).value).toBe("a\nb\nc");
  });

  it("replaces one list marker with another instead of stacking them", () => {
    expect(applyCommand("taskList", "- a", { start: 0, end: 3 }).value).toBe("- [ ] a");
    expect(applyCommand("orderedList", "- [ ] a", { start: 0, end: 7 }).value).toBe("1. a");
    expect(applyCommand("bulletList", "1. a", { start: 0, end: 4 }).value).toBe("- a");
  });

  it("keeps CRLF line endings intact", () => {
    expect(applyCommand("quote", "a\r\nb", { start: 0, end: 4 }).value).toBe("> a\r\n> b");
  });
});

describe("link and image commands", () => {
  it("uses a plain selection as the label and selects the url placeholder", () => {
    expect(applyCommand("link", "docs", { start: 0, end: 4 })).toEqual({
      value: "[docs](url)",
      selectionStart: 7,
      selectionEnd: 10,
    });
  });

  it.each(["https://mdsheep.dev", "http://mdsheep.dev", "mailto:hi@mdsheep.dev"])(
    "uses %s as the target and selects the label placeholder",
    (target) => {
      expect(applyCommand("link", target, { start: 0, end: target.length })).toEqual({
        value: `[text](${target})`,
        selectionStart: 1,
        selectionEnd: 5,
      });
    },
  );

  it.each(["https://mdsheep.dev/docs?a=1&b=2#top", "http://localhost:5173/", "mailto:hi@mdsheep.dev?subject=Hi"])(
    "accepts %s as a whole target",
    (target) => {
      expect(applyCommand("link", target, { start: 0, end: target.length }).value).toBe(`[text](${target})`);
    },
  );

  it.each([
    "https://mdsheep.dev docs",
    "https://mdsheep.dev\nmore",
    "https://mdsheep.dev\tx",
    "https://mdsheep.dev/a(b)",
    "https://mdsheep.dev`x",
    "https://mdsheep.dev<x>",
    "https://",
    "mailto:",
    "https://mdsheep.dev\u0000",
  ])("keeps %j as label text because the whole selection is not a target", (selected) => {
    const result = applyCommand("link", selected, { start: 0, end: selected.length });

    expect(result.value).toBe(`[${selected}](url)`);
    expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe("url");
  });

  it.each(["https://example.com\\", "https://example.com\\path"])(
    "rejects backslash-bearing target %j and escapes it as label text",
    (selected) => {
      const result = applyCommand("link", selected, { start: 0, end: selected.length });

      expect(result.value).toBe(`[${selected.replaceAll("\\", "\\\\")}](url)`);
      expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe("url");
    },
  );

  it("treats a javascript: selection as label text, never as a target", () => {
    expect(applyCommand("link", "javascript:alert(1)", { start: 0, end: 19 }).value).toBe(
      "[javascript:alert(1)](url)",
    );
  });

  it("escapes brackets and backslashes in a link label", () => {
    const result = applyCommand("link", "a [b] c\\d", { start: 0, end: 9 });

    expect(result.value).toBe("[a \\[b\\] c\\\\d](url)");
    expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe("url");
  });

  it("escapes brackets and backslashes in image alt text", () => {
    const result = applyCommand("image", "a]b\\c", { start: 0, end: 5 });

    expect(result.value).toBe("![a\\]b\\\\c](https://)");
    expect(result.selectionStart).toBe(result.value.length - 1);
    expect(result.selectionEnd).toBe(result.value.length - 1);
  });

  it("expands a caret inside a word into the link label", () => {
    expect(applyCommand("link", "docs here", { start: 1, end: 1 }).value).toBe("[docs](url) here");
  });

  it("inserts an image with an https placeholder and the caret ready for the url", () => {
    expect(applyCommand("image", "logo", { start: 0, end: 4 })).toEqual({
      value: "![logo](https://)",
      selectionStart: 16,
      selectionEnd: 16,
    });
  });
});

describe("block insert commands", () => {
  it("fences an empty code block with the caret on the empty line", () => {
    expect(applyCommand("codeBlock", "", { start: 0, end: 0 })).toEqual({
      value: "```\n\n```",
      selectionStart: 4,
      selectionEnd: 4,
    });
  });

  it("fences the selection and keeps it selected", () => {
    expect(applyCommand("codeBlock", "let x = 1", { start: 0, end: 9 })).toEqual({
      value: "```\nlet x = 1\n```",
      selectionStart: 4,
      selectionEnd: 13,
    });
  });

  it("pads a block insert with a blank line before it", () => {
    expect(applyCommand("codeBlock", "para", { start: 4, end: 4 })).toEqual({
      value: "para\n\n```\n\n```",
      selectionStart: 10,
      selectionEnd: 10,
    });
  });

  it("pads a block insert on both sides when text follows", () => {
    expect(applyCommand("codeBlock", "a\nb", { start: 1, end: 1 }).value).toBe("a\n\n```\n\n```\n\nb");
  });

  it("does not add padding that already exists", () => {
    expect(applyCommand("codeBlock", "a\n\n", { start: 3, end: 3 }).value).toBe("a\n\n```\n\n```");
  });

  it("opens a fence longer than any fence line in the selection", () => {
    const result = applyCommand("codeBlock", "```\nx\n```", { start: 0, end: 9 });

    expect(result.value).toBe("````\n```\nx\n```\n````");
    expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe("```\nx\n```");
  });

  it("counts indented and longer fence lines when sizing the fence", () => {
    expect(applyCommand("codeBlock", "   ````  ", { start: 0, end: 9 }).value).toBe("`````\n   ````  \n`````");
    expect(applyCommand("codeBlock", "a\r\n```\r\nb", { start: 0, end: 9 }).value).toBe(
      "````\na\r\n```\r\nb\n````",
    );
  });

  it("ignores backtick runs that cannot close a fence", () => {
    expect(applyCommand("codeBlock", "call ``a`` now", { start: 0, end: 14 }).value).toBe(
      "```\ncall ``a`` now\n```",
    );
  });

  it("inserts a GFM table skeleton with the first header cell selected", () => {
    const expected = [
      "| Column 1 | Column 2 | Column 3 |",
      "| --- | --- | --- |",
      "| Cell | Cell | Cell |",
      "| Cell | Cell | Cell |",
    ].join("\n");
    const result = applyCommand("table", "", { start: 0, end: 0 });

    expect(result.value).toBe(expected);
    expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe("Column 1");
  });

  it("inserts a mermaid fence with a starter flowchart", () => {
    const result = applyCommand("mermaid", "", { start: 0, end: 0 });

    expect(result.value).toBe("```mermaid\nflowchart LR\n  A[Start] --> B[End]\n```");
    expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe("flowchart LR");
  });
});

describe("indentation", () => {
  it("indents every selected line by two spaces", () => {
    expect(indentLines("a\nb", { start: 0, end: 3 }, false)).toEqual({
      value: "  a\n  b",
      selectionStart: 0,
      selectionEnd: 7,
    });
  });

  it("outdents up to two leading spaces or a tab per line", () => {
    expect(indentLines("  a\n b\n\tc", { start: 0, end: 9 }, true)).toEqual({
      value: "a\nb\nc",
      selectionStart: 0,
      selectionEnd: 5,
    });
  });

  it("leaves already flush lines untouched when outdenting", () => {
    expect(indentLines("a", { start: 0, end: 1 }, true).value).toBe("a");
  });
});

describe("shortcuts and edge cases", () => {
  it("maps only the documented shortcut keys", () => {
    expect(COMMAND_SHORTCUTS).toEqual({ bold: "b", italic: "i", link: "k", code: "e" });
  });

  it("wraps a caret at the very end of the document", () => {
    expect(applyCommand("bold", "tail", { start: 4, end: 4 })).toEqual({
      value: "**tail**",
      selectionStart: 2,
      selectionEnd: 6,
    });
  });

  it("inserts bare markers when the caret sits in whitespace", () => {
    expect(applyCommand("bold", "a  b", { start: 2, end: 2 })).toEqual({
      value: "a **** b",
      selectionStart: 4,
      selectionEnd: 4,
    });
  });

  it.each([
    ["italic" as const, "a*b"],
    ["bold" as const, "a**b"],
    ["strikethrough" as const, "a~~b"],
    ["italic" as const, "a&#42;b"],
  ])("round-trips delimiter-bearing %s source", (command, source) => {
    const once = applyCommand(command, source, { start: 0, end: source.length });
    const twice = applyCommand(command, once.value, { start: once.selectionStart, end: once.selectionEnd });
    expect(twice).toEqual({ value: source, selectionStart: 0, selectionEnd: source.length });
  });

  it.each<CommandId>(["bold", "italic", "strikethrough", "code", "quote", "bulletList", "taskList", "orderedList"])(
    "restores the original value and selection when %s is applied twice",
    (id) => {
      const value = "alpha beta\ngamma";
      const selection = { start: 0, end: 16 };
      const once = applyCommand(id, value, selection);
      const twice = applyCommand(id, once.value, { start: once.selectionStart, end: once.selectionEnd });

      expect(twice).toEqual({ value, selectionStart: selection.start, selectionEnd: selection.end });
    },
  );
});
