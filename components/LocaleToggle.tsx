"use client";

import { useTransition, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocale } from "@/app/preferences/actions";
import Toast from "@/components/ui/Toast";

const MESSAGES = {
  fr: {
    toast: "Active les cookies de préférences pour sauvegarder ta langue.",
    action: "Gérer",
    title: "Langue : Français (cliquer pour passer en anglais)",
    ariaLabel: "Langue : Français. Passer en anglais",
  },
  en: {
    toast: "Enable preference cookies to save your language.",
    action: "Manage",
    title: "Language: English (click to switch to French)",
    ariaLabel: "Language: English. Switch to French",
  },
};

export default function LocaleToggle({ current }: { current: "fr" | "en" }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<"fr" | "en">(current);
  const [showToast, setShowToast] = useState(false);
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
      setShowToast(true);
    });
  }

  const msg = MESSAGES[locale];

  return (
    <>
      <button
        onClick={toggle}
        disabled={pending}
        aria-label={msg.ariaLabel}
        title={msg.title}
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
        <span className="flex items-center gap-1.5">
          <Languages size={15} style={{ opacity: 0.85 }} />
          <span>{locale === "fr" ? "FR" : "EN"}</span>
        </span>
      </button>

      {showToast &&
        typeof window !== "undefined" &&
        createPortal(
          <Toast
            message={msg.toast}
            action={{ label: msg.action, href: "/cookies" }}
            onDismiss={() => setShowToast(false)}
          />,
          document.body,
        )}
    </>
  );
}
