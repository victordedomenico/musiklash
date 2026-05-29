import { themealdbContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const foodklash = defineVertical({
  slug: "foodklash",
  name: "FoodKlash",
  source: "themealdb",
  contentSource: themealdbContentSource,
  branding: {
    tagline: "Fais s'affronter tes plats",
    description:
      "Crée des tournois culinaires et des tierlists de recettes. Brackets et classements autour de tes cuisines et plats préférés — gratuit.",
    keywords: [
      "tournoi plats",
      "bracket recettes",
      "tierlist cuisine",
      "classement plats",
      "duel recettes",
      "jeu cuisine en ligne",
      "FoodKlash",
      "food bracket",
      "recipe tournament",
      "TheMealDB",
    ],
    category: "food",
    siteUrlFallback: "https://foodklash.vercel.app",
  },
  nouns: {
    item: "plat",
    items: "plats",
    entity: "cuisine",
  },
  imageHosts: ["www.themealdb.com"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.foodklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire plat par plat",
        createTierlistDesc: "Classe tes plats et cuisines",
      },
      sidebar: {
        tagline: "L'arène culinaire",
      },
      homeHero: {
        title2: "tes",
        highlight: "plats",
        subtitle:
          "FoodKlash est l'arène des gourmets. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Plats tendance",
        coversTopFallback: "Plats tendance aujourd'hui",
      },
      home: {
        badge: "Gratuit · Cuisine · TheMealDB",
        hero2: "tes plats.",
        heroSubtitle:
          "Compose des tournois entre tes recettes préférées, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination dish tournament",
        createTierlistDesc: "Rank your dishes and cuisines",
      },
      sidebar: {
        tagline: "The food arena",
      },
      homeHero: {
        title2: "your",
        highlight: "dishes",
        subtitle:
          "FoodKlash is the arena for food lovers. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Trending dishes",
        coversTopFallback: "Trending dishes today",
      },
    },
  },
});
