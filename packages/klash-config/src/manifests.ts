import type { GameMode } from "./types";

/** Serializable per-vertical metadata safe to load from next.config (no ContentSource). */
export type VerticalManifest = {
  slug: string;
  /** Display name used in page titles and UI, e.g. "MusiKlash". */
  name: string;
  /** Singular noun for a content item, e.g. "morceau" or "entrée". */
  itemNoun: string;
  /** Plural noun for content items, e.g. "morceaux" or "entrées". */
  itemsNoun: string;
  /**
   * Override noun used specifically in blindtest cards (clips/excerpts).
   * Defaults to itemNoun/itemsNoun when omitted.
   */
  blindtestItemNoun?: string;
  blindtestItemsNoun?: string;
  /**
   * Label for the "title" guess field in the blindtest game.
   * e.g. "Titre du morceau" (music) or "Opening / ending" (anime).
   */
  blindtestTitleLabel?: string;
  /**
   * Label for the "artist" guess field in the blindtest game.
   * e.g. "Artiste" (music) or "Titre d'animé" (anime).
   */
  blindtestArtistLabel?: string;
  /**
   * Lucide icon name used in blindtest/bracket cards.
   * "music" for music verticals, "headphones" for theme/anime, "film" for movies, etc.
   */
  mediaIcon: "music" | "headphones" | "film" | "gamepad" | "star";
  /**
   * Human-readable labels for SmashPass item types (e.g. { track: "Morceaux", album: "Albums" }).
   * Serialised as JSON in NEXT_PUBLIC_KLASH_SMASH_PASS_TYPES.
   */
  smashPassTypeLabels: Record<string, string>;
  /** Contact e-mail shown in the footer (e.g. "contact@musiklash.app"). */
  contactEmail: string;
  /** API credit displayed in the footer bottom bar. */
  apiCredit: { label: string; url: string };
  imageHosts: string[];
  gameModes: GameMode[];
};

export const VERTICAL_MANIFESTS: Record<string, VerticalManifest> = {
  musiklash: {
    slug: "musiklash",
    name: "MusiKlash",
    itemNoun: "morceau",
    itemsNoun: "morceaux",
    mediaIcon: "music",
    smashPassTypeLabels: { track: "Morceaux", album: "Albums", artist: "Artistes" },
    contactEmail: "contact@musiklash.app",
    apiCredit: { label: "Deezer API", url: "https://developers.deezer.com/api" },
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
  },
  animeklash: {
    slug: "animeklash",
    name: "AnimeKlash",
    itemNoun: "entrée",
    itemsNoun: "entrées",
    blindtestItemNoun: "extrait",
    blindtestItemsNoun: "extraits",
    mediaIcon: "headphones",
    blindtestTitleLabel: "Opening / ending",
    blindtestArtistLabel: "Titre d'animé",
    smashPassTypeLabels: {
      anime: "Titres d'animé",
      character: "Persos d'animé",
      arc: "Arcs d'animé",
      track: "Openings/Endings",
      album: "Titres d'animé",
      artist: "Persos d'animé",
    },
    contactEmail: "contact@animeklash.app",
    apiCredit: { label: "AniList API", url: "https://anilist.gitbook.io/anilist-apiv2-docs/" },
    imageHosts: ["s4.anilist.co", "media.kitsu.app", "v1.animethemes.moe"],
    gameModes: [
      "bracket",
      "tierlist",
      "blindtest",
      "smash-pass",
      "stream-clash",
      "battle-feat",
    ],
  },
  demoklash: {
    slug: "demoklash",
    name: "DemoKlash",
    itemNoun: "item",
    itemsNoun: "items",
    mediaIcon: "star",
    smashPassTypeLabels: { item: "Éléments" },
    contactEmail: "contact@demoklash.app",
    apiCredit: { label: "API", url: "#" },
    imageHosts: ["s4.anilist.co", "e-cdns-images.dzcdn.net"],
    gameModes: ["bracket", "tierlist", "blindtest"],
  },
};

export function getVerticalManifest(slug: string): VerticalManifest {
  const manifest = VERTICAL_MANIFESTS[slug];
  if (!manifest) {
    throw new Error(
      `Unknown vertical "${slug}". Known: ${Object.keys(VERTICAL_MANIFESTS).join(", ")}.`,
    );
  }
  return manifest;
}
