import { screenContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const screenklash = defineVertical({
  slug: "screenklash",
  name: "ScreenKlash",
  source: "screenklash",
  contentSource: screenContentSource,
  branding: {
    tagline: "Fais s'affronter films et séries",
    description:
      "Crée des tournois et tierlists de films et de séries. Brackets et classements autour de tes sagas, séries et personnages préférés — gratuit.",
    keywords: [
      "tournoi films séries",
      "bracket cinéma",
      "tierlist séries",
      "classement films",
      "duel séries",
      "ScreenKlash",
      "movie series bracket",
      "TMDB",
      "TVMaze",
    ],
    category: "movies",
    siteUrlFallback: "https://screenklash.vercel.app",
  },
  nouns: {
    item: "titre",
    items: "titres",
    collection: "saga",
    entity: "réalisateur",
  },
  imageHosts: ["image.tmdb.org", "static.tvmaze.com"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.screenklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire film ou série",
        createTierlistDesc: "Classe tes films, séries et sagas",
      },
      sidebar: {
        tagline: "L'arène de l'écran",
      },
      homeHero: {
        title2: "tes",
        highlight: "écrans",
        subtitle:
          "ScreenKlash est l'arène des cinéphiles et sériphiles. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Tendances",
        coversTopFallback: "Films et séries tendance",
      },
      home: {
        badge: "Gratuit · Films & Séries · TMDB + TVMaze",
        hero2: "tes écrans.",
        heroSubtitle:
          "Compose des tournois entre tes films et séries préférés, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination movie or series tournament",
        createTierlistDesc: "Rank your movies, series and franchises",
      },
      sidebar: {
        tagline: "The screen arena",
      },
      homeHero: {
        title2: "your",
        highlight: "screen",
        subtitle:
          "ScreenKlash is the arena for film and series fans. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Trending",
        coversTopFallback: "Trending movies and series",
      },
    },
  },
});
