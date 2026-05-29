import { tennisTheSportsDbContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const tennisklash = defineVertical({
  slug: "tennisklash",
  name: "TennisKlash",
  source: "thesportsdb",
  contentSource: tennisTheSportsDbContentSource,
  branding: {
    tagline: "Fais s'affronter le tennis",
    description:
      "Crée des tournois et tierlists autour des joueurs, matchs et circuits tennis. Brackets et classements — gratuit via TheSportsDB.",
    keywords: [
      "tournoi tennis",
      "bracket tennis",
      "tierlist joueurs tennis",
      "classement ATP WTA",
      "duel tennis",
      "TennisKlash",
      "tennis tournament bracket",
      "ATP tier list",
      "TheSportsDB tennis",
    ],
    category: "sport",
    siteUrlFallback: "https://tennisklash.vercel.app",
  },
  nouns: {
    item: "match",
    items: "matchs",
    collection: "tournoi",
    entity: "joueur",
  },
  imageHosts: ["r2.thesportsdb.com", "www.thesportsdb.com"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.tennisklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire match par match",
        createTierlistDesc: "Classe joueurs, tournois et surfaces",
      },
      sidebar: {
        tagline: "L'arène du tennis",
      },
      homeHero: {
        title2: "le",
        highlight: "tennis",
        subtitle:
          "TennisKlash, l'arène des fans de raquette. Brackets, tierlists et duels entre joueurs ATP/WTA et grands tournois.",
        coversTopCountry: "Joueurs du moment",
        coversTopFallback: "Stars ATP & WTA",
      },
      home: {
        badge: "Gratuit · Tennis · TheSportsDB",
        hero2: "le tennis.",
        heroSubtitle:
          "Compose des tournois entre tes joueurs et matchs préférés, vote et découvre les favoris de la communauté.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination match tournament",
        createTierlistDesc: "Rank players, tournaments, and surfaces",
      },
      sidebar: {
        tagline: "The tennis arena",
      },
      homeHero: {
        title2: "",
        highlight: "tennis",
        subtitle:
          "TennisKlash is the arena for racket sports fans. Build brackets and tierlists around ATP/WTA players and major tournaments.",
        coversTopCountry: "Top players",
        coversTopFallback: "ATP & WTA stars",
      },
    },
  },
});
