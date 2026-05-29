import { openLibraryContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const bookklash = defineVertical({
  slug: "bookklash",
  name: "BookKlash",
  source: "openlibrary",
  contentSource: openLibraryContentSource,
  branding: {
    tagline: "Fais s'affronter tes livres",
    description:
      "Crée des tournois littéraires et des tierlists de livres. Brackets et classements autour de tes auteurs et genres préférés — gratuit.",
    keywords: [
      "tournoi livres",
      "bracket livres",
      "tierlist livres",
      "classement livres",
      "duel livres",
      "jeu lecture en ligne",
      "BookKlash",
      "book bracket",
      "book tournament",
      "Open Library",
    ],
    category: "books",
    siteUrlFallback: "https://bookklash.vercel.app",
  },
  nouns: {
    item: "livre",
    items: "livres",
    entity: "auteur",
  },
  imageHosts: ["covers.openlibrary.org", "books.google.com"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.bookklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire livre par livre",
        createTierlistDesc: "Classe tes livres et auteurs",
      },
      sidebar: {
        tagline: "L'arène de la lecture",
      },
      homeHero: {
        title2: "tes",
        highlight: "livres",
        subtitle:
          "BookKlash est l'arène des lecteurs. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Livres tendance",
        coversTopFallback: "Livres tendance aujourd'hui",
      },
      home: {
        badge: "Gratuit · Lecture · Open Library",
        hero2: "tes livres.",
        heroSubtitle:
          "Compose des tournois entre tes livres préférés, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination book tournament",
        createTierlistDesc: "Rank your books and authors",
      },
      sidebar: {
        tagline: "The reading arena",
      },
      homeHero: {
        title2: "your",
        highlight: "books",
        subtitle:
          "BookKlash is the arena for book lovers. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Trending books",
        coversTopFallback: "Trending books today",
      },
    },
  },
});
