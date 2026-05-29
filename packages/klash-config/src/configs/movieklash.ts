import { tmdbContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const movieklash = defineVertical({
  slug: "movieklash",
  name: "MovieKlash",
  source: "tmdb",
  contentSource: tmdbContentSource,
  branding: {
    tagline: "Fais s'affronter tes films",
    description:
      "Crée des tournois cinéma et des tierlists de films. Brackets et classements autour de tes sagas, réalisateurs et acteurs préférés — gratuit.",
    keywords: [
      "tournoi films",
      "bracket cinéma",
      "tierlist films",
      "classement films",
      "duel films",
      "jeu cinéma en ligne",
      "MovieKlash",
      "movie bracket",
      "film tournament",
      "TMDB",
    ],
    category: "movies",
    siteUrlFallback: "https://movieklash.vercel.app",
  },
  nouns: {
    item: "film",
    items: "films",
    collection: "saga",
    entity: "réalisateur",
  },
  imageHosts: ["image.tmdb.org"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.movieklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire film par film",
        createTierlistDesc: "Classe tes films et sagas",
      },
      sidebar: {
        tagline: "L'arène du cinéma",
      },
      homeHero: {
        title2: "tes",
        highlight: "films",
        subtitle:
          "MovieKlash est l'arène des cinéphiles. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Films tendance",
        coversTopFallback: "Films tendance cette semaine",
      },
      home: {
        badge: "Gratuit · Cinéma · TMDB",
        hero2: "tes films.",
        heroSubtitle:
          "Compose des tournois entre tes films préférés, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination movie tournament",
        createTierlistDesc: "Rank your movies and franchises",
      },
      sidebar: {
        tagline: "The movie arena",
      },
      homeHero: {
        title2: "your",
        highlight: "movies",
        subtitle:
          "MovieKlash is the arena for film fans. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Trending movies",
        coversTopFallback: "Trending movies this week",
      },
    },
  },
});
