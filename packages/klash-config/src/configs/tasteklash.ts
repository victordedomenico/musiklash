import { themealdbContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const tasteklash = defineVertical({
  slug: "tasteklash",
  name: "TasteKlash",
  source: "themealdb",
  contentSource: themealdbContentSource,
  branding: {
    tagline: "Fais s'affronter plats et boissons",
    description:
      "Crée des tournois et tierlists de plats, aliments, boissons et cocktails. Brackets et classements gourmands — gratuit.",
    keywords: [
      "tournoi cuisine",
      "bracket plats",
      "tierlist boissons",
      "classement cocktails",
      "duel nourriture",
      "TasteKlash",
      "food drink bracket",
      "TheMealDB",
      "TheCocktailDB",
      "Open Food Facts",
    ],
    category: "food",
    siteUrlFallback: "https://tasteklash.vercel.app",
  },
  nouns: {
    item: "gourmandise",
    items: "gourmandises",
    collection: "catégorie",
    entity: "ingrédient",
  },
  imageHosts: [
    "www.themealdb.com",
    "www.thecocktaildb.com",
    "thecocktaildb.com",
    "images.openfoodfacts.org",
    "static.openfoodfacts.org",
    "logo.clearbit.com",
  ],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.tasteklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire plat ou boisson",
        createTierlistDesc: "Classe tes plats, aliments et boissons",
      },
      sidebar: {
        tagline: "L'arène gourmande",
      },
      homeHero: {
        title2: "tes",
        highlight: "gourmandises",
        subtitle:
          "TasteKlash est l'arène des gourmands. Crée des brackets entre plats, aliments, boissons et cocktails.",
        coversTopCountry: "Tendances",
        coversTopFallback: "Plats et boissons tendance",
      },
      home: {
        badge: "Gratuit · Food & Drink · TheMealDB + TheCocktailDB + Open Food Facts",
        hero2: "tes gourmandises.",
        heroSubtitle:
          "Compose des tournois entre tes plats et boissons préférés, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination food or drink tournament",
        createTierlistDesc: "Rank your dishes, foods and drinks",
      },
      sidebar: {
        tagline: "The taste arena",
      },
      homeHero: {
        title2: "your",
        highlight: "tastes",
        subtitle:
          "TasteKlash is the arena for food lovers. Build brackets between dishes, foods, drinks and cocktails.",
        coversTopCountry: "Trending",
        coversTopFallback: "Trending food and drinks",
      },
    },
  },
});
