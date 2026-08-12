import { describe, expect, it, vi } from "vitest";
import { CONTENT_STORAGE_KEY } from "@/lib/constants";
import { debounce, loadDocument, saveDocument } from "@/lib/storage";

describe("document storage", () => {
  it("round-trips exact document content", () => {
    saveDocument("# Exact\n\nContent ✅");
    expect(loadDocument("fallback")).toBe("# Exact\n\nContent ✅");
  });

  it("returns the fallback for corrupt or incompatible data", () => {
    localStorage.setItem(CONTENT_STORAGE_KEY, "not json");
    expect(loadDocument("welcome")).toBe("welcome");
    localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify({ version: 2, content: "old" }));
    expect(loadDocument("welcome")).toBe("welcome");
  });

  it("debounces repeated work", () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const save = debounce(handler, 500);
    save(); save(); save();
    vi.advanceTimersByTime(499);
    expect(handler).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(handler).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
