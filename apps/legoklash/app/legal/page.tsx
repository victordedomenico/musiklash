import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — GameKlash" };

export default function LegalPage() {
  return (
    <div className="page-shell prose prose-invert max-w-3xl py-12">
      <h1>Mentions légales</h1>
      <p>
        GameKlash est édité par une structure indépendante. Les couvertures et métadonnées
        proviennent de{" "}
        <a href="https://rawg.io/" target="_blank" rel="noreferrer">
          RAWG Video Games Database
        </a>
        . GameKlash n&apos;héberge aucun fichier de jeu.
      </p>
      <p>
        Utilisation de l&apos;API RAWG conformément aux{" "}
        <a href="https://rawg.io/apidocs" target="_blank" rel="noreferrer">
          conditions d&apos;utilisation RAWG
        </a>
        .
      </p>
    </div>
  );
}
