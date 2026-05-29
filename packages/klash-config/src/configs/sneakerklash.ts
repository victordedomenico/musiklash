import { sneaksContentSource } from "@klash/content-adapter/sneaks";
import { defineVertical } from "../define";

export const sneakerklash = defineVertical({
  slug: "sneakerklash",
  name: "SneakerKlash",
  source: "sneaks",
  contentSource: sneaksContentSource,
  branding: {
    tagline: "Fais s'affronter tes sneakers",
    description:
      "Crée des tournois et tierlists autour de tes colorways et modèles préférés. Brackets et classements sneaker — gratuit, via proxy SneaksAPI.",
    keywords: [
      "tournoi sneakers",
      "bracket sneakers",
      "tierlist sneakers",
      "classement colorways",
      "duel sneakers",
      "SneakerKlash",
      "sneaker bracket",
      "StockX",
      "colorway",
    ],
    category: "lifestyle",
    siteUrlFallback: "https://sneakerklash.vercel.app",
  },
  nouns: {
    item: "colorway",
    items: "colorways",
    collection: "drop",
    entity: "modèle",
  },
  imageHosts: [
    "images.stockx.com",
    "stockx-assets.imgix.net",
    "cdn.shopify.com",
    "image.goat.com",
    "media.stadiumgoods.com",
    "images.flightclub.com",
  ],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.sneakerklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire colorway par colorway",
        createTierlistDesc: "Classe tes colorways et drops",
      },
      sidebar: {
        tagline: "L'arène sneaker",
      },
      homeHero: {
        title2: "tes",
        highlight: "sneakers",
        subtitle:
          "SneakerKlash est l'arène des passionnés. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Drops tendance",
        coversTopFallback: "Colorways populaires cette semaine",
      },
      home: {
        badge: "Gratuit · Sneakers · SneaksAPI",
        hero2: "tes sneakers.",
        heroSubtitle:
          "Compose des tournois entre tes colorways préférés, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination colorway tournament",
        createTierlistDesc: "Rank your colorways and drops",
      },
      sidebar: {
        tagline: "The sneaker arena",
      },
      homeHero: {
        title2: "your",
        highlight: "sneakers",
        subtitle:
          "SneakerKlash is the arena for sneakerheads. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Trending drops",
        coversTopFallback: "Popular colorways this week",
      },
    },
  },
});
