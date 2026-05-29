import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — BoardKlash" };

export default function LegalPage() {
  return (
    <div className="page-shell prose prose-invert max-w-3xl py-12">
      <h1>Mentions légales</h1>
      <p>
        BoardKlash est édité par une structure indépendante. Les couvertures et métadonnées
        proviennent de{" "}
        <a href="https://boardgamegeek.com/" target="_blank" rel="noreferrer">
          BoardGameGeek
        </a>
        . BoardKlash n&apos;héberge aucun fichier de jeu.
      </p>
      <p>
        Utilisation de l&apos;API XML BoardGameGeek conformément aux{" "}
        <a
          href="https://boardgamegeek.com/wiki/page/BGG_XML_API2"
          target="_blank"
          rel="noreferrer"
        >
          conditions d&apos;utilisation BGG
        </a>
        .
      </p>
    </div>
  );
}
