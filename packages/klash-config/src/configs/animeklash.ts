import { anilistContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const animeklash = defineVertical({
  slug: "animeklash",
  name: "AnimeKlash",
  source: "anilist",
  contentSource: anilistContentSource,
  branding: {
    tagline: "Fais s'affronter tes animés",
    description:
      "Crée des tournois d'anime, vote et partage tes classements. Brackets, tierlists, blindtests openings, BattleClash, Smash or Pass et Stream Clash — gratuit, sans pub.",
    keywords: [
      "tournoi anime",
      "bracket anime",
      "tierlist anime",
      "blindtest anime",
      "blindtest opening",
      "quiz anime",
      "classement animés",
      "duel anime",
      "battleclash anime",
      "co-apparition personnages anime",
      "smash or pass anime",
      "stream clash anime",
      "jeu anime en ligne",
      "AnimeKlash",
      "anime bracket",
      "anime tournament",
      "AniList",
    ],
    category: "anime",
    siteUrlFallback: "https://animeklash.vercel.app",
  },
  nouns: {
    item: "entrée",
    items: "entrées",
    collection: "série",
    entity: "personnage",
  },
  imageHosts: ["s4.anilist.co", "media.kitsu.app", "v1.animethemes.moe"],
  gameModes: [
    "bracket",
    "tierlist",
    "blindtest",
    "smash-pass",
    "stream-clash",
    "battle-feat",
  ],
  relationGraph: "anilist",
  guestEmailDomain: "guest.animeklash.app",
  i18nOverrides: {
    fr: {
      nav: {
        battleFeat: "BattleClash",
        createBracketDesc: "Tournoi éliminatoire animé par animé",
        createTierlistDesc: "Classe tes animés et personnages",
        createBlindtestDesc: "Devine les openings à l'aveugle",
        createStreamClashDesc: "Devine l'animé le plus populaire",
        createSmashPassDesc: "Smash ou Pass sur animés et personnages",
        createBattleFeatDesc: "Enchaîne les co-apparitions",
      },
      sidebar: {
        tagline: "L'arène des animés",
        previewVolume: "Volume des openings",
      },
      homeHero: {
        newBadge: "Nouveau : BattleClash multijoueur",
        title2: "tes",
        highlight: "animés",
        subtitle:
          "AnimeKlash est l'arène ultime pour les fans d'anime. Crée des tournois, défie tes amis et explore des milliers de créations uniques.",
        coversTopCountry: "Top animés du moment · {country}",
        coversTopFallback: "Top animés du moment",
      },
      home: {
        badge: "Gratuit · Aucune pub · Juste l'anime",
        hero2: "tes animés.",
        heroSubtitle:
          "Crée des tournois entre tes animés et personnages préférés, vote et découvre les vrais gagnants.",
        feature1Text:
          "Élimine entrée par entrée jusqu'au grand vainqueur. Écoute l'opening si dispo, vote, avance.",
        feature2Text:
          "Classe titres d'animé, persos et openings du S au F, ou devine les OP/ED à l'aveugle.",
        feature3Title: "Partage & BattleClash",
        feature3Text:
          "Publie tes classements, défie la communauté, et enchaîne les co-apparitions dans BattleClash.",
        battleFeatDesc:
          "Le jeu des personnages qui se sont croisés. Prouve que tu connais les univers anime — seul contre l'IA ou en duel multijoueur.",
        step1Text: "Un univers, une époque, un genre… donne un fil directeur à ton bracket.",
        step2Text: "Cherche des animés ou personnages — de 4 à 32 entrées.",
        step3Text: "Vote pour chaque duel. Partage le lien ou publie-le pour la communauté.",
      },
      explore: {
        createBattleFeatChallenge: "Créer un défi BattleClash",
        battleFeatTitle: "BattleClash",
        battleFeatDesc:
          "Le jeu des co-apparitions ! Enchaîne les personnages qui sont apparus ensemble.",
        tabBattlefeat: "BattleClash",
        sectionBattleFeatSolo: "BattleClash publics — Modes solo",
        sectionBattleFeatChallenges: "BattleClash — Défis publics",
        sectionBattleFeatRooms: "BattleClash — Rooms rejoignables",
      },
      tierlistPage: {
        helper: "Glisse les animés dans les tiers · clique sur une image pour écouter l'opening",
      },
      tierlistBoard: {
        allPlaced: "Tous les animés ont été placés 🎉",
        tracksRanked: "{placed} / {total} animés classés",
      },
      footer: {
        catalog: "Catalogue anime via",
        description: "Fais s'affronter tes animés, partage tes classements, défie tes amis.",
      },
    },
    en: {
      nav: {
        battleFeat: "BattleClash",
        createBracketDesc: "Elimination tournament anime by anime",
        createTierlistDesc: "Rank anime and characters",
        createBlindtestDesc: "Guess openings blind",
        createStreamClashDesc: "Guess which anime is more popular",
        createSmashPassDesc: "Smash or Pass on anime and characters",
        createBattleFeatDesc: "Chain character co-appearances",
      },
      sidebar: {
        tagline: "Arena of anime",
        previewVolume: "Opening volume",
      },
      homeHero: {
        newBadge: "New: multiplayer BattleClash",
        highlight: "anime",
        subtitle:
          "AnimeKlash is the ultimate arena for anime fans. Build tournaments, challenge your friends and explore thousands of unique creations.",
        coversTopCountry: "Top anime right now · {country}",
        coversTopFallback: "Top anime right now",
      },
      home: {
        badge: "Free · No ads · Just anime",
        hero1: "Make your anime",
        heroSubtitle:
          "Build tournaments with your favourite series and characters, vote and find out which anime truly stands out.",
        feature1Text:
          "Eliminate anime by anime until one winner remains. Listen to 30s clips and vote.",
        feature2Text:
          "Rank anime titles and characters from S to F, or guess openings/endings blind.",
        feature3Title: "Share & BattleClash",
        feature3Text:
          "Publish your rankings, challenge the community, and chain co-appearances in BattleClash.",
        battleFeatDesc:
          "The character co-appearance chain game. Prove you know anime universes — solo vs AI or in a multiplayer duel.",
        step2Text: "Search AniList and pick 4 to 32 anime or characters.",
      },
      explore: {
        createBattleFeatChallenge: "Create a BattleClash challenge",
        battleFeatTitle: "BattleClash",
        battleFeatDesc:
          "The co-appearance chain game! Link characters who appeared in the same anime.",
        tabBattlefeat: "BattleClash",
        sectionBattleFeatSolo: "Public BattleClash — Solo modes",
        sectionBattleFeatChallenges: "BattleClash — Public challenges",
        sectionBattleFeatRooms: "BattleClash — Joinable rooms",
      },
      tierlistPage: {
        helper: "Drag entries into tiers · click a cover to play the opening preview",
      },
      tierlistBoard: {
        allPlaced: "All entries have been placed 🎉",
        tracksRanked: "{placed} / {total} entries ranked",
      },
      footer: {
        catalog: "Anime catalog via",
      },
    },
  },
});
