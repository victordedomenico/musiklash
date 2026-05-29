import { powerklashContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const powerklash = defineVertical({
  slug: "powerklash",
  name: "PowerKlash",
  source: "powerklash",
  contentSource: powerklashContentSource,
  branding: {
    tagline: "Classe la puissance de tes héros",
    description:
      "Tierlists et brackets de power scaling — anime et comics. Classe personnages du plus fort au plus faible, partage tes classements. Gratuit, sans pub.",
    keywords: [
      "power scaling",
      "tierlist puissance",
      "bracket personnages",
      "classement anime",
      "vs battle",
      "PowerKlash",
      "character tier list",
      "AniList",
      "anime power ranking",
    ],
    category: "cross-universe",
    siteUrlFallback: "https://powerklash.vercel.app",
  },
  nouns: {
    item: "personnage",
    items: "personnages",
    collection: "univers",
    entity: "série",
  },
  imageHosts: ["s4.anilist.co", "media.kitsu.app", "i.anncdn.com"],
  gameModes: ["tierlist", "bracket"],
  guestEmailDomain: "guest.powerklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire entre personnages",
        createTierlistDesc: "Classe tes personnages par niveau de puissance",
      },
      sidebar: {
        tagline: "L'arène du power scaling",
      },
      homeHero: {
        title2: "la",
        highlight: "puissance",
        subtitle:
          "PowerKlash est l'arène du power scaling. Classe personnages anime du S au F, défie tes amis en bracket et partage tes tierlists.",
        coversTopCountry: "Personnages populaires",
        coversTopFallback: "Top personnages du moment",
      },
      home: {
        badge: "Gratuit · Power scaling · AniList",
        hero2: "tes personnages.",
        heroSubtitle:
          "Compose des tierlists de puissance et des duels éliminatoires entre héros anime — vote et tranche les débats.",
        feature1Text:
          "Élimine personnage par personnage jusqu'au plus fort. Vote, avance, partage le résultat.",
        feature2Text:
          "Glisse tes personnages du tier S (invincible) au F — le mode principal de PowerKlash.",
        step2Text: "Cherche des personnages AniList — de 4 à 32 entrées.",
      },
      tierlistPage: {
        helper: "Glisse les personnages dans les tiers · du plus fort au plus faible",
      },
      tierlistBoard: {
        allPlaced: "Tous les personnages ont été classés 🎉",
        tracksRanked: "{placed} / {total} personnages classés",
      },
      footer: {
        catalog: "Catalogue personnages via",
        description: "Classe la puissance de tes héros, partage tes tierlists, défie tes amis.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination character tournament",
        createTierlistDesc: "Rank characters by power level",
      },
      sidebar: {
        tagline: "The power scaling arena",
      },
      homeHero: {
        title2: "character",
        highlight: "power",
        subtitle:
          "PowerKlash is the power scaling arena. Rank anime characters from S to F, run brackets and share your tier lists.",
        coversTopCountry: "Popular characters",
        coversTopFallback: "Top characters right now",
      },
      home: {
        badge: "Free · Power scaling · AniList",
        hero1: "Rank your",
        heroSubtitle:
          "Build power tier lists and elimination brackets with anime characters — settle the debates.",
        feature1Text:
          "Eliminate character by character until one stands above all. Vote and share the winner.",
        feature2Text:
          "Drag characters from S-tier (godlike) to F — PowerKlash's main mode.",
        step2Text: "Search AniList characters — pick 4 to 32 entries.",
      },
      tierlistPage: {
        helper: "Drag characters into tiers · strongest to weakest",
      },
      tierlistBoard: {
        allPlaced: "All characters have been placed 🎉",
        tracksRanked: "{placed} / {total} characters ranked",
      },
      footer: {
        catalog: "Character catalog via",
      },
    },
  },
});
