import { islamklashContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const islamklash = defineVertical({
  slug: "islamklash",
  name: "IslamKlash",
  source: "islamklash",
  contentSource: islamklashContentSource,
  branding: {
    tagline: "Fais s'affronter les sourates",
    description:
      "Crée des tournois et tierlists autour des sourates du Coran, des prophètes de l'Islam, des savants et des mosquées du monde. Gratuit, sans pub.",
    keywords: [
      "tournoi sourates",
      "bracket coran",
      "tierlist islam",
      "quiz islam",
      "classement sourates",
      "prophètes islam",
      "savants islamiques",
      "mosquées du monde",
      "IslamKlash",
      "islam bracket",
      "quran tournament",
    ],
    category: "islam",
    siteUrlFallback: "https://islamklash.vercel.app",
  },
  nouns: {
    item: "sourate",
    items: "sourates",
    collection: "juz",
    entity: "prophète",
  },
  imageHosts: ["upload.wikimedia.org", "commons.wikimedia.org"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.islamklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire sourate par sourate",
        createTierlistDesc: "Classe les sourates, prophètes et mosquées",
      },
      sidebar: {
        tagline: "L'arène islamique",
      },
      homeHero: {
        title2: "les",
        highlight: "sourates",
        subtitle:
          "IslamKlash est l'arène pour les passionnés d'Islam. Crée des tournois de sourates, classe les prophètes et explore les grandes mosquées du monde.",
        coversTopCountry: "Sourates populaires",
        coversTopFallback: "Les 114 sourates du Coran",
      },
      home: {
        badge: "Gratuit · Coran · Prophètes · Mosquées",
        hero2: "les sourates.",
        heroSubtitle:
          "Compose des tournois entre les sourates du Coran, vote et découvre les préférées de la communauté.",
      },
      footer: {
        description: "Fais s'affronter les sourates, explore les prophètes et les mosquées du monde.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination surah by surah tournament",
        createTierlistDesc: "Rank surahs, prophets and mosques",
      },
      sidebar: {
        tagline: "The Islamic arena",
      },
      homeHero: {
        title2: "the",
        highlight: "surahs",
        subtitle:
          "IslamKlash is the arena for Islam enthusiasts. Build surah tournaments, rank prophets and explore the world's great mosques.",
        coversTopCountry: "Popular surahs",
        coversTopFallback: "All 114 surahs of the Quran",
      },
      home: {
        badge: "Free · Quran · Prophets · Mosques",
        hero1: "Battle",
        heroSubtitle:
          "Build tournaments with surahs of the Quran, vote and find the community favourites.",
      },
    },
  },
});
