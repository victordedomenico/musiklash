"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { submitGuestPseudo } from "@/app/(auth)/actions";
import {
  hasDismissedPseudoPrompt,
  isGameRoute,
  markPseudoPromptDismissed,
} from "@/lib/guest-pseudo-prompt";

type GuestPseudoPromptTexts = {
  title: string;
  hint: string;
  placeholder: string;
  confirm: string;
  skip: string;
};

export default function GuestPseudoPrompt({
  needsPseudo,
  texts,
}: {
  needsPseudo: boolean;
  texts: GuestPseudoPromptTexts;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!needsPseudo || hasDismissedPseudoPrompt() || !isGameRoute(pathname)) return;
    // Gated on a browser-only check (localStorage) that can't run during
    // render without a hydration mismatch, so it must happen on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [needsPseudo, pathname]);

  const dismiss = useCallback(() => {
    markPseudoPromptDismissed();
    setOpen(false);
    document.body.style.overflow = "";
  }, []);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await submitGuestPseudo(new FormData(event.currentTarget));
      if (result.error) {
        setError(result.error);
        return;
      }
      dismiss();
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={texts.title}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-5"
        style={{ borderColor: "var(--border-strong)", background: "var(--surface)" }}
      >
        <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
          {texts.title}
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          {texts.hint}
        </p>
        <form onSubmit={submit} className="mt-4 space-y-2">
          <label htmlFor="pseudo-prompt-username" className="sr-only">
            {texts.placeholder}
          </label>
          <input
            id="pseudo-prompt-username"
            type="text"
            name="username"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            minLength={3}
            maxLength={24}
            autoFocus
            placeholder={texts.placeholder}
            className="w-full rounded-xl border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface-2)",
              color: "var(--foreground)",
            }}
          />
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={dismiss}
              disabled={pending}
              className="btn-ghost flex-1 justify-center text-sm"
            >
              {texts.skip}
            </button>
            <button
              type="submit"
              disabled={pending || value.trim().length < 3}
              className="btn-primary flex-1 justify-center text-sm"
            >
              {texts.confirm}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
