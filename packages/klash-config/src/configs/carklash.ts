import { carQueryContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const carklash = defineVertical({
  slug: "carklash",
  name: "CarKlash",
  source: "carquery",
  contentSource: carQueryContentSource,
  branding: {
    tagline: "Fais s'affronter tes voitures",
    description:
      "Crée des tournois automobiles et des tierlists de modèles. Brackets et classements autour de tes marques et carrosseries préférées — gratuit.",
    keywords: [
      "tournoi voitures",
      "bracket automobile",
      "tierlist voitures",
      "classement modèles",
      "duel voitures",
      "jeu auto en ligne",
      "CarKlash",
      "car bracket",
      "car tier list",
      "CarQuery",
      "NHTSA",
    ],
    category: "automotive",
    siteUrlFallback: "https://carklash.vercel.app",
  },
  nouns: {
    item: "modèle",
    items: "modèles",
    collection: "carrosserie",
    entity: "marque",
  },
  imageHosts: ["www.carqueryapi.com"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.carklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire modèle par modèle",
        createTierlistDesc: "Classe tes modèles et marques",
      },
      sidebar: {
        tagline: "L'arène automobile",
      },
      homeHero: {
        title2: "tes",
        highlight: "voitures",
        subtitle:
          "CarKlash est l'arène des passionnés d'automobile. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Modèles iconiques",
        coversTopFallback: "Modèles iconiques cette semaine",
      },
      home: {
        badge: "Gratuit · Automobile · CarQuery & NHTSA",
        hero2: "tes voitures.",
        heroSubtitle:
          "Compose des tournois entre tes modèles préférés, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination car model tournament",
        createTierlistDesc: "Rank your models and brands",
      },
      sidebar: {
        tagline: "The automotive arena",
      },
      homeHero: {
        title2: "your",
        highlight: "cars",
        subtitle:
          "CarKlash is the arena for car enthusiasts. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Iconic models",
        coversTopFallback: "Iconic models this week",
      },
    },
  },
});
