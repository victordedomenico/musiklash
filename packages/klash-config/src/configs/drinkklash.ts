import { theCocktailDbContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const drinkklash = defineVertical({
  slug: "drinkklash",
  name: "DrinkKlash",
  source: "thecocktaildb",
  contentSource: theCocktailDbContentSource,
  branding: {
    tagline: "Fais s'affronter tes boissons",
    description:
      "Crée des tournois de cocktails et des tierlists de boissons. Brackets et classements autour de tes recettes préférées — gratuit.",
    keywords: [
      "tournoi cocktails",
      "bracket cocktails",
      "tierlist boissons",
      "classement cocktails",
      "duel cocktails",
      "jeu bar en ligne",
      "DrinkKlash",
      "cocktail bracket",
      "cocktail tournament",
      "TheCocktailDB",
    ],
    category: "food",
    siteUrlFallback: "https://drinkklash.vercel.app",
  },
  nouns: {
    item: "boisson",
    items: "boissons",
    entity: "cocktail",
  },
  imageHosts: ["www.thecocktaildb.com", "thecocktaildb.com", "images.openfoodfacts.org", "static.openfoodfacts.org"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.drinkklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire boisson par boisson",
        createTierlistDesc: "Classe tes cocktails et catégories",
      },
      sidebar: {
        tagline: "L'arène du bar",
      },
      homeHero: {
        title2: "tes",
        highlight: "boissons",
        subtitle:
          "DrinkKlash est l'arène des amateurs de cocktails. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Cocktails tendance",
        coversTopFallback: "Cocktails du moment",
      },
      home: {
        badge: "Gratuit · Cocktails · TheCocktailDB",
        hero2: "tes boissons.",
        heroSubtitle:
          "Compose des tournois entre tes cocktails préférés, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination drink tournament",
        createTierlistDesc: "Rank your cocktails and categories",
      },
      sidebar: {
        tagline: "The bar arena",
      },
      homeHero: {
        title2: "your",
        highlight: "drinks",
        subtitle:
          "DrinkKlash is the arena for cocktail lovers. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Trending cocktails",
        coversTopFallback: "Cocktails of the moment",
      },
    },
  },
});
