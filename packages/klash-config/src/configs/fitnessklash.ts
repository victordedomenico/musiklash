import { wgerContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const fitnessklash = defineVertical({
  slug: "fitnessklash",
  name: "FitnessKlash",
  source: "wger",
  contentSource: wgerContentSource,
  branding: {
    tagline: "Fais s'affronter tes exercices préférés",
    description:
      "Crée des tournois et tierlists d'exercices, de muscles et de programmes. Brackets et classements autour de ta pratique — gratuit.",
    keywords: [
      "tournoi exercices",
      "bracket musculation",
      "tierlist fitness",
      "classement exercices",
      "duel entraînement",
      "FitnessKlash",
      "workout bracket",
      "exercise tier list",
      "Wger API",
      "musculation en ligne",
    ],
    category: "sport",
    siteUrlFallback: "https://fitnessklash.vercel.app",
  },
  nouns: {
    item: "exercice",
    items: "exercices",
    collection: "programme",
    entity: "muscle",
  },
  imageHosts: ["wger.de"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.fitnessklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire exercice par exercice",
        createTierlistDesc: "Classe tes exercices, muscles et programmes",
      },
      sidebar: {
        tagline: "L'arène du fitness",
      },
      homeHero: {
        title2: "ton",
        highlight: "fitness",
        subtitle:
          "FitnessKlash est l'arène des sportifs. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Exercices populaires",
        coversTopFallback: "Exercices populaires cette semaine",
      },
      home: {
        badge: "Gratuit · Musculation · Wger",
        hero2: "tes exercices préférés.",
        heroSubtitle:
          "Compose des tournois entre exercices, muscles et programmes, vote et découvre les favoris de la communauté.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination exercise tournament",
        createTierlistDesc: "Rank exercises, muscles, and programs",
      },
      sidebar: {
        tagline: "The fitness arena",
      },
      homeHero: {
        title2: "your",
        highlight: "fitness",
        subtitle:
          "FitnessKlash is the arena for athletes. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Popular exercises",
        coversTopFallback: "Popular exercises this week",
      },
    },
  },
});
