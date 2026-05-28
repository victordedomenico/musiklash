"use client";

import { Sun, Moon } from "lucide-react";
import { useState, useTransition } from "react";
import { setTheme } from "@/app/preferences/actions";

export default function ThemeToggle({ current }: { current: "dark" | "light" }) {
  const [theme, setThemeState] = useState<"dark" | "light">(current);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
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
      aria-label="Toggle theme"
      className="btn-ghost"
      style={{ padding: "0.5rem", width: "2.25rem", height: "2.25rem" }}
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
