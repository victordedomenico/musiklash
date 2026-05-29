import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — ComicKlash" };

export default function LegalPage() {
  return (
    <div className="page-shell prose prose-invert max-w-3xl py-12">
      <h1>Mentions légales</h1>
      <p>
        ComicKlash est édité par une structure indépendante. Les couvertures et métadonnées
        proviennent de{" "}
        <a href="https://comicvine.gamespot.com/" target="_blank" rel="noreferrer">
          Comic Vine
        </a>
        . ComicKlash n&apos;héberge aucun fichier numérique de bande dessinée.
      </p>
      <p>
        Utilisation de l&apos;API Comic Vine conformément à leur{" "}
        <a href="https://comicvine.gamespot.com/api/" target="_blank" rel="noreferrer">
          documentation développeur
        </a>
        .
      </p>
    </div>
  );
}
