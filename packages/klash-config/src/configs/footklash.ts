import { footballSportsDbContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const footklash = defineVertical({
  slug: "footklash",
  name: "FootKlash",
  source: "thesportsdb",
  contentSource: footballSportsDbContentSource,
  branding: {
    tagline: "Fais s'affronter le football",
    description:
      "Crée des tournois et tierlists autour des clubs, joueurs et ligues. Brackets et classements football — gratuit.",
    keywords: [
      "tournoi football",
      "bracket football",
      "tierlist clubs",
      "classement joueurs",
      "duel football",
      "FootKlash",
      "football bracket",
      "TheSportsDB",
      "Ligue 1",
      "Premier League",
    ],
    category: "sports",
    siteUrlFallback: "https://footklash.vercel.app",
  },
  nouns: {
    item: "match",
    items: "matchs",
    collection: "ligue",
    entity: "club",
  },
  imageHosts: ["www.thesportsdb.com", "r2.thesportsdb.com"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.footklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire match par match",
        createTierlistDesc: "Classe clubs, joueurs et ligues",
      },
      sidebar: {
        tagline: "L'arène du football",
      },
      homeHero: {
        title2: "le",
        highlight: "football",
        subtitle:
          "FootKlash, l'arène du ballon rond. Brackets, tierlists et duels entre clubs, joueurs et grandes ligues.",
        coversTopCountry: "Prochains matchs",
        coversTopFallback: "Matchs à venir",
      },
      home: {
        badge: "Gratuit · Football · TheSportsDB",
        hero2: "le football.",
        heroSubtitle:
          "Compose des tournois entre tes clubs et matchs préférés, vote et découvre les vrais champions.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination match tournament",
        createTierlistDesc: "Rank clubs, players, and leagues",
      },
      sidebar: {
        tagline: "The football arena",
      },
      homeHero: {
        title2: "",
        highlight: "football",
        subtitle:
          "FootKlash is the beautiful game's arena. Build brackets and tierlists around clubs, players, and major leagues.",
        coversTopCountry: "Upcoming matches",
        coversTopFallback: "Matches to watch",
      },
    },
  },
});
