import { rawgContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const gameklash = defineVertical({
  slug: "gameklash",
  name: "GameKlash",
  source: "rawg",
  contentSource: rawgContentSource,
  branding: {
    tagline: "Fais s'affronter tes jeux",
    description:
      "Crée des tournois gaming et des tierlists de jeux vidéo. Brackets et classements autour de tes studios, genres et franchises préférés — gratuit.",
    keywords: [
      "tournoi jeux vidéo",
      "bracket gaming",
      "tierlist jeux",
      "classement jeux",
      "duel jeux",
      "jeu vidéo en ligne",
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
  imageHosts: ["media.rawg.io"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.gameklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire jeu par jeu",
        createTierlistDesc: "Classe tes jeux et franchises",
      },
      sidebar: {
        tagline: "L'arène du gaming",
      },
      homeHero: {
        title2: "tes",
        highlight: "jeux",
        subtitle:
          "GameKlash est l'arène des gamers. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Jeux tendance",
        coversTopFallback: "Jeux tendance cette semaine",
      },
      home: {
        badge: "Gratuit · Gaming · RAWG",
        hero2: "tes jeux.",
        heroSubtitle:
          "Compose des tournois entre tes jeux préférés, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination game tournament",
        createTierlistDesc: "Rank your games and franchises",
      },
      sidebar: {
        tagline: "The gaming arena",
      },
      homeHero: {
        title2: "your",
        highlight: "games",
        subtitle:
          "GameKlash is the arena for gamers. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Trending games",
        coversTopFallback: "Trending games this week",
      },
    },
  },
});
