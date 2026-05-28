import { deezerContentSource } from "@klash/content-adapter";
import { defineVertical } from "../define";

export const musiklash = defineVertical({
  slug: "musiklash",
  name: "MusiKlash",
  source: "deezer",
  contentSource: deezerContentSource,
  branding: {
    tagline: "Fais s'affronter tes sons",
    description:
      "Crée des tournois musicaux, vote en écoutant chaque extrait et partage tes classements. Brackets, tierlists, blindtests, BattleFeat et Stream Clash — gratuit, sans pub.",
    keywords: [
      "tournoi musical",
      "bracket musique",
      "tierlist musique",
      "blindtest musique",
      "quiz musical",
      "classement morceaux",
      "duel musical",
      "battle feat",
      "stream clash",
      "jeu musical en ligne",
      "MusiKlash",
      "music bracket",
      "music tournament",
    ],
    category: "music",
    siteUrlFallback: "https://musiklash.vercel.app",
  },
  nouns: {
    item: "morceau",
    items: "morceaux",
    collection: "album",
    entity: "artiste",
  },
  imageHosts: [
    "e-cdns-images.dzcdn.net",
    "cdns-images.dzcdn.net",
    "api.deezer.com",
  ],
  gameModes: [
    "bracket",
    "tierlist",
    "blindtest",
    "smash-pass",
    "stream-clash",
    "battle-feat",
  ],
  relationGraph: "deezer",
  guestEmailDomain: "guest.musiklash.app",
});
