import { restCountriesContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const travelklash = defineVertical({
  slug: "travelklash",
  name: "TravelKlash",
  source: "restcountries",
  contentSource: restCountriesContentSource,
  branding: {
    tagline: "Fais s'affronter tes destinations",
    description:
      "Crée des tournois voyage et des tierlists de pays. Brackets et classements autour de tes destinations préférées — gratuit.",
    keywords: [
      "tournoi voyage",
      "bracket pays",
      "tierlist destinations",
      "classement pays",
      "duel destinations",
      "jeu voyage en ligne",
      "TravelKlash",
      "travel bracket",
      "country tier list",
      "RestCountries",
    ],
    category: "travel",
    siteUrlFallback: "https://travelklash.vercel.app",
  },
  nouns: {
    item: "lieu",
    items: "lieux",
    collection: "région",
    entity: "destination",
  },
  imageHosts: ["flagcdn.com", "restcountries.com", "upload.wikimedia.org"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.travelklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire pays par pays",
        createTierlistDesc: "Classe tes destinations et régions du monde",
      },
      sidebar: {
        tagline: "L'arène du voyage",
      },
      homeHero: {
        title2: "tes",
        highlight: "destinations",
        subtitle:
          "TravelKlash est l'arène des voyageurs. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Destinations populaires",
        coversTopFallback: "Destinations populaires cette semaine",
      },
      home: {
        badge: "Gratuit · Voyage · RestCountries",
        hero2: "tes destinations.",
        heroSubtitle:
          "Compose des tournois entre tes pays préférés, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination country tournament",
        createTierlistDesc: "Rank your destinations and world regions",
      },
      sidebar: {
        tagline: "The travel arena",
      },
      homeHero: {
        title2: "your",
        highlight: "destinations",
        subtitle:
          "TravelKlash is the arena for travelers. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Popular destinations",
        coversTopFallback: "Popular destinations this week",
      },
    },
  },
});
