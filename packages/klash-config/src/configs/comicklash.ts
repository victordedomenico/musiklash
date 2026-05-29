import { comicVineContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const comicklash = defineVertical({
  slug: "comicklash",
  name: "ComicKlash",
  source: "comicvine",
  contentSource: comicVineContentSource,
  branding: {
    tagline: "Fais s'affronter tes comics",
    description:
      "Crée des tournois comics et des tierlists de numéros. Brackets et classements autour de tes séries, personnages et arcs préférés — gratuit.",
    keywords: [
      "tournoi comics",
      "bracket comics",
      "tierlist comics",
      "classement comics",
      "duel super-héros",
      "jeu comics en ligne",
      "ComicKlash",
      "comic bracket",
      "comic tournament",
      "Comic Vine",
    ],
    category: "comics",
    siteUrlFallback: "https://comicklash.vercel.app",
  },
  nouns: {
    item: "numéro",
    items: "numéros",
    collection: "arc",
    entity: "personnage",
  },
  imageHosts: ["comicvine.gamespot.com", "gamespot.com"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.comicklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire numéro par numéro",
        createTierlistDesc: "Classe tes comics et personnages",
      },
      sidebar: {
        tagline: "L'arène des comics",
      },
      homeHero: {
        title2: "tes",
        highlight: "comics",
        subtitle:
          "ComicKlash est l'arène des fans de BD. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Comics tendance",
        coversTopFallback: "Derniers numéros ajoutés",
      },
      home: {
        badge: "Gratuit · Comics · Comic Vine",
        hero2: "tes comics.",
        heroSubtitle:
          "Compose des tournois entre tes numéros préférés, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination comic issue tournament",
        createTierlistDesc: "Rank your comics and characters",
      },
      sidebar: {
        tagline: "The comics arena",
      },
      homeHero: {
        title2: "your",
        highlight: "comics",
        subtitle:
          "ComicKlash is the arena for comic fans. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Trending comics",
        coversTopFallback: "Recently added issues",
      },
    },
  },
});
