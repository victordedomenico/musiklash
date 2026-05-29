import { ergastContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const f1klash = defineVertical({
  slug: "f1klash",
  name: "F1Klash",
  source: "ergast",
  contentSource: ergastContentSource,
  branding: {
    tagline: "Fais s'affronter la Formule 1",
    description:
      "Crée des tournois et tierlists autour des pilotes, écuries et circuits F1. Brackets et classements — gratuit, données historiques Ergast.",
    keywords: [
      "tournoi F1",
      "bracket Formule 1",
      "tierlist pilotes",
      "classement écuries F1",
      "duel pilotes F1",
      "F1Klash",
      "Formula 1 bracket",
      "Ergast API",
      "Grands Prix",
      "circuits F1",
    ],
    category: "sport",
    siteUrlFallback: "https://f1klash.vercel.app",
  },
  nouns: {
    item: "course",
    items: "courses",
    collection: "saison",
    entity: "pilote",
  },
  imageHosts: ["flagcdn.com", "api.jolpi.ca"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.f1klash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire course par course",
        createTierlistDesc: "Classe pilotes, écuries et circuits",
      },
      sidebar: {
        tagline: "La grille de départ",
      },
      homeHero: {
        title2: "la",
        highlight: "Formule 1",
        subtitle:
          "F1Klash, la grille de départ. Brackets et tierlists entre pilotes, écuries et Grands Prix.",
        coversTopCountry: "Dernière saison",
        coversTopFallback: "Grands Prix récents",
      },
      home: {
        badge: "Gratuit · F1 · Ergast",
        hero2: "la Formule 1.",
        heroSubtitle:
          "Compose des tournois entre tes pilotes et courses préférés, vote et découvre les champions de la grille.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination race tournament",
        createTierlistDesc: "Rank drivers, teams, and circuits",
      },
      sidebar: {
        tagline: "The starting grid",
      },
      homeHero: {
        title2: "",
        highlight: "Formula 1",
        subtitle:
          "F1Klash is the starting grid. Build brackets and tierlists around drivers, teams, and Grands Prix.",
        coversTopCountry: "Latest season",
        coversTopFallback: "Recent Grands Prix",
      },
    },
  },
});
