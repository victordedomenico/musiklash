import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — TravelKlash" };

export default function LegalPage() {
  return (
    <div className="refit-doc-page">
      <div className="mx-auto max-w-3xl px-4 py-12 prose prose-invert">
        <h1 className="text-4xl font-black mb-2">Mentions légales</h1>
        <p style={{ color: "var(--muted)" }}>
          TravelKlash est édité par une structure indépendante. Les drapeaux et métadonnées géographiques
          proviennent de{" "}
          <a href="https://restcountries.com" style={{ color: "var(--accent)" }}>
            RestCountries
          </a>
          . TravelKlash n&apos;héberge aucun contenu cartographique propriétaire.
        </p>
        <p style={{ color: "var(--muted)" }}>
          Les données de villes (optionnelles) peuvent être enrichies via OpenTripMap lorsque une clé API
          est configurée côté serveur.
        </p>
      </div>
    </div>
  );
}
