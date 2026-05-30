import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — WorldKlash" };

export default function LegalPage() {
  return (
    <div className="refit-doc-page">
      <div className="mx-auto max-w-3xl px-4 py-12 prose prose-invert">
        <h1 className="text-4xl font-black mb-2">Mentions légales</h1>
        <p style={{ color: "var(--muted)" }}>
          WorldKlash est édité par une structure indépendante. Les drapeaux et métadonnées géographiques
          proviennent de{" "}
          <a href="https://restcountries.com" style={{ color: "var(--accent)" }}>
            RestCountries
          </a>
          . Les lieux peuvent être enrichis via{" "}
          <a href="https://www.wikidata.org" style={{ color: "var(--accent)" }}>
            Wikidata
          </a>
          . WorldKlash n&apos;héberge aucun contenu cartographique propriétaire.
        </p>
      </div>
    </div>
  );
}
