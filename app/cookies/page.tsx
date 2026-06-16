import { getCookieConsent } from "@/lib/cookie-consent";
import CookiesPageClient from "./CookiesPageClient";

export default async function CookiesPage() {
  const consent = await getCookieConsent();
  const initialPrefs = {
    preferences: Boolean(consent?.preferences),
    analytics: Boolean(consent?.analytics),
  };

  return (
    <div className="refit-doc-page">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-black mb-2">Gestion des cookies</h1>
        <p style={{ color: "var(--muted)" }}>
          Choisissez les cookies optionnels que vous acceptez. Les cookies essentiels restent
          actifs, car ils sont necessaires au fonctionnement du service.
        </p>

        <CookiesPageClient initialPrefs={initialPrefs} />

        <p className="mt-8 text-sm" style={{ color: "var(--muted)" }}>
          Pour plus d&apos;informations sur nos traitements de donnees, consultez notre{" "}
          <a href="/privacy" style={{ color: "var(--accent)" }} className="hover:underline">
            politique de confidentialité
          </a>{" "}
          et la page{" "}
          <a href="/privacy-rights" style={{ color: "var(--accent)" }} className="hover:underline">
            Exercer mes droits RGPD
          </a>
          .
        </p>

        <div className="mt-10 space-y-4">
          <h2 className="text-2xl font-bold">Detail des cookies utilises</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Le tableau ci-dessous indique les cookies utilises, leur finalite et leur duree de
            conservation.
          </p>

          <div
            className="overflow-x-auto rounded-xl border"
            style={{ borderColor: "var(--border)" }}
          >
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
                  <td className="px-4 py-3">
                    Authentification et maintien de session utilisateur.
                  </td>
                  <td className="px-4 py-3">Selon session/auth Supabase</td>
                  <td className="px-4 py-3">Supabase</td>
                </tr>
                <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3 font-mono text-xs">mk_guest_id / mk_guest_username</td>
                  <td className="px-4 py-3">Essentiel</td>
                  <td className="px-4 py-3">
                    Identifier un joueur invite et restaurer sa progression.
                  </td>
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
                  <td className="px-4 py-3">
                    Mesure d&apos;audience aggregatee via Vercel Analytics.
                  </td>
                  <td className="px-4 py-3">Selon configuration Vercel</td>
                  <td className="px-4 py-3">Vercel</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Les noms de cookies pouvant evoluer selon les mises a jour fournisseurs, les prefixes
            techniques (ex: <span className="font-mono">sb-*</span>,{" "}
            <span className="font-mono">_vercel_*</span>) sont indiques lorsqu&apos;ils couvrent une
            famille de cookies.
          </p>
        </div>
      </div>
    </div>
  );
}
