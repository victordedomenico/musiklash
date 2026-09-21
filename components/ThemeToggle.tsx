"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useState, useTransition } from "react";
import { setTheme } from "@/app/preferences/actions";

type Theme = "dark" | "light" | "system";

const NEXT_THEME: Record<Theme, Theme> = {
  dark: "light",
  light: "system",
  system: "dark",
};

const THEME_LABELS: Record<Theme, string> = {
  dark: "sombre",
  light: "clair",
  system: "automatique",
};

export default function ThemeToggle({ current }: { current: Theme }) {
  const [theme, setThemeState] = useState<Theme>(current);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = NEXT_THEME[theme];
    document.documentElement.dataset.theme = next;
    setThemeState(next);
    startTransition(async () => {
      await setTheme(next);
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-label={`Thème ${THEME_LABELS[theme]}. Passer au thème ${THEME_LABELS[NEXT_THEME[theme]]}`}
      title={`Thème ${THEME_LABELS[theme]}`}
      className="btn-ghost"
      style={{ padding: "0.5rem", width: "2.25rem", height: "2.25rem" }}
    >
      {theme === "dark" ? (
        <Moon size={15} />
      ) : theme === "light" ? (
        <Sun size={15} />
      ) : (
        <Monitor size={15} />
      )}
    </button>
  );
}
