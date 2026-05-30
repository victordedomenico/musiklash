import { gamesContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const gameklash = defineVertical({
  slug: "gameklash",
  name: "GameKlash",
  source: "rawg",
  contentSource: gamesContentSource,
  branding: {
    tagline: "Fais s'affronter tes jeux",
    description:
      "Crée des tournois gaming et des tierlists : jeux modernes, rétro et indés. Brackets et classements autour de tes studios, consoles et franchises — gratuit.",
    keywords: [
      "tournoi jeux vidéo",
      "bracket gaming",
      "tierlist jeux",
      "jeux rétro",
      "jeux indés",
      "classement jeux",
      "duel jeux",
      "GameKlash",
      "game bracket",
      "video game tournament",
      "RAWG",
    ],
    category: "games",
    siteUrlFallback: "https://gameklash.vercel.app",
  },
  nouns: {
    item: "jeu",
    items: "jeux",
    collection: "franchise",
    entity: "studio",
  },
  imageHosts: ["media.rawg.io", "archive.org"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.gameklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire jeu par jeu",
        createTierlistDesc: "Classe tes jeux modernes, rétro et indés",
      },
      sidebar: {
        tagline: "L'arène du gaming",
      },
      homeHero: {
        title2: "tes",
        highlight: "jeux",
        subtitle:
          "GameKlash est l'arène des gamers : modernes, rétro et indés. Crée des brackets, défie tes amis et explore la communauté.",
        coversTopCountry: "Jeux tendance",
        coversTopFallback: "Jeux tendance cette semaine",
      },
      home: {
        badge: "Gratuit · Gaming · RAWG",
        hero2: "tes jeux.",
        heroSubtitle:
          "Compose des tournois entre tes jeux préférés — AAA, classiques 8/16-bit ou pépites indés.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination game tournament",
        createTierlistDesc: "Rank your modern, retro and indie games",
      },
      sidebar: {
        tagline: "The gaming arena",
      },
      homeHero: {
        title2: "your",
        highlight: "games",
        subtitle:
          "GameKlash is the arena for gamers — modern, retro and indie. Build brackets and explore community creations.",
        coversTopCountry: "Trending games",
        coversTopFallback: "Trending games this week",
      },
    },
  },
});
