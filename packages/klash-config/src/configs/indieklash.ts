import { rawgIndieContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const indieklash = defineVertical({
  slug: "indieklash",
  name: "IndieKlash",
  source: "rawg",
  contentSource: rawgIndieContentSource,
  branding: {
    tagline: "Fais s'affronter tes jeux indés",
    description:
      "Brackets et tierlists autour des jeux indépendants : studios, game jams et tags RAWG. Vote pour tes pépites indie — gratuit.",
    keywords: [
      "jeux indépendants",
      "bracket indie games",
      "tierlist jeux indés",
      "game jam",
      "RAWG indie",
      "IndieKlash",
      "indie game tournament",
      "itch.io games",
    ],
    category: "games",
    siteUrlFallback: "https://indieklash.vercel.app",
  },
  nouns: {
    item: "jeu",
    items: "jeux",
    collection: "tag",
    entity: "dev",
  },
  imageHosts: ["media.rawg.io"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.indieklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire entre jeux indés",
        createTierlistDesc: "Classe tes indés par tag ou jam",
      },
      sidebar: {
        tagline: "L'arène des indés",
      },
      homeHero: {
        title2: "tes",
        highlight: "indés",
        subtitle:
          "IndieKlash, l'arène des jeux indépendants. Brackets, tierlists et duels entre pépites des game jams.",
        coversTopCountry: "Indés tendance",
        coversTopFallback: "Jeux indés populaires",
      },
      home: {
        badge: "Gratuit · Indés · RAWG",
        hero2: "tes indés.",
        heroSubtitle:
          "Compose des tournois entre tes jeux indépendants préférés et découvre les champions des jams.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination indie game tournament",
        createTierlistDesc: "Rank your indies by tag or jam",
      },
      sidebar: {
        tagline: "The indie arena",
      },
      homeHero: {
        title2: "your",
        highlight: "indies",
        subtitle:
          "IndieKlash is the arena for independent games. Build brackets and tierlists around jams and devs.",
        coversTopCountry: "Trending indies",
        coversTopFallback: "Popular indie games",
      },
    },
  },
});
