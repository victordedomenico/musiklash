import { pandascoreContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const esportklash = defineVertical({
  slug: "esportklash",
  name: "EsportKlash",
  source: "pandascore",
  contentSource: pandascoreContentSource,
  branding: {
    tagline: "Fais s'affronter l'esport",
    description:
      "Crée des tournois et tierlists autour des équipes, joueurs et compétitions esport. Brackets et classements — gratuit.",
    keywords: [
      "tournoi esport",
      "bracket esport",
      "tierlist équipes",
      "classement joueurs",
      "duel esport",
      "EsportKlash",
      "esports tournament",
      "PandaScore",
      "équipes esport",
    ],
    category: "games",
    siteUrlFallback: "https://esportklash.vercel.app",
  },
  nouns: {
    item: "match",
    items: "matchs",
    collection: "tournoi",
    entity: "équipe",
  },
  imageHosts: ["cdn.pandascore.co"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.esportklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire match par match",
        createTierlistDesc: "Classe équipes, joueurs et tournois",
      },
      sidebar: {
        tagline: "L'arène de l'esport",
      },
      homeHero: {
        title2: "l'",
        highlight: "esport",
        subtitle:
          "EsportKlash, l'arène compétitive. Brackets, tierlists et duels entre équipes, joueurs et tournois majeurs.",
        coversTopCountry: "Matchs en cours",
        coversTopFallback: "Compétitions à suivre",
      },
      home: {
        badge: "Gratuit · Esport · PandaScore",
        hero2: "l'esport.",
        heroSubtitle:
          "Compose des tournois entre tes équipes et matchs préférés, vote et découvre les vrais champions.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination match tournament",
        createTierlistDesc: "Rank teams, players, and tournaments",
      },
      sidebar: {
        tagline: "The esports arena",
      },
      homeHero: {
        title2: "",
        highlight: "esports",
        subtitle:
          "EsportKlash is the competitive arena. Build brackets and tierlists around teams, players, and major tournaments.",
        coversTopCountry: "Live matches",
        coversTopFallback: "Tournaments to watch",
      },
    },
  },
});
