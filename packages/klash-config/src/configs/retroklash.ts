import { rawgRetroContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const retroklash = defineVertical({
  slug: "retroklash",
  name: "RetroKlash",
  source: "rawg",
  contentSource: rawgRetroContentSource,
  branding: {
    tagline: "Fais s'affronter tes jeux rétro",
    description:
      "Brackets et tierlists autour des jeux vidéo classiques : NES, SNES, Game Boy, Mega Drive et plus. Vote pour les légendes du rétro gaming — gratuit.",
    keywords: [
      "jeux rétro",
      "bracket retro gaming",
      "tierlist jeux classiques",
      "NES SNES",
      "jeux années 80 90",
      "RetroKlash",
      "retro game tournament",
      "classic video games",
      "RAWG",
    ],
    category: "games",
    siteUrlFallback: "https://retroklash.vercel.app",
  },
  nouns: {
    item: "jeu",
    items: "jeux",
    collection: "console",
    entity: "ère",
  },
  imageHosts: ["media.rawg.io", "archive.org"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.retroklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire entre jeux rétro",
        createTierlistDesc: "Classe tes classiques par console ou ère",
      },
      sidebar: {
        tagline: "L'arène du rétro",
      },
      homeHero: {
        title2: "tes",
        highlight: "classiques",
        subtitle:
          "RetroKlash, l'arène des jeux rétro. Brackets, tierlists et duels entre les légendes des consoles 8/16-bit.",
        coversTopCountry: "Classiques tendance",
        coversTopFallback: "Jeux rétro populaires",
      },
      home: {
        badge: "Gratuit · Rétro · RAWG",
        hero2: "tes classiques.",
        heroSubtitle:
          "Compose des tournois entre tes jeux NES, SNES, Game Boy et découvre les vrais champions du pixel.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination retro game tournament",
        createTierlistDesc: "Rank classics by console or era",
      },
      sidebar: {
        tagline: "The retro arena",
      },
      homeHero: {
        title2: "your",
        highlight: "classics",
        subtitle:
          "RetroKlash is the arena for retro games. Build brackets and tierlists around 8/16-bit legends.",
        coversTopCountry: "Trending classics",
        coversTopFallback: "Popular retro games",
      },
    },
  },
});
