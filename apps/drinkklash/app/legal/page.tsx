import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — DrinkKlash" };

export default function LegalPage() {
  return (
    <div className="page-shell prose prose-invert max-w-3xl py-12">
      <h1>Mentions légales</h1>
      <p>
        DrinkKlash est édité par une structure indépendante. Les images et métadonnées
        proviennent de{" "}
        <a href="https://www.thecocktaildb.com/" target="_blank" rel="noreferrer">
          TheCocktailDB
        </a>
        . DrinkKlash n&apos;héberge aucune recette propriétaire ni fichier média hébergé localement.
      </p>
      <p>
        Utilisation de l&apos;API TheCocktailDB conformément à leur{" "}
        <a href="https://www.thecocktaildb.com/api.php" target="_blank" rel="noreferrer">
          documentation développeur
        </a>
        .
      </p>
    </div>
  );
}
