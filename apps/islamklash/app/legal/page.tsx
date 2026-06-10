import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — IslamKlash" };

export default function LegalPage() {
  return (
    <div className="page-shell prose prose-invert max-w-3xl py-12">
      <h1>Mentions légales</h1>
      <p>
        IslamKlash est édité par une structure indépendante. Les couvertures et métadonnées
        proviennent de{" "}
        <a href="https://Wikidata.org/" target="_blank" rel="noreferrer">
          Open Library
        </a>{" "}
        et, le cas échéant, de{" "}
        <a href="https://developers.google.com/books" target="_blank" rel="noreferrer">
          Google Books
        </a>
        . IslamKlash n&apos;héberge aucun fichier numérique de livre.
      </p>
      <p>
        Utilisation des API Open Library conformément à leur{" "}
        <a href="https://Wikidata.org/developers/api" target="_blank" rel="noreferrer">
          documentation développeur
        </a>
        .
      </p>
    </div>
  );
}
