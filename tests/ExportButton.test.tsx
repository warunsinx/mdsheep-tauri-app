import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportButton } from "@/components/ExportButton";
import { defaultExportName, saveMarkdownFile } from "@/lib/native-fs";

vi.mock("@/lib/native-fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/native-fs")>();
  return { ...original, saveMarkdownFile: vi.fn() };
});
const mockedSave = vi.mocked(saveMarkdownFile);

afterEach(() => mockedSave.mockReset());

describe("ExportButton", () => {
  it("passes the exact current Markdown to native save", async () => {
    mockedSave.mockResolvedValue(true);
    render(<ExportButton markdown={"# Exact\n\nTrailing  \n"} />);
    await userEvent.click(screen.getByRole("button", { name: "Export current Markdown" }));
    expect(mockedSave).toHaveBeenCalledWith("# Exact\n\nTrailing  \n");
  });

  it("keeps the dated export filename", () => {
    expect(defaultExportName(new Date(2026, 7, 11))).toBe("document-2026-08-11.md");
  });

  it("reports export failures accessibly", async () => {
    mockedSave.mockRejectedValue(new Error("download blocked"));
    render(<ExportButton markdown="# Draft" />);

    await userEvent.click(screen.getByRole("button", { name: "Export current Markdown" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("download blocked");
  });
});
