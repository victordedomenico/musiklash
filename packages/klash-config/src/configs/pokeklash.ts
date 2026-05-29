import { pokeapiContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const pokeklash = defineVertical({
  slug: "pokeklash",
  name: "PokeKlash",
  source: "pokeapi",
  contentSource: pokeapiContentSource,
  branding: {
    tagline: "Fais s'affronter tes Pokémon",
    description:
      "Crée des tournois Pokémon et des tierlists d'espèces. Brackets et classements par type, génération ou chaîne d'évolution — gratuit.",
    keywords: [
      "tournoi Pokémon",
      "bracket Pokémon",
      "tierlist Pokémon",
      "classement Pokémon",
      "duel Pokémon",
      "PokeKlash",
      "pokemon bracket",
      "pokemon tier list",
      "PokéAPI",
    ],
    category: "games",
    siteUrlFallback: "https://pokeklash.vercel.app",
  },
  nouns: {
    item: "Pokémon",
    items: "Pokémon",
    collection: "génération",
    entity: "type",
  },
  imageHosts: ["raw.githubusercontent.com"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.pokeklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire Pokémon par Pokémon",
        createTierlistDesc: "Classe tes Pokémon, types et générations",
      },
      sidebar: {
        tagline: "L'arène Pokémon",
      },
      homeHero: {
        title2: "tes",
        highlight: "Pokémon",
        subtitle:
          "PokeKlash est l'arène des dresseurs. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Pokémon populaires",
        coversTopFallback: "Pokémon populaires cette semaine",
      },
      home: {
        badge: "Gratuit · Pokémon · PokéAPI",
        hero2: "tes Pokémon.",
        heroSubtitle:
          "Compose des tournois entre tes Pokémon préférés, vote et découvre les vrais champions.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination Pokémon tournament",
        createTierlistDesc: "Rank your Pokémon, types and generations",
      },
      sidebar: {
        tagline: "The Pokémon arena",
      },
      homeHero: {
        title2: "your",
        highlight: "Pokémon",
        subtitle:
          "PokeKlash is the arena for trainers. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Popular Pokémon",
        coversTopFallback: "Popular Pokémon this week",
      },
    },
  },
});
