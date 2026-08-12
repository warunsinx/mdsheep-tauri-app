import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/context/ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { THEME_STORAGE_KEY } from "@/lib/constants";

function preferDarkMode(matches: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: query === "(prefers-color-scheme: dark)" && matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("ThemeToggle", () => {
  it("initializes dark from a dark system with no storage and persists light on click", async () => {
    preferDarkMode(true);
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);

    const button = await screen.findByRole("button", {
      name: "Dark theme. Switch to light theme",
    });
    expect(button.querySelector(".lucide-moon")).toBeInTheDocument();

    await user.click(button);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("initializes light from a light system with no storage", async () => {
    preferDarkMode(false);
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);

    const button = await screen.findByRole("button", {
      name: "Light theme. Switch to dark theme",
    });
    expect(button.querySelector(".lucide-sun")).toBeInTheDocument();
  });

  it("uses stored dark even when the system is light", async () => {
    preferDarkMode(false);
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);

    const button = await screen.findByRole("button", {
      name: "Dark theme. Switch to light theme",
    });
    expect(button.querySelector(".lucide-moon")).toBeInTheDocument();
  });

  it("offers only light and dark and never system", async () => {
    preferDarkMode(false);
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);

    const button = await screen.findByRole("button", {
      name: "Light theme. Switch to dark theme",
    });
    expect(document.querySelector(".lucide-monitor")).not.toBeInTheDocument();

    await user.click(button);
    expect(button).toHaveAccessibleName("Dark theme. Switch to light theme");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    await user.click(button);
    expect(button).toHaveAccessibleName("Light theme. Switch to dark theme");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(screen.queryByText(/system/i)).not.toBeInTheDocument();
    expect(document.querySelector(".lucide-monitor")).not.toBeInTheDocument();
  });

  it("treats legacy system storage as unset and resolves from the current OS", async () => {
    preferDarkMode(true);
    localStorage.setItem(THEME_STORAGE_KEY, "system");
    render(<ThemeProvider><ThemeToggle /></ThemeProvider>);

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveAccessibleName(
        "Dark theme. Switch to light theme",
      );
    });
    expect(document.querySelector(".lucide-monitor")).not.toBeInTheDocument();
  });
});
