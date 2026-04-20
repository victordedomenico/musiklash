"use client";

import { useState } from "react";
import { useEffect } from "react";
import {
  getCurrentCookieConsent,
  saveCookieConsent,
} from "@/app/preferences/actions";

type CookiePref = { preferences: boolean; analytics: boolean };

export default function CookiesPage() {
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState<CookiePref>({
    preferences: true,
    analytics: false,
  });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentCookieConsent().then((current) => {
      if (!active) return;
      setPrefs({
        preferences: current.preferences,
        analytics: current.analytics,
      });
    });
    return () => {
      active = false;
    };
  }, []);

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
    <div className="refit-doc-page">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-black mb-2">Gestion des cookies</h1>
        <p style={{ color: "var(--muted)" }}>
          Choisissez quels cookies vous acceptez.
        </p>

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
                  Indispensables au fonctionnement de la plateforme : session d&apos;authentification,
                  sécurité et maintien de session. Ils ne peuvent pas être désactivés.
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
                  Nous aident à comprendre comment les visiteurs interagissent avec la plateforme
                  (pages visitées, durée de session). Ces données sont anonymisées.
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
          <button onClick={handleSave} disabled={pending} className="btn-primary disabled:opacity-60">
            Enregistrer mes préférences
          </button>
          {saved && (
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              ✓ Préférences enregistrées
            </span>
          )}
        </div>

        <p className="mt-8 text-sm" style={{ color: "var(--muted)" }}>
          Pour plus d&apos;informations sur notre utilisation des données, consultez notre{" "}
          <a href="/privacy" style={{ color: "var(--accent)" }} className="hover:underline">
            politique de confidentialité
          </a>
          .
        </p>
      </div>
    </div>
  );
}
