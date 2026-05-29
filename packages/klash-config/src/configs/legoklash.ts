import { rebrickableContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const legoklash = defineVertical({
  slug: "legoklash",
  name: "LegoKlash",
  source: "rebrickable",
  contentSource: rebrickableContentSource,
  branding: {
    tagline: "Fais s'affronter tes sets LEGO",
    description:
      "Crée des tournois LEGO et des tierlists de sets. Brackets et classements autour de tes licences et minifigs préférés — gratuit.",
    keywords: [
      "tournoi LEGO",
      "bracket LEGO",
      "tierlist sets",
      "classement LEGO",
      "duel minifigs",
      "jeu LEGO en ligne",
      "LegoKlash",
      "LEGO bracket",
      "Rebrickable",
    ],
    category: "games",
    siteUrlFallback: "https://legoklash.vercel.app",
  },
  nouns: {
    item: "set",
    items: "sets",
    collection: "licence",
    entity: "licence",
  },
  imageHosts: ["cdn.rebrickable.com", "rebrickable.com"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.legoklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire set par set",
        createTierlistDesc: "Classe tes sets et minifigs",
      },
      sidebar: {
        tagline: "L'arène LEGO",
      },
      homeHero: {
        title2: "tes",
        highlight: "sets",
        subtitle:
          "LegoKlash est l'arène des fans de briques. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Sets tendance",
        coversTopFallback: "Sets récents",
      },
      home: {
        badge: "Gratuit · LEGO · Rebrickable",
        hero2: "tes sets.",
        heroSubtitle:
          "Compose des tournois entre tes sets préférés, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination set tournament",
        createTierlistDesc: "Rank your sets and minifigs",
      },
      sidebar: {
        tagline: "The LEGO arena",
      },
      homeHero: {
        title2: "your",
        highlight: "sets",
        subtitle:
          "LegoKlash is the arena for brick fans. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Trending sets",
        coversTopFallback: "Recent sets",
      },
    },
  },
});
