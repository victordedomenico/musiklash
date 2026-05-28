"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setLocale } from "@/app/preferences/actions";

export default function LocaleToggle({ current }: { current: "fr" | "en" }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<"fr" | "en">(current);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const previous = locale;
    const next = locale === "fr" ? "en" : "fr";
    setLocaleState(next);
    startTransition(async () => {
      const result = await setLocale(next);
      if (result?.persisted) {
        router.refresh();
        return;
      }
      setLocaleState(previous);
      router.push("/cookies");
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-label="Toggle language"
      className="btn-ghost"
      style={{
        padding: "0.4rem 0.65rem",
        fontSize: "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.03em",
        height: "2.25rem",
        opacity: pending ? 0.5 : 1,
      }}
    >
      {locale === "fr" ? "EN" : "FR"}
    </button>
  );
}
