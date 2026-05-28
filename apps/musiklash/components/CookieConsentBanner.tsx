"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveCookieConsent } from "@/app/preferences/actions";
import type { CookieConsent } from "@/lib/cookie-consent";

export default function CookieConsentBanner({
  initialConsent,
}: {
  initialConsent: CookieConsent | null;
}) {
  const [consent, setConsent] = useState<CookieConsent | null>(initialConsent);
  const [pending, startTransition] = useTransition();

  if (consent) return null;

  function applyConsent(next: { preferences: boolean; analytics: boolean }) {
    startTransition(async () => {
      const saved = await saveCookieConsent(next);
      if (saved?.ok) {
        setConsent(saved.consent);
      }
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-[70] px-4">
      <div
        className="mx-auto w-full max-w-4xl rounded-2xl border p-4 md:p-5"
        style={{
          borderColor: "var(--border-strong)",
          background: "color-mix(in srgb, var(--surface) 95%, black 5%)",
          boxShadow: "0 20px 55px rgba(0,0,0,0.45)",
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-base font-semibold">Cookies & vie privee</p>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Nous utilisons des cookies essentiels pour faire fonctionner MusiKlash. Les cookies
              optionnels (analytiques) ne sont actives qu&apos;avec ton consentement.
            </p>
            <Link
              href="/cookies"
              className="mt-2 inline-flex text-xs font-semibold hover:underline"
              style={{ color: "var(--accent)" }}
            >
              Personnaliser mes preferences
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <button
              type="button"
              onClick={() => applyConsent({ preferences: false, analytics: false })}
              disabled={pending}
              className="btn-ghost"
            >
              Refuser les optionnels
            </button>
            <button
              type="button"
              onClick={() => applyConsent({ preferences: true, analytics: true })}
              disabled={pending}
              className="btn-primary"
            >
              Tout accepter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
