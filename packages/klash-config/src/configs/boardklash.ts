import { bggContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const boardklash = defineVertical({
  slug: "boardklash",
  name: "BoardKlash",
  source: "bgg",
  contentSource: bggContentSource,
  branding: {
    tagline: "Fais s'affronter tes jeux de société",
    description:
      "Crée des tournois et tierlists autour de tes jeux de plateau préférés. Brackets et classements par mécaniques et catégories — gratuit, alimenté par BoardGameGeek.",
    keywords: [
      "tournoi jeux de société",
      "bracket jeux de plateau",
      "tierlist board game",
      "classement jeux de société",
      "duel jeux de plateau",
      "BoardKlash",
      "board game bracket",
      "BoardGameGeek",
      "jeux de société en ligne",
    ],
    category: "games",
    siteUrlFallback: "https://boardklash.vercel.app",
  },
  nouns: {
    item: "jeu",
    items: "jeux",
    collection: "catégorie",
    entity: "mécanique",
  },
  imageHosts: ["cf.geekdo-images.com", "boardgamegeek.com"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.boardklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire jeu par jeu",
        createTierlistDesc: "Classe tes jeux de société",
      },
      sidebar: {
        tagline: "L'arène du plateau",
      },
      homeHero: {
        title2: "tes",
        highlight: "jeux de société",
        subtitle:
          "BoardKlash est l'arène des joueurs de plateau. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Jeux tendance",
        coversTopFallback: "Jeux tendance sur BGG",
      },
      home: {
        badge: "Gratuit · Jeux de société · BGG",
        hero2: "tes jeux de société.",
        heroSubtitle:
          "Compose des tournois entre tes jeux de plateau préférés, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination board game tournament",
        createTierlistDesc: "Rank your board games",
      },
      sidebar: {
        tagline: "The tabletop arena",
      },
      homeHero: {
        title2: "your",
        highlight: "board games",
        subtitle:
          "BoardKlash is the arena for tabletop fans. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Trending board games",
        coversTopFallback: "Trending on BoardGameGeek",
      },
    },
  },
});
