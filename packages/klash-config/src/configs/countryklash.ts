import { countryKlashContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const countryklash = defineVertical({
  slug: "countryklash",
  name: "CountryKlash",
  source: "restcountries",
  contentSource: countryKlashContentSource,
  branding: {
    tagline: "L'arène du quiz géo",
    description:
      "Brackets et tierlists autour des pays, capitales, drapeaux et cultures. Teste tes connaissances géographiques — 100 % gratuit.",
    keywords: [
      "quiz géographie",
      "bracket pays",
      "tierlist capitales",
      "drapeaux du monde",
      "quiz culturel",
      "CountryKlash",
      "country bracket",
      "capital tier list",
      "RestCountries",
    ],
    category: "geography",
    siteUrlFallback: "https://countryklash.vercel.app",
  },
  nouns: {
    item: "entrée",
    items: "entrées",
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
  guestEmailDomain: "guest.countryklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire pays, capitales ou drapeaux",
        createTierlistDesc: "Classe tes pays, cultures et connaissances géo",
      },
      sidebar: {
        tagline: "L'arène du quiz géo",
      },
      homeHero: {
        title2: "tes",
        highlight: "connaissances",
        subtitle:
          "CountryKlash met les pays, capitales, drapeaux et cultures en duel. Crée des brackets, défie tes amis et monte en tierlist.",
        coversTopCountry: "Pays populaires",
        coversTopFallback: "Drapeaux populaires cette semaine",
      },
      home: {
        badge: "Gratuit · Géo · RestCountries",
        hero2: "tes connaissances géo.",
        heroSubtitle:
          "Compose des tournois entre pays, capitales et cultures — vote et découvre les vrais champions.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination country, capital or flag tournament",
        createTierlistDesc: "Rank countries, cultures and geo knowledge",
      },
      sidebar: {
        tagline: "The geo quiz arena",
      },
      homeHero: {
        title2: "your",
        highlight: "geo skills",
        subtitle:
          "CountryKlash pits countries, capitals, flags and cultures against each other. Build brackets and tier lists with friends.",
        coversTopCountry: "Popular countries",
        coversTopFallback: "Popular flags this week",
      },
    },
  },
});
