import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales — PokeKlash" };

export default function LegalPage() {
  return (
    <div className="page-shell prose prose-invert max-w-3xl py-12">
      <h1>Mentions légales</h1>
      <p>
        PokeKlash est édité par une structure indépendante. Les illustrations et métadonnées
        proviennent de{" "}
        <a href="https://pokeapi.co/" target="_blank" rel="noreferrer">
          PokéAPI
        </a>
        . PokeKlash n&apos;héberge aucun asset Pokémon.
      </p>
      <p>
        Pokémon et les noms associés sont des marques de The Pokémon Company / Nintendo / Game Freak.
        PokeKlash est un projet fan non affilié.
      </p>
      <p>
        Utilisation de PokéAPI conformément à la{" "}
        <a href="https://pokeapi.co/docs/v2" target="_blank" rel="noreferrer">
          documentation PokéAPI
        </a>
        .
      </p>
    </div>
  );
}
