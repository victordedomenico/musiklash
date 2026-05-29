import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — CardKlash" };

export default function LegalPage() {
  return (
    <div className="page-shell prose prose-invert max-w-3xl py-12">
      <h1>Mentions légales</h1>
      <p>
        CardKlash est édité par une structure indépendante. Les illustrations et métadonnées
        proviennent de{" "}
        <a href="https://scryfall.com/" target="_blank" rel="noreferrer">
          Scryfall
        </a>
        . CardKlash n&apos;héberge aucune image de carte.
      </p>
      <p>
        Utilisation de l&apos;API Scryfall conformément aux{" "}
        <a href="https://scryfall.com/docs/api" target="_blank" rel="noreferrer">
          conditions d&apos;utilisation Scryfall
        </a>
        . Magic: The Gathering est une marque de Wizards of the Coast.
      </p>
    </div>
  );
}
