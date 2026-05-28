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
          Choisissez les cookies optionnels que vous acceptez. Les cookies essentiels restent actifs,
          car ils sont necessaires au fonctionnement du service.
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
                  Mesure d&apos;audience via Vercel Analytics (pages vues, interactions, statistiques
                  de consultation). Active seulement avec votre consentement.
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
          Pour plus d&apos;informations sur nos traitements de donnees, consultez notre{" "}
          <a href="/privacy" style={{ color: "var(--accent)" }} className="hover:underline">
            politique de confidentialité
          </a>
          {" "}et la page{" "}
          <a href="/privacy-rights" style={{ color: "var(--accent)" }} className="hover:underline">
            Exercer mes droits RGPD
          </a>
          .
        </p>

        <div className="mt-10 space-y-4">
          <h2 className="text-2xl font-bold">Detail des cookies utilises</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Le tableau ci-dessous indique les cookies utilises, leur finalite et leur duree de conservation.
          </p>

          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <table className="min-w-full text-sm">
              <thead style={{ background: "var(--surface-2)" }}>
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold">Nom</th>
                  <th className="px-4 py-3 font-semibold">Categorie</th>
                  <th className="px-4 py-3 font-semibold">Finalite</th>
                  <th className="px-4 py-3 font-semibold">Duree</th>
                  <th className="px-4 py-3 font-semibold">Emetteur</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3 font-mono text-xs">mk_cookie_consent</td>
                  <td className="px-4 py-3">Essentiel</td>
                  <td className="px-4 py-3">Memoriser votre choix de consentement cookies.</td>
                  <td className="px-4 py-3">12 mois</td>
                  <td className="px-4 py-3">MusiKlash</td>
                </tr>
                <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3 font-mono text-xs">sb-*</td>
                  <td className="px-4 py-3">Essentiel</td>
                  <td className="px-4 py-3">Authentification et maintien de session utilisateur.</td>
                  <td className="px-4 py-3">Selon session/auth Supabase</td>
                  <td className="px-4 py-3">Supabase</td>
                </tr>
                <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3 font-mono text-xs">mk_guest_id / mk_guest_username</td>
                  <td className="px-4 py-3">Essentiel</td>
                  <td className="px-4 py-3">Identifier un joueur invite et restaurer sa progression.</td>
                  <td className="px-4 py-3">12 mois</td>
                  <td className="px-4 py-3">MusiKlash</td>
                </tr>
                <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3 font-mono text-xs">theme</td>
                  <td className="px-4 py-3">Preferences</td>
                  <td className="px-4 py-3">Memoriser le theme clair/sombre choisi.</td>
                  <td className="px-4 py-3">12 mois</td>
                  <td className="px-4 py-3">MusiKlash</td>
                </tr>
                <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3 font-mono text-xs">locale</td>
                  <td className="px-4 py-3">Preferences</td>
                  <td className="px-4 py-3">Memoriser la langue choisie (fr/en).</td>
                  <td className="px-4 py-3">12 mois</td>
                  <td className="px-4 py-3">MusiKlash</td>
                </tr>
                <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3 font-mono text-xs">_vercel_*</td>
                  <td className="px-4 py-3">Analytiques</td>
                  <td className="px-4 py-3">Mesure d&apos;audience aggregatee via Vercel Analytics.</td>
                  <td className="px-4 py-3">Selon configuration Vercel</td>
                  <td className="px-4 py-3">Vercel</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Les noms de cookies pouvant evoluer selon les mises a jour fournisseurs, les prefixes
            techniques (ex: <span className="font-mono">sb-*</span>, <span className="font-mono">_vercel_*</span>) sont indiques
            lorsqu&apos;ils couvrent une famille de cookies.
          </p>
        </div>
      </div>
    </div>
  );
}
