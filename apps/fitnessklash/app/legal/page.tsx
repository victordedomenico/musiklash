import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — FitnessKlash" };

export default function LegalPage() {
  return (
    <div className="refit-doc-page">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-black mb-2">Mentions légales</h1>
        <div className="mt-10 space-y-6" style={{ color: "var(--muted-strong)", lineHeight: 1.8 }}>
          <p>
            Les données d&apos;exercices sont fournies par{" "}
            <a href="https://wger.de" style={{ color: "var(--accent)" }} className="hover:underline">
              wger.de
            </a>{" "}
            (API publique). FitnessKlash n&apos;héberge pas de médias propriétaires tiers.
          </p>
          <p>
            Contenu sous licence Creative Commons lorsque applicable — voir les métadonnées de
            chaque exercice sur Wger.
          </p>
        </div>
      </div>
    </div>
  );
}
