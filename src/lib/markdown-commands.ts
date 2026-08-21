export type CommandId =
  | "bold"
  | "italic"
  | "strikethrough"
  | "code"
  | "codeBlock"
  | "link"
  | "image"
  | "heading"
  | "quote"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "table"
  | "mermaid";

export interface TextSelection {
  start: number;
  end: number;
}

export interface EditResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

const INLINE_MARKERS: Partial<Record<CommandId, string>> = {
  bold: "**",
  italic: "*",
  strikethrough: "~~",
};

const LIST_MARKER_PATTERN = /^(?:[-*+] \[[ xX]\] |[-*+] |\d+\. )/;
const HEADING_PATTERN = /^#{1,6} /;
const MAX_CYCLED_HEADING_LEVEL = 3;

interface LinePrefixSpec {
  pattern: RegExp;
  prefix: (index: number) => string;
  replacesListMarker: boolean;
}

const LINE_PREFIXES: Partial<Record<CommandId, LinePrefixSpec>> = {
  quote: { pattern: /^> /, prefix: () => "> ", replacesListMarker: false },
  bulletList: { pattern: /^[-*+] (?!\[[ xX]\] )/, prefix: () => "- ", replacesListMarker: true },
  taskList: { pattern: /^[-*+] \[[ xX]\] /, prefix: () => "- [ ] ", replacesListMarker: true },
  orderedList: { pattern: /^\d+\. /, prefix: (index) => `${index + 1}. `, replacesListMarker: true },
};

function expandToWord(value: string, position: number): TextSelection {
  let start = position;
  let end = position;
  while (start > 0 && !/\s/.test(value[start - 1])) start -= 1;
  while (end < value.length && !/\s/.test(value[end])) end += 1;
  return { start, end };
}

function encodeWrappedContent(content: string, marker: string): string {
  const delimiter = marker[0];
  const entity = `&#${delimiter.codePointAt(0)};`;
  if (!content.includes(delimiter) && !content.includes(entity)) return content;
  return content.replaceAll("&", "&amp;").replaceAll(delimiter, entity);
}

function decodeWrappedContent(content: string, marker: string): string {
  const delimiter = marker[0];
  const code = delimiter.codePointAt(0);
  const entity = `&#${code};`;
  const escapedEntity = `&amp;#${code};`;
  if (!content.includes(entity) && !content.includes(escapedEntity)) return content;
  return content.replaceAll(entity, delimiter).replaceAll("&amp;", "&");
}

function toggleWrap(marker: string, value: string, selection: TextSelection): EditResult {
  const range = selection.start === selection.end ? expandToWord(value, selection.start) : selection;
  const selected = value.slice(range.start, range.end);
  const width = marker.length;

  if (selected.length >= width * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = decodeWrappedContent(selected.slice(width, selected.length - width), marker);
    return {
      value: value.slice(0, range.start) + inner + value.slice(range.end),
      selectionStart: range.start,
      selectionEnd: range.start + inner.length,
    };
  }

  if (
    value.slice(Math.max(0, range.start - width), range.start) === marker &&
    value.slice(range.end, range.end + width) === marker
  ) {
    const inner = decodeWrappedContent(selected, marker);
    return {
      value: value.slice(0, range.start - width) + inner + value.slice(range.end + width),
      selectionStart: range.start - width,
      selectionEnd: range.start - width + inner.length,
    };
  }

  const encoded = encodeWrappedContent(selected, marker);
  return {
    value: value.slice(0, range.start) + marker + encoded + marker + value.slice(range.end),
    selectionStart: range.start + width,
    selectionEnd: range.start + width + encoded.length,
  };
}

