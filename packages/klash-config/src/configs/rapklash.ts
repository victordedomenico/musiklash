import { rapDeezerContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const rapklash = defineVertical({
  slug: "rapklash",
  name: "RapKlash",
  source: "deezer",
  contentSource: rapDeezerContentSource,
  branding: {
    tagline: "Fais s'affronter le rap",
    description:
      "Tournois, tierlists et blindtests autour du rap français et international. Morceaux filtrés Deezer (genre hip-hop/rap).",
    keywords: [
      "tournoi rap",
      "bracket rap",
      "tierlist rap",
      "blindtest rap",
      "classement morceaux rap",
      "duel rap",
      "hip-hop",
      "RapKlash",
      "rap bracket",
    ],
    category: "music",
    siteUrlFallback: "https://rapklash.vercel.app",
  },
  nouns: {
    item: "morceau",
    items: "morceaux",
    collection: "album",
    entity: "artiste",
  },
  imageHosts: [
    "e-cdns-images.dzcdn.net",
    "cdns-images.dzcdn.net",
    "api.deezer.com",
  ],
  gameModes: [
    "bracket",
    "tierlist",
    "blindtest",
    "smash-pass",
    "stream-clash",
    "battle-feat",
  ],
  relationGraph: "deezer",
  guestEmailDomain: "guest.rapklash.app",
  i18nOverrides: {
    fr: {
      sidebar: {
        tagline: "L'arène du rap",
      },
      homeHero: {
        title2: "ton",
        highlight: "rap",
        subtitle:
          "RapKlash : brackets, blindtests et clashs entre artistes et morceaux hip-hop — avec extraits Deezer.",
        coversTopCountry: "Rap tendance",
        coversTopFallback: "Morceaux rap tendance",
      },
      home: {
        badge: "Gratuit · Rap · Deezer",
        hero2: "ton rap.",
        heroSubtitle:
          "Compose des tournois entre tes morceaux préférés, filtrés genre rap, et explore la communauté.",
      },
    },
    en: {
      sidebar: {
        tagline: "The rap arena",
      },
      homeHero: {
        title2: "your",
        highlight: "rap",
        subtitle:
          "RapKlash: brackets, blindtests and hip-hop showdowns with Deezer previews.",
        coversTopCountry: "Trending rap",
        coversTopFallback: "Trending rap tracks",
      },
    },
  },
});
