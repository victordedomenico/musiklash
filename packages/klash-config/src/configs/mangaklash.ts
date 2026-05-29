import { mangadexContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const mangaklash = defineVertical({
  slug: "mangaklash",
  name: "MangaKlash",
  source: "mangadex",
  contentSource: mangadexContentSource,
  branding: {
    tagline: "Fais s'affronter tes mangas",
    description:
      "Crée des tournois manga et des tierlists de séries. Brackets et classements autour de tes mangas, auteurs et chapitres préférés — gratuit.",
    keywords: [
      "tournoi manga",
      "bracket manga",
      "tierlist manga",
      "classement mangas",
      "duel manga",
      "jeu manga en ligne",
      "MangaKlash",
      "manga bracket",
      "manga tournament",
      "MangaDex",
    ],
    category: "manga",
    siteUrlFallback: "https://mangaklash.vercel.app",
  },
  nouns: {
    item: "chapitre",
    items: "chapitres",
    collection: "manga",
    entity: "auteur",
  },
  imageHosts: ["uploads.mangadex.org"],
  gameModes: ["bracket", "tierlist"],
  guestEmailDomain: "guest.mangaklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        createBracketDesc: "Tournoi éliminatoire manga par manga",
        createTierlistDesc: "Classe tes mangas et chapitres",
      },
      sidebar: {
        tagline: "L'arène du manga",
      },
      homeHero: {
        title2: "tes",
        highlight: "mangas",
        subtitle:
          "MangaKlash est l'arène des otaku. Crée des brackets, défie tes amis et explore les créations de la communauté.",
        coversTopCountry: "Mangas tendance",
        coversTopFallback: "Mangas tendance cette semaine",
      },
      home: {
        badge: "Gratuit · Manga · MangaDex",
        hero2: "tes mangas.",
        heroSubtitle:
          "Compose des tournois entre tes séries préférées, vote et découvre les vrais gagnants.",
      },
    },
    en: {
      nav: {
        createBracketDesc: "Single-elimination manga tournament",
        createTierlistDesc: "Rank your manga and chapters",
      },
      sidebar: {
        tagline: "The manga arena",
      },
      homeHero: {
        title2: "your",
        highlight: "manga",
        subtitle:
          "MangaKlash is the arena for manga fans. Build brackets, challenge friends, and explore community creations.",
        coversTopCountry: "Trending manga",
        coversTopFallback: "Trending manga this week",
      },
    },
  },
});
