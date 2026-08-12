import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenButton } from "@/components/OpenButton";
import { openMarkdownFile } from "@/lib/native-fs";

vi.mock("@/lib/native-fs", () => ({ openMarkdownFile: vi.fn() }));
const mockedOpen = vi.mocked(openMarkdownFile);

afterEach(() => mockedOpen.mockReset());

describe("OpenButton", () => {
  it("opens a native Markdown selection, preserving exact text, and can reopen", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    mockedOpen.mockResolvedValue({ name: "notes.md", content: "# Exact\n\nTrailing space  \n" });
    render(<OpenButton onOpen={onOpen} />);

    const button = screen.getByRole("button", { name: "Open Markdown file" });
    expect(button.tagName).toBe("BUTTON");
    await user.click(button);
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith("# Exact\n\nTrailing space  \n"));
    await user.click(button);
    expect(mockedOpen).toHaveBeenCalledTimes(2);
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("does nothing when the native dialog is cancelled", async () => {
    const onOpen = vi.fn();
    mockedOpen.mockResolvedValue(null);
    render(<OpenButton onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: "Open Markdown file" }));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("reports native read failures accessibly", async () => {
    mockedOpen.mockRejectedValue(new Error("broken.md: read failed"));
    const onOpen = vi.fn();
    render(<OpenButton onOpen={onOpen} />);
    await userEvent.click(screen.getByRole("button", { name: "Open Markdown file" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("broken.md: read failed");
    expect(onOpen).not.toHaveBeenCalled();
  });
});
