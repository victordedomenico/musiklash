import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — MovieKlash" };

export default function LegalPage() {
  return (
    <div className="page-shell prose prose-invert max-w-3xl py-12">
      <h1>Mentions légales</h1>
      <p>
        MovieKlash est édité par une structure indépendante. Les affiches et métadonnées
        proviennent de{" "}
        <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
          The Movie Database (TMDB)
        </a>
        . MovieKlash n&apos;héberge aucun fichier vidéo.
      </p>
      <p>
        Utilisation des API TMDB conformément aux{" "}
        <a
          href="https://www.themoviedb.org/documentation/api/terms-of-use"
          target="_blank"
          rel="noreferrer"
        >
          conditions d&apos;utilisation TMDB
        </a>
        .
      </p>
    </div>
  );
}
