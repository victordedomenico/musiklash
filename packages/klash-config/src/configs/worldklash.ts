import { worldContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const worldklash = defineVertical({
  slug: "worldklash",
  name: "WorldKlash",
  source: "restcountries",
  contentSource: worldContentSource,
  branding: {
    tagline: "Fais s'affronter le monde",
    description:
      "Brackets et tierlists autour des pays, capitales, drapeaux, cultures, régions et destinations. Teste tes connaissances géo et voyage — 100 % gratuit.",
    keywords: [
      "quiz géographie",
      "bracket pays",
      "tierlist destinations",
      "drapeaux du monde",
      "quiz voyage",
      "WorldKlash",
      "country travel bracket",
      "RestCountries",
      "Wikidata",
    ],
    category: "geography",
    siteUrlFallback: "https://worldklash.vercel.app",
  },
  nouns: {
    item: "lieu",
    items: "lieux",
    collection: "région",
    entity: "pays",
  },
  imageHosts: [
    "flagcdn.com",
    "restcountries.com",
    "upload.wikimedia.org",
    "commons.wikimedia.org",
  ],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.worldklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire pays, capitales ou destinations",
        createTierlistDesc: "Classe tes pays, cultures et lieux du monde",
      },
      sidebar: {
        tagline: "L'arène du monde",
      },
      homeHero: {
        title2: "ton",
        highlight: "monde",
        subtitle:
          "WorldKlash met pays, capitales, drapeaux, cultures et destinations en duel. Crée des brackets et défie tes amis.",
        coversTopCountry: "Pays populaires",
        coversTopFallback: "Destinations populaires",
      },
      home: {
        badge: "Gratuit · Géo & Voyage · RestCountries + Wikidata",
        hero2: "ton monde.",
        heroSubtitle:
          "Compose des tournois entre pays, capitales, cultures et destinations — vote et découvre les champions.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination country, capital or destination tournament",
        createTierlistDesc: "Rank countries, cultures and world places",
      },
      sidebar: {
        tagline: "The world arena",
      },
      homeHero: {
        title2: "your",
        highlight: "world",
        subtitle:
          "WorldKlash pits countries, capitals, flags, cultures and destinations against each other.",
        coversTopCountry: "Popular countries",
        coversTopFallback: "Popular destinations",
      },
    },
  },
});
