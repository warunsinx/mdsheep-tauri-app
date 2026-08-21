import { afterEach, describe, expect, it, vi } from "vitest";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { openMarkdownFile, saveHtmlFile, saveMarkdownFile } from "@/lib/native-fs";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}));

vi.mock("@tauri-apps/api/path", () => ({ basename: vi.fn() }));

describe("browser Markdown file operations", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.__MDSHEEP_TEST_STATE__ = undefined;
  });

  it("exports Markdown with a browser download outside Tauri", async () => {
    const anchor = document.createElement("a");
    const anchorClick = vi.spyOn(anchor, "click").mockImplementation(() => undefined);
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string, options?: ElementCreationOptions) =>
      tagName.toLowerCase() === "a" ? anchor : createElement(tagName, options),
    );
    const createObjectURL = vi.fn(() => "blob:mdsheep-export");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    await expect(saveMarkdownFile("# Browser export", new Date(2026, 7, 18))).resolves.toBe(true);

    expect(save).not.toHaveBeenCalled();
    expect(writeTextFile).not.toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(anchor.download).toBe("document-2026-08-18.md");
    expect(anchor.href).toBe("blob:mdsheep-export");
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mdsheep-export");
  });

  it("downloads standalone HTML with the correct browser filename and MIME type", async () => {
    const anchor = document.createElement("a");
    const anchorClick = vi.spyOn(anchor, "click").mockImplementation(() => undefined);
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string, options?: ElementCreationOptions) =>
      tagName.toLowerCase() === "a" ? anchor : createElement(tagName, options),
    );
    const createObjectURL = vi.fn((blob: Blob) => {
      void blob;
      return "blob:mdsheep-html-export";
    });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    await expect(saveHtmlFile("<!doctype html>", new Date(2026, 7, 18))).resolves.toBe(true);

    expect(anchor.download).toBe("document-2026-08-18.html");
    expect((createObjectURL.mock.calls[0][0] as Blob).type).toBe("text/html;charset=utf-8");
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mdsheep-html-export");
  });

  it("opens a selected Markdown file in a browser outside Tauri", async () => {
    const input = document.createElement("input");
    const file = new File(["# Browser open\n\nExact trailing space  \n"], "notes.markdown", { type: "text/markdown" });
    Object.defineProperty(input, "files", { value: [file] });
    vi.spyOn(input, "click").mockImplementation(() => input.dispatchEvent(new Event("change")));
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string, options?: ElementCreationOptions) =>
      tagName.toLowerCase() === "input" ? input : createElement(tagName, options),
    );

    await expect(openMarkdownFile()).resolves.toEqual({
      name: "notes.markdown",
      content: "# Browser open\n\nExact trailing space  \n",
    });

    expect(open).not.toHaveBeenCalled();
    expect(readTextFile).not.toHaveBeenCalled();
    expect(input.type).toBe("file");
    expect(input.accept).toContain(".md");
    expect(input.accept).toContain(".markdown");
  });
});
