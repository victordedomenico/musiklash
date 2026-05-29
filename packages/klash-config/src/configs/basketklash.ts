import { balldontlieContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const basketklash = defineVertical({
  slug: "basketklash",
  name: "BasketKlash",
  source: "balldontlie",
  contentSource: balldontlieContentSource,
  branding: {
    tagline: "Fais s'affronter la NBA",
    description:
      "Crée des tournois et tierlists autour des équipes, joueurs et matchs NBA. Brackets et classements — gratuit.",
    keywords: [
      "tournoi NBA",
      "bracket basketball",
      "tierlist équipes NBA",
      "classement joueurs NBA",
      "duel basketball",
      "BasketKlash",
      "NBA bracket",
      "BallDontLie",
      "équipes NBA",
    ],
    category: "sport",
    siteUrlFallback: "https://basketklash.vercel.app",
  },
  nouns: {
    item: "match",
    items: "matchs",
    collection: "saison",
    entity: "équipe",
  },
  imageHosts: ["cdn.nba.com", "upload.wikimedia.org"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.basketklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire match par match",
        createTierlistDesc: "Classe équipes, joueurs et saisons NBA",
      },
      sidebar: {
        tagline: "L'arène du basket",
      },
      homeHero: {
        title2: "la",
        highlight: "NBA",
        subtitle:
          "BasketKlash, l'arène du basketball. Brackets, tierlists et duels entre équipes, joueurs et matchs NBA.",
        coversTopCountry: "Matchs récents",
        coversTopFallback: "Matchs NBA à suivre",
      },
      home: {
        badge: "Gratuit · NBA · BallDontLie",
        hero2: "la NBA.",
        heroSubtitle:
          "Compose des tournois entre tes équipes et matchs préférés, vote et découvre les vrais champions.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination game tournament",
        createTierlistDesc: "Rank NBA teams, players, and seasons",
      },
      sidebar: {
        tagline: "The basketball arena",
      },
      homeHero: {
        title2: "",
        highlight: "NBA",
        subtitle:
          "BasketKlash is the basketball arena. Build brackets and tierlists around NBA teams, players, and games.",
        coversTopCountry: "Recent games",
        coversTopFallback: "NBA games to watch",
      },
    },
  },
});
