import { scryfallContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const cardklash = defineVertical({
  slug: "cardklash",
  name: "CardKlash",
  source: "scryfall",
  contentSource: scryfallContentSource,
  branding: {
    tagline: "Fais s'affronter tes cartes",
    description:
      "Crée des tournois TCG et des tierlists de cartes à collectionner. Brackets et classements Magic, Pokémon ou Yu-Gi-Oh — gratuit.",
    keywords: [
      "tournoi cartes",
      "bracket TCG",
      "tierlist cartes",
      "classement Magic",
      "duel cartes",
      "jeu cartes en ligne",
      "CardKlash",
      "card bracket",
      "trading card tournament",
      "Scryfall",
    ],
    category: "games",
    siteUrlFallback: "https://cardklash.vercel.app",
  },
  nouns: {
    item: "carte",
    items: "cartes",
    collection: "set",
    entity: "deck",
  },
  imageHosts: ["cards.scryfall.io", "c1.scryfall.io", "c2.scryfall.io", "svgs.scryfall.io", "images.pokemontcg.io", "images.ygoprodeck.com"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.cardklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire carte par carte",
        createTierlistDesc: "Classe tes cartes et sets",
      },
      sidebar: {
        tagline: "L'arène des cartes",
      },
      homeHero: {
        title2: "tes",
        highlight: "cartes",
        subtitle:
          "CardKlash est l'arène des joueurs TCG. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Cartes tendance",
        coversTopFallback: "Cartes tendance cette semaine",
      },
      home: {
        badge: "Gratuit · TCG · Scryfall",
        hero2: "tes cartes.",
        heroSubtitle:
          "Compose des tournois entre tes cartes préférées, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination card tournament",
        createTierlistDesc: "Rank your cards and sets",
      },
      sidebar: {
        tagline: "The TCG arena",
      },
      homeHero: {
        title2: "your",
        highlight: "cards",
        subtitle:
          "CardKlash is the arena for TCG players. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Trending cards",
        coversTopFallback: "Trending cards this week",
      },
    },
  },
});
