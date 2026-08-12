import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { nextTheme } from "@/lib/theme";

const displayNames = { light: "Light", dark: "Dark" } as const;

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const next = nextTheme(preference);
  const Icon = preference === "light" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      className="icon-button"
      aria-label={`${displayNames[preference]} theme. Switch to ${displayNames[next].toLowerCase()} theme`}
      title={`${displayNames[preference]} theme`}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
