import { characterKlashContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const characterklash = defineVertical({
  slug: "characterklash",
  name: "CharacterKlash",
  source: "characterklash",
  contentSource: characterKlashContentSource,
  branding: {
    tagline: "Fais s'affronter tes personnages",
    description:
      "Brackets et tierlists cross-univers : personnages anime (AniList) et stars du cinéma (TMDB). Duels impossibles, classements épiques — gratuit.",
    keywords: [
      "tournoi personnages",
      "bracket personnages",
      "tierlist personnages",
      "duel cross-univers",
      "anime vs cinéma",
      "CharacterKlash",
      "character bracket",
      "AniList",
      "TMDB",
    ],
    category: "cross-universe",
    siteUrlFallback: "https://characterklash.vercel.app",
  },
  nouns: {
    item: "personnage",
    items: "personnages",
    collection: "univers",
    entity: "héros",
  },
  imageHosts: ["s4.anilist.co", "image.tmdb.org", "cdn.jsdelivr.net", "raw.githubusercontent.com", "static.tvmaze.com"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.characterklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire entre personnages de tous univers",
        createTierlistDesc: "Classe tes héros anime, cinéma et séries",
      },
      sidebar: {
        tagline: "L'arène cross-univers",
      },
      homeHero: {
        title2: "tes",
        highlight: "personnages",
        subtitle:
          "CharacterKlash met en duel les héros anime et les stars du cinéma. Crée des brackets impossibles et partage tes tierlists.",
        coversTopCountry: "Personnages populaires",
        coversTopFallback: "Héros populaires cette semaine",
      },
      home: {
        badge: "Gratuit · Cross-univers · AniList & TMDB",
        hero2: "tes personnages.",
        heroSubtitle:
          "Compose des tournois entre persos anime et figures du cinéma — vote et couronne le champion ultime.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination tournament across anime and film icons",
        createTierlistDesc: "Rank anime characters and film stars",
      },
      sidebar: {
        tagline: "The cross-universe arena",
      },
      homeHero: {
        title2: "your",
        highlight: "characters",
        subtitle:
          "CharacterKlash pits anime heroes against film and TV icons. Build impossible brackets and tier lists with friends.",
        coversTopCountry: "Popular characters",
        coversTopFallback: "Popular heroes this week",
      },
    },
  },
});