function longestBacktickRun(text: string): number {
  let longest = 0;
  for (const run of text.match(/`+/g) ?? []) longest = Math.max(longest, run.length);
  return longest;
}

function backtickRunBefore(value: string, index: number): number {
  let run = 0;
  while (index - run > 0 && value[index - run - 1] === "`") run += 1;
  return run;
}

function backtickRunAfter(value: string, index: number): number {
  let run = 0;
  while (index + run < value.length && value[index + run] === "`") run += 1;
  return run;
}

// CommonMark drops one space from each end of a code span whose content both
// starts and ends with a space, and a backtick touching a delimiter would merge
// into it -- both cases need a space of padding to survive the round trip.
function needsCodePadding(content: string): boolean {
  if (content.startsWith("`") || content.endsWith("`")) return true;
  return /^[ \n]/.test(content) && /[ \n]$/.test(content) && content.trim() !== "";
}

function stripCodePadding(content: string): string {
  const stripped = /^[ \n][\s\S]*[ \n]$/.test(content) && content.trim() !== "";
  return stripped ? content.slice(1, -1) : content;
}

// A code span's delimiter has to be longer than every backtick run it holds,
// otherwise the span closes inside the selection.
function toggleInlineCode(value: string, selection: TextSelection): EditResult {
  const range = selection.start === selection.end ? expandToWord(value, selection.start) : selection;
  const selected = value.slice(range.start, range.end);

  const inner = backtickRunAfter(selected, 0);
  if (inner > 0 && selected.length > inner * 2 && backtickRunBefore(selected, selected.length) === inner) {
    const content = stripCodePadding(selected.slice(inner, selected.length - inner));
    if (longestBacktickRun(content) < inner) {
      return {
        value: value.slice(0, range.start) + content + value.slice(range.end),
        selectionStart: range.start,
        selectionEnd: range.start + content.length,
      };
    }
  }

  const padded = value[range.start - 1] === " " && value[range.end] === " " ? 1 : 0;
  const outer = backtickRunBefore(value, range.start - padded);
  if (outer > 0 && backtickRunAfter(value, range.end + padded) === outer && longestBacktickRun(selected) < outer) {
    const cut = outer + padded;
    return {
      value: value.slice(0, range.start - cut) + selected + value.slice(range.end + cut),
      selectionStart: range.start - cut,
      selectionEnd: range.end - cut,
    };
  }

  const leftRun = backtickRunBefore(value, range.start);
  const rightRun = backtickRunAfter(value, range.end);
  const delimiter = "`".repeat(Math.max(longestBacktickRun(selected), leftRun, rightRun) + 1);
  const pad = needsCodePadding(selected) ? " " : "";
  // Separate unmatched external runs so they cannot merge with this span's
  // delimiters. Matched runs have already returned through the toggle path.
  const leftSeparator = leftRun > 0 ? " " : "";
  const rightSeparator = rightRun > 0 ? " " : "";
  const offset = range.start + leftSeparator.length + delimiter.length + pad.length;
  return {
    value:
      value.slice(0, range.start) +
      leftSeparator +
      delimiter +
      pad +
      selected +
      pad +
      delimiter +
      rightSeparator +
      value.slice(range.end),
    selectionStart: offset,
    selectionEnd: offset + selected.length,
  };
}

// Only a selection that is entirely one http(s) or mailto target may become the
// destination. A matching prefix is not enough: anything else -- notably
// javascript:, or a sentence that merely starts with a URL -- stays label text,
// so the toolbar never manufactures a URL the preview sanitizer would have to
// strip or a destination that ends early on whitespace, a paren, or an angle
// bracket.
const SAFE_TARGET_PATTERN = /^(?:https?:\/\/|mailto:)[^\s()<>`\\]+$/i;

function isSafeTarget(value: string): boolean {
  const hasControlCharacter = Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
  return !hasControlCharacter && SAFE_TARGET_PATTERN.test(value);
}

const URL_PLACEHOLDER = "url";
const LABEL_PLACEHOLDER = "text";
const IMAGE_URL_PLACEHOLDER = "https://";

// Brackets and backslashes in a label or alt text would otherwise end the label
// early or eat the next character as an escape.
function escapeLabel(text: string): string {
  return text.replace(/[\\[\]]/g, "\\$&");
}

function insertLink(value: string, selection: TextSelection): EditResult {
  const range = selection.start === selection.end ? expandToWord(value, selection.start) : selection;
  const selected = value.slice(range.start, range.end);
  const isTarget = isSafeTarget(selected);
  const label = isTarget ? LABEL_PLACEHOLDER : escapeLabel(selected);
  const target = isTarget ? selected : URL_PLACEHOLDER;
  const placeholderStart = isTarget ? range.start + 1 : range.start + label.length + 3;
  const placeholderLength = isTarget ? label.length : target.length;
  return {
    value: `${value.slice(0, range.start)}[${label}](${target})${value.slice(range.end)}`,
    selectionStart: placeholderStart,
    selectionEnd: placeholderStart + placeholderLength,
  };
}

function insertImage(value: string, selection: TextSelection): EditResult {
  const range = selection.start === selection.end ? expandToWord(value, selection.start) : selection;
  const alt = escapeLabel(value.slice(range.start, range.end));
  const caret = range.start + alt.length + IMAGE_URL_PLACEHOLDER.length + 4;
  return {
    value: `${value.slice(0, range.start)}![${alt}](${IMAGE_URL_PLACEHOLDER})${value.slice(range.end)}`,
    selectionStart: caret,
    selectionEnd: caret,
  };
}

function expandToLines(value: string, selection: TextSelection): TextSelection {
  const start = value.lastIndexOf("\n", selection.start - 1) + 1;
  const searchFrom =
    selection.end > selection.start && value[selection.end - 1] === "\n" ? selection.end - 1 : selection.end;
  const lineEnd = value.indexOf("\n", searchFrom);
  return { start, end: lineEnd === -1 ? value.length : lineEnd };
}

function replaceLines(value: string, block: TextSelection, transform: (lines: string[]) => string[]): EditResult {
  const replacement = transform(value.slice(block.start, block.end).split("\n")).join("\n");
  return {
    value: value.slice(0, block.start) + replacement + value.slice(block.end),
    selectionStart: block.start,
    selectionEnd: block.start + replacement.length,
  };
}

function toggleLinePrefix(spec: LinePrefixSpec, value: string, selection: TextSelection): EditResult {
  const block = expandToLines(value, selection);
  return replaceLines(value, block, (lines) => {
    const allPrefixed = lines.every((line) => spec.pattern.test(line));
    return lines.map((line, index) => {
      if (allPrefixed) return line.replace(spec.pattern, "");
      const body = spec.replacesListMarker ? line.replace(LIST_MARKER_PATTERN, "") : line;
      return spec.prefix(index) + body;
    });
  });
}

function cycleHeading(value: string, selection: TextSelection): EditResult {
  const block = expandToLines(value, selection);
  return replaceLines(value, block, (lines) => {
    const current = HEADING_PATTERN.exec(lines[0]);
    const level = current ? current[0].trimEnd().length : 0;
    const nextLevel = level >= MAX_CYCLED_HEADING_LEVEL ? 0 : level + 1;
    return lines.map((line) => {
      const body = line.replace(HEADING_PATTERN, "");
      return nextLevel === 0 ? body : `${"#".repeat(nextLevel)} ${body}`;
    });
  });
}

const TABLE_BLOCK = [
  "| Column 1 | Column 2 | Column 3 |",
  "| --- | --- | --- |",
  "| Cell | Cell | Cell |",
  "| Cell | Cell | Cell |",
].join("\n");
const MERMAID_BLOCK = "```mermaid\nflowchart LR\n  A[Start] --> B[End]\n```";

function blockPadding(text: string, atStart: boolean) {
  if (text === "") return "";
  const edge = atStart ? text.slice(-2) : text.slice(0, 2);
  if (edge === "\n\n") return "";
  return (atStart ? text.endsWith("\n") : text.startsWith("\n")) ? "\n" : "\n\n";
}

function insertBlock(
  value: string,
  selection: TextSelection,
  block: string,
  placeholderStart: number,
  placeholderEnd: number,
): EditResult {
  const before = value.slice(0, selection.start);
  const after = value.slice(selection.end);
  const prefix = blockPadding(before, true);
  const blockStart = before.length + prefix.length;
  return {
    value: before + prefix + block + blockPadding(after, false) + after,
    selectionStart: blockStart + placeholderStart,
    selectionEnd: blockStart + placeholderEnd,
  };
}

// A line of nothing but backticks, indented no more than three spaces, closes a
// fenced block. The opening fence has to out-length every such line in the
// selection or the block ends early and the rest leaks out as Markdown.
const CLOSING_FENCE_PATTERN = /^ {0,3}(`+)[ \t\r]*$/;
const MIN_FENCE_LENGTH = 3;

function codeFence(content: string): string {
  let longest = MIN_FENCE_LENGTH - 1;
  for (const line of content.split("\n")) {
    const fence = CLOSING_FENCE_PATTERN.exec(line);
    if (fence) longest = Math.max(longest, fence[1].length);
  }
  return "`".repeat(longest + 1);
}

function insertCodeBlock(value: string, selection: TextSelection): EditResult {
  const selected = value.slice(selection.start, selection.end);
  const fence = codeFence(selected);
  const contentStart = fence.length + 1;
  return insertBlock(
    value,
    selection,
    `${fence}\n${selected}\n${fence}`,
    contentStart,
    contentStart + selected.length,
  );
}

export const INDENT_UNIT = "  ";

export const COMMAND_SHORTCUTS: Partial<Record<CommandId, string>> = {
  bold: "b",
  italic: "i",
  link: "k",
  code: "e",
};

export function indentLines(value: string, selection: TextSelection, outdent: boolean): EditResult {
  const block = expandToLines(value, selection);
  return replaceLines(value, block, (lines) =>
    lines.map((line) => (outdent ? line.replace(/^(?: {1,2}|\t)/, "") : INDENT_UNIT + line)),
  );
}

export function applyCommand(id: CommandId, value: string, selection: TextSelection): EditResult {
  const marker = INLINE_MARKERS[id];
  if (marker) return toggleWrap(marker, value, selection);
  const linePrefix = LINE_PREFIXES[id];
  if (linePrefix) return toggleLinePrefix(linePrefix, value, selection);
  if (id === "code") return toggleInlineCode(value, selection);
  if (id === "heading") return cycleHeading(value, selection);
  if (id === "link") return insertLink(value, selection);
  if (id === "image") return insertImage(value, selection);
  if (id === "codeBlock") return insertCodeBlock(value, selection);
  if (id === "table") return insertBlock(value, selection, TABLE_BLOCK, 2, 10);
  if (id === "mermaid") return insertBlock(value, selection, MERMAID_BLOCK, 11, 23);
  return { value, selectionStart: selection.start, selectionEnd: selection.end };
}
