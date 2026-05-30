import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — FoodKlash" };

export default function LegalPage() {
  return (
    <div className="page-shell prose prose-invert max-w-3xl py-12">
      <h1>Mentions légales</h1>
      <p>
        FoodKlash est édité par une structure indépendante. Les images et métadonnées de recettes
        proviennent de{" "}
        <a href="https://www.themealdb.com/" target="_blank" rel="noreferrer">
          TheMealDB
        </a>
        . FoodKlash n&apos;héberge aucun contenu culinaire propriétaire.
      </p>
      <p>
        Utilisation de l&apos;API TheMealDB conformément à leur{" "}
        <a href="https://www.themealdb.com/api.php" target="_blank" rel="noreferrer">
          documentation API
        </a>
        .
      </p>
    </div>
  );
}
