import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — MangaKlash" };

export default function LegalPage() {
  return (
    <div className="page-shell prose prose-invert max-w-3xl py-12">
      <h1>Mentions légales</h1>
      <p>
        MangaKlash est édité par une structure indépendante. Les couvertures et métadonnées
        proviennent de{" "}
        <a href="https://mangadex.org/" target="_blank" rel="noreferrer">
          MangaDex
        </a>
        . MangaKlash n&apos;héberge aucun scan ni fichier manga.
      </p>
      <p>
        Utilisation de l&apos;API MangaDex conformément aux{" "}
        <a
          href="https://api.mangadex.org/docs/"
          target="_blank"
          rel="noreferrer"
        >
          conditions d&apos;utilisation MangaDex
        </a>
        .
      </p>
    </div>
  );
}
