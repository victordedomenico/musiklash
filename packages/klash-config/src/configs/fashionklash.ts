import { openFashionContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const fashionklash = defineVertical({
  slug: "fashionklash",
  name: "FashionKlash",
  source: "openfashion",
  contentSource: openFashionContentSource,
  branding: {
    tagline: "Fais s'affronter tes pièces mode",
    description:
      "Crée des tournois mode et des tierlists de vêtements. Brackets et classements autour de marques, styles et pièces — gratuit.",
    keywords: [
      "tournoi mode",
      "bracket mode",
      "tierlist vêtements",
      "classement mode",
      "duel mode",
      "jeu fashion en ligne",
      "FashionKlash",
      "fashion bracket",
      "open fashion data",
    ],
    category: "fashion",
    siteUrlFallback: "https://fashionklash.vercel.app",
  },
  nouns: {
    item: "pièce",
    items: "pièces",
    entity: "marque",
  },
  imageHosts: [
    "cdn.shopify.com",
    "raw.githubusercontent.com",
    "upload.wikimedia.org",
  ],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.fashionklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire pièce par pièce",
        createTierlistDesc: "Classe tes pièces, styles et marques",
      },
      sidebar: {
        tagline: "L'arène de la mode",
      },
      homeHero: {
        title2: "tes",
        highlight: "pièces",
        subtitle:
          "FashionKlash est l'arène des passionnés de mode. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Pièces tendance",
        coversTopFallback: "Pièces tendance aujourd'hui",
      },
      home: {
        badge: "Gratuit · Mode · Open Fashion",
        hero2: "tes pièces.",
        heroSubtitle:
          "Compose des tournois entre tes vêtements préférés, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination fashion tournament",
        createTierlistDesc: "Rank your garments, styles and brands",
      },
      sidebar: {
        tagline: "The fashion arena",
      },
      homeHero: {
        title2: "your",
        highlight: "looks",
        subtitle:
          "FashionKlash is the arena for style lovers. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Trending pieces",
        coversTopFallback: "Trending pieces today",
      },
    },
  },
});
