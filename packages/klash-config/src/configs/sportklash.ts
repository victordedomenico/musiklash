import { sportsContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const sportklash = defineVertical({
  slug: "sportklash",
  name: "SportKlash",
  source: "thesportsdb",
  contentSource: sportsContentSource,
  branding: {
    tagline: "Fais s'affronter le sport",
    description:
      "Crée des tournois et tierlists multi-sports : football, NBA, F1, MMA, tennis et plus. Brackets et classements autour des matchs, équipes, joueurs, pilotes et fighters — gratuit.",
    keywords: [
      "tournoi sport",
      "bracket football",
      "bracket NBA",
      "bracket F1",
      "bracket MMA",
      "bracket tennis",
      "tierlist équipes",
      "classement joueurs",
      "duel sportif",
      "SportKlash",
      "sports tournament",
      "TheSportsDB",
    ],
    category: "sports",
    siteUrlFallback: "https://sportklash.vercel.app",
  },
  nouns: {
    item: "match",
    items: "matchs",
    collection: "ligue",
    entity: "équipe",
  },
  imageHosts: [
    "www.thesportsdb.com",
    "r2.thesportsdb.com",
    "cdn.nba.com",
    "upload.wikimedia.org",
    "flagcdn.com",
    "api.jolpi.ca",
    "media.api-sports.io",
    "media-1.api-sports.io",
    "media-2.api-sports.io",
  ],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.sportklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire match par match, tous sports",
        createTierlistDesc: "Classe matchs, équipes, joueurs, pilotes et fighters",
      },
      sidebar: {
        tagline: "L'arène du sport",
      },
      homeHero: {
        title2: "le",
        highlight: "sport",
        subtitle:
          "SportKlash, l'arène multi-sports. Brackets et tierlists entre matchs, équipes et stars du football, de la NBA, de la F1, du MMA et du tennis.",
        coversTopCountry: "Matchs du jour",
        coversTopFallback: "Matchs à suivre",
      },
      home: {
        badge: "Gratuit · Multi-sports · TheSportsDB",
        hero2: "le sport.",
        heroSubtitle:
          "Compose des tournois entre tes sports préférés — foot, NBA, F1, MMA, tennis — vote et découvre les vrais champions.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination match tournament, every sport",
        createTierlistDesc: "Rank matches, teams, players, drivers and fighters",
      },
      sidebar: {
        tagline: "The sports arena",
      },
      homeHero: {
        title2: "",
        highlight: "sports",
        subtitle:
          "SportKlash is the multi-sport arena. Build brackets and tierlists across football, the NBA, F1, MMA and tennis.",
        coversTopCountry: "Today's matches",
        coversTopFallback: "Matches to watch",
      },
    },
  },
});
