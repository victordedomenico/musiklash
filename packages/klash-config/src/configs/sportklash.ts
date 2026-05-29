import { theSportsDbContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const sportklash = defineVertical({
  slug: "sportklash",
  name: "SportKlash",
  source: "thesportsdb",
  contentSource: theSportsDbContentSource,
  branding: {
    tagline: "Fais s'affronter le sport",
    description:
      "Crée des tournois et tierlists autour des matchs, équipes et joueurs. Brackets et classements sportifs — gratuit.",
    keywords: [
      "tournoi sport",
      "bracket football",
      "tierlist équipes",
      "classement joueurs",
      "duel sportif",
      "SportKlash",
      "sports tournament",
      "TheSportsDB",
      "match bracket",
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
  imageHosts: ["www.thesportsdb.com", "r2.thesportsdb.com"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.sportklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire match par match",
        createTierlistDesc: "Classe équipes, joueurs et ligues",
      },
      sidebar: {
        tagline: "L'arène du sport",
      },
      homeHero: {
        title2: "le",
        highlight: "sport",
        subtitle:
          "SportKlash, l'arène compétitive. Brackets, tierlists et duels entre équipes, joueurs et grands matchs.",
        coversTopCountry: "Matchs du jour",
        coversTopFallback: "Matchs à suivre",
      },
      home: {
        badge: "Gratuit · Sport · TheSportsDB",
        hero2: "le sport.",
        heroSubtitle:
          "Compose des tournois entre tes équipes et matchs préférés, vote et découvre les vrais champions.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination match tournament",
        createTierlistDesc: "Rank teams, players, and leagues",
      },
      sidebar: {
        tagline: "The sports arena",
      },
      homeHero: {
        title2: "",
        highlight: "sports",
        subtitle:
          "SportKlash is the competitive arena. Build brackets and tierlists around teams, players, and major matches.",
        coversTopCountry: "Today's matches",
        coversTopFallback: "Matches to watch",
      },
    },
  },
});
