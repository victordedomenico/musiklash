import { apiSportsMmaContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const fightklash = defineVertical({
  slug: "fightklash",
  name: "FightKlash",
  source: "api-sports",
  contentSource: apiSportsMmaContentSource,
  branding: {
    tagline: "Fais s'affronter les arts martiaux",
    description:
      "Crée des tournois et tierlists autour des combats MMA, fighters et organisations. Brackets et classements — gratuit.",
    keywords: [
      "tournoi MMA",
      "bracket UFC",
      "tierlist fighters",
      "classement combats",
      "duel MMA",
      "FightKlash",
      "MMA bracket",
      "API-Sports MMA",
      "fighters UFC",
    ],
    category: "sport",
    siteUrlFallback: "https://fightklash.vercel.app",
  },
  nouns: {
    item: "combat",
    items: "combats",
    collection: "style",
    entity: "fighter",
  },
  imageHosts: ["media.api-sports.io", "media-1.api-sports.io", "media-2.api-sports.io", "upload.wikimedia.org"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.fightklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire combat par combat",
        createTierlistDesc: "Classe fighters, styles et combats MMA",
      },
      sidebar: {
        tagline: "L'octogone t'attend",
      },
      homeHero: {
        title2: "l'",
        highlight: "octogone",
        subtitle:
          "FightKlash, l'arène des arts martiaux. Brackets, tierlists et duels entre fighters, catégories de poids et grands événements MMA.",
        coversTopCountry: "Combats récents",
        coversTopFallback: "Combats à suivre",
      },
      home: {
        badge: "Gratuit · MMA · API-Sports",
        hero2: "l'octogone.",
        heroSubtitle:
          "Compose des tournois entre tes fighters et combats préférés, vote et découvre les vrais champions.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination fight tournament",
        createTierlistDesc: "Rank fighters, weight classes, and MMA bouts",
      },
      sidebar: {
        tagline: "The octagon awaits",
      },
      homeHero: {
        title2: "the",
        highlight: "octagon",
        subtitle:
          "FightKlash is the martial arts arena. Build brackets and tierlists around fighters, weight classes, and major MMA events.",
        coversTopCountry: "Recent fights",
        coversTopFallback: "Fights to watch",
      },
    },
  },
});
