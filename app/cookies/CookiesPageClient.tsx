"use client";

import { useState } from "react";
import { saveCookieConsent } from "@/app/preferences/actions";

type CookiePref = { preferences: boolean; analytics: boolean };

export default function CookiesPageClient({ initialPrefs }: { initialPrefs: CookiePref }) {
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState<CookiePref>(initialPrefs);
  const [pending, setPending] = useState(false);

  async function handleSave() {
    setPending(true);
    try {
      await saveCookieConsent({
        preferences: prefs.preferences,
        analytics: prefs.analytics,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="mt-10 space-y-4">
        {/* Essentiels */}
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">Cookies essentiels</p>
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                Indispensables au fonctionnement de la plateforme : session
                d&apos;authentification, sécurité et maintien de session. Ils ne peuvent pas être
                désactivés.
              </p>
            </div>
            <span
              className="shrink-0 mt-0.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "rgba(239,68,68,0.15)", color: "var(--accent)" }}
            >
              Toujours actifs
            </span>
          </div>
        </div>

        {/* Préférences */}
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">Cookies de préférences</p>
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                Mémorisation du thème, de la langue et de certains choix utilisateur.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={prefs.preferences}
              onClick={() => setPrefs((p) => ({ ...p, preferences: !p.preferences }))}
              className="shrink-0 mt-0.5 relative h-6 w-11 rounded-full transition-colors duration-200"
              style={{
                background: prefs.preferences ? "var(--accent)" : "var(--surface-3)",
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                style={{ transform: prefs.preferences ? "translateX(20px)" : "translateX(0)" }}
              />
            </button>
          </div>
        </div>

        {/* Analytiques */}
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">Cookies analytiques</p>
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                Mesure d&apos;audience via Vercel Analytics (pages vues, interactions,
                statistiques de consultation). Active seulement avec votre consentement.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={prefs.analytics}
              onClick={() => setPrefs((p) => ({ ...p, analytics: !p.analytics }))}
              className="shrink-0 mt-0.5 relative h-6 w-11 rounded-full transition-colors duration-200"
              style={{
                background: prefs.analytics ? "var(--accent)" : "var(--surface-3)",
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                style={{ transform: prefs.analytics ? "translateX(20px)" : "translateX(0)" }}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={pending}
          className="btn-primary disabled:opacity-60"
        >
          Enregistrer mes préférences
        </button>
        {saved && (
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            ✓ Préférences enregistrées
          </span>
        )}
      </div>
    </>
  );
}
