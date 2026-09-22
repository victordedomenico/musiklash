"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { setTheme } from "@/app/preferences/actions";

type Theme = "dark" | "light" | "system";

const NEXT_THEME: Record<Theme, Theme> = {
  dark: "light",
  light: "system",
  system: "dark",
};

const THEME_LABELS: Record<
  "fr" | "en",
  Record<Theme, { current: string; next: string }>
> = {
  fr: {
    dark: { current: "sombre", next: "clair" },
    light: { current: "clair", next: "automatique" },
    system: { current: "automatique (système)", next: "sombre" },
  },
  en: {
    dark: { current: "dark", next: "light" },
    light: { current: "light", next: "system" },
    system: { current: "system", next: "dark" },
  },
};

export default function ThemeToggle({
  current,
  locale = "fr",
}: {
  current: Theme;
  locale?: "fr" | "en";
}) {
  const [theme, setThemeState] = useState<Theme>(current);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const active = (document.documentElement.dataset.theme ||
      localStorage.getItem("theme")) as Theme | null;
    if (active && (active === "dark" || active === "light" || active === "system")) {
      setThemeState(active);
    }

    function onThemeChange(e: Event) {
      const custom = e as CustomEvent<Theme>;
      const t =
        custom.detail || (document.documentElement.dataset.theme as Theme | undefined);
      if (t && (t === "dark" || t === "light" || t === "system")) {
        setThemeState(t);
      }
    }

    window.addEventListener("theme-change", onThemeChange);
    return () => window.removeEventListener("theme-change", onThemeChange);
  }, []);

  function toggle() {
    const next = NEXT_THEME[theme];
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setThemeState(next);
    window.dispatchEvent(new CustomEvent("theme-change", { detail: next }));
    startTransition(async () => {
      await setTheme(next);
    });
  }

  const labels = THEME_LABELS[locale] || THEME_LABELS.fr;
  const currentLabel = labels[theme].current;
  const nextLabel = labels[theme].next;

  const ariaLabel =
    locale === "fr"
      ? `Thème : ${currentLabel}. Passer au thème ${nextLabel}`
      : `Theme: ${currentLabel}. Switch to ${nextLabel}`;

  const title =
    locale === "fr"
      ? `Thème : ${currentLabel} (cliquer pour passer au thème ${nextLabel})`
      : `Theme: ${currentLabel} (click to switch to ${nextLabel})`;

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-label={ariaLabel}
      title={title}
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
