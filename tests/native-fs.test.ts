import { afterEach, describe, expect, it } from "vitest";
import { openMarkdownFile, saveMarkdownFile } from "@/lib/native-fs";

afterEach(() => { globalThis.__MDSHEEP_TEST_STATE__ = undefined; });

describe("native filesystem test seam", () => {
  it("reads and writes exact content using dialog-selected paths", async () => {
    globalThis.__MDSHEEP_TEST_STATE__ = {
      openResult: "C:/notes/local.markdown",
      fileContents: { "C:/notes/local.markdown": "# Exact  \n" },
      saveResult: "C:/notes/export.md",
      written: [],
      openedExternal: [],
    };
    await expect(openMarkdownFile()).resolves.toEqual({ name: "local.markdown", content: "# Exact  \n" });
    await expect(saveMarkdownFile("# Exact  \n")).resolves.toBe(true);
    expect(globalThis.__MDSHEEP_TEST_STATE__.written).toEqual([{ path: "C:/notes/export.md", content: "# Exact  \n" }]);
  });
});
