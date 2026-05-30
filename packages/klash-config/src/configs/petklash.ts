import { dogceoContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const petklash = defineVertical({
  slug: "petklash",
  name: "PetKlash",
  source: "dogceo",
  contentSource: dogceoContentSource,
  branding: {
    tagline: "Fais s'affronter tes races préférées",
    description:
      "Crée des tournois et tierlists de races de chiens et chats. Brackets et classements autour de tes compagnons préférés — gratuit.",
    keywords: [
      "tournoi races chiens",
      "bracket chiens chats",
      "tierlist races animaux",
      "classement races chiens",
      "duel races animaux",
      "PetKlash",
      "dog breed bracket",
      "cat breed tier list",
      "Dog CEO API",
      "TheCatAPI",
    ],
    category: "lifestyle",
    siteUrlFallback: "https://petklash.vercel.app",
  },
  nouns: {
    item: "race",
    items: "races",
    entity: "espèce",
  },
  imageHosts: ["images.dog.ceo", "cdn2.thecatapi.com", "upload.wikimedia.org"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.petklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire race par race",
        createTierlistDesc: "Classe tes races de chiens et chats",
      },
      sidebar: {
        tagline: "L'arène des compagnons",
      },
      homeHero: {
        title2: "tes",
        highlight: "compagnons",
        subtitle:
          "PetKlash est l'arène des amoureux des animaux. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Races populaires",
        coversTopFallback: "Races populaires cette semaine",
      },
      home: {
        badge: "Gratuit · Chiens & chats · Dog CEO & TheCatAPI",
        hero2: "tes races préférées.",
        heroSubtitle:
          "Compose des tournois entre races de chiens et chats, vote et découvre les favoris de la communauté.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination breed tournament",
        createTierlistDesc: "Rank your dog and cat breeds",
      },
      sidebar: {
        tagline: "The pet lovers arena",
      },
      homeHero: {
        title2: "your",
        highlight: "pets",
        subtitle:
          "PetKlash is the arena for pet lovers. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Popular breeds",
        coversTopFallback: "Popular breeds this week",
      },
    },
  },
});
