import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — SeriesKlash" };

export default function LegalPage() {
  return (
    <div className="page-shell prose prose-invert max-w-3xl py-12">
      <h1>Mentions légales</h1>
      <p>
        SeriesKlash est édité par une structure indépendante. Les affiches et métadonnées
        proviennent principalement de{" "}
        <a href="https://www.tvmaze.com/api" target="_blank" rel="noreferrer">
          TVMaze
        </a>
        . Certaines affiches peuvent être enrichies via{" "}
        <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
          The Movie Database (TMDB)
        </a>{" "}
        lorsque configuré côté serveur.
        . SeriesKlash n&apos;héberge aucun fichier vidéo.
      </p>
      <p>
        Utilisation de l&apos;API TVMaze conformément à sa{" "}
        <a href="https://www.tvmaze.com/api" target="_blank" rel="noreferrer">
          documentation publique
        </a>
        .
      </p>
    </div>
  );
}
