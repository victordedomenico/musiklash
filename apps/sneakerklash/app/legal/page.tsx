import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — SneakerKlash" };

export default function LegalPage() {
  return (
    <div className="page-shell prose prose-invert max-w-3xl py-12">
      <h1>Mentions légales</h1>
      <p>
        SneakerKlash est édité par une structure indépendante. Les couvertures et métadonnées
        proviennent de{" "}
        <a href="https://boardgamegeek.com/" target="_blank" rel="noreferrer">
          SneaksAPI
        </a>
        . SneakerKlash n&apos;héberge aucun image sneaker.
      </p>
      <p>
        Utilisation de l&apos;API XML SneaksAPI conformément aux{" "}
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
