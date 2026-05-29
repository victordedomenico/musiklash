import { tvmazeContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const seriesklash = defineVertical({
  slug: "seriesklash",
  name: "SeriesKlash",
  source: "tvmaze",
  contentSource: tvmazeContentSource,
  branding: {
    tagline: "Fais s'affronter tes séries",
    description:
      "Crée des tournois TV et des tierlists de séries. Brackets et classements autour de tes séries, saisons et épisodes préférés — gratuit.",
    keywords: [
      "tournoi séries",
      "bracket séries TV",
      "tierlist séries",
      "classement séries",
      "duel séries",
      "jeu séries en ligne",
      "SeriesKlash",
      "tv show bracket",
      "series tournament",
      "TVMaze",
    ],
    category: "tv",
    siteUrlFallback: "https://seriesklash.vercel.app",
  },
  nouns: {
    item: "épisode",
    items: "épisodes",
    collection: "saison",
    entity: "série",
  },
  imageHosts: ["static.tvmaze.com", "image.tmdb.org"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.seriesklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire série par série",
        createTierlistDesc: "Classe tes séries et épisodes",
      },
      sidebar: {
        tagline: "L'arène des séries TV",
      },
      homeHero: {
        title2: "tes",
        highlight: "séries",
        subtitle:
          "SeriesKlash est l'arène des fans de séries. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Séries tendance",
        coversTopFallback: "Séries tendance cette semaine",
      },
      home: {
        badge: "Gratuit · Séries TV · TVMaze",
        hero2: "tes séries.",
        heroSubtitle:
          "Compose des tournois entre tes séries préférées, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination TV series tournament",
        createTierlistDesc: "Rank your shows and episodes",
      },
      sidebar: {
        tagline: "The TV series arena",
      },
      homeHero: {
        title2: "your",
        highlight: "shows",
        subtitle:
          "SeriesKlash is the arena for TV fans. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Trending shows",
        coversTopFallback: "Trending shows this week",
      },
    },
  },
});
