import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — EsportKlash" };

export default function LegalPage() {
  return (
    <div className="page-shell prose prose-invert max-w-3xl py-12">
      <h1>Mentions légales</h1>
      <p>
        EsportKlash est édité par une structure indépendante. Les données compétitives
        proviennent de{" "}
        <a href="https://www.pandascore.co/" target="_blank" rel="noreferrer">
          PandaScore
        </a>
        . EsportKlash n&apos;héberge aucun flux vidéo ni retransmission de match.
      </p>
      <p>
        Utilisation de l&apos;API PandaScore conformément aux{" "}
        <a href="https://developers.pandascore.co/" target="_blank" rel="noreferrer">
          conditions PandaScore
        </a>
        .
      </p>
    </div>
  );
}
