import type { ContentSource, ContentEntity } from "@klash/content-adapter";
import type { DictionaryOverrides } from "@klash/i18n";

/** Game modes a vertical can enable. */
export type GameMode =
  | "bracket"
  | "tierlist"
  | "blindtest"
  | "smash-pass"
  | "stream-clash"
  | "battle-feat";

/**
 * Entity wording, interpolated into shared i18n templates.
 * `item`/`items` cover the singular/plural noun the vertical ranks
 * ("morceau"/"morceaux", "animé"/"animés", "film"/"films").
 */
export type VerticalNouns = {
  item: string;
  items: string;
  collection?: string;
  entity?: string;
};

/** SEO / branding values — replaces the per-app `lib/seo.ts` constants. */
export type VerticalBranding = {
  tagline: string;
  description: string;
  keywords: string[];
  /** Open Graph / metadata category (e.g. "music", "anime"). */
  category: string;
  /** Canonical production URL used as a fallback when no env override exists. */
  siteUrlFallback: string;
  /** Optional default Google site-verification token. */
  googleVerification?: string;
};

/**
 * A pluggable relation graph powering BattleFeat for verticals where it
 * applies (music collaborations, anime character co-appearances…).
 * Verticals without one omit it and disable the "battle-feat" game mode.
 *
 * The method surface is refined in Phase 5 when the two existing
 * implementations (deezer feats, anilist co-appearances) are extracted.
 */
export interface RelationGraph {
  readonly source: string;
  /** Entities linkable from a given entity (collaborators, co-stars…). */
  getRelatedEntities(entityId: string): Promise<ContentEntity[]>;
  /** Whether two entities share a link, and the linking item if so. */
  validateLink(
    fromEntityId: string,
    toEntityId: string,
  ): Promise<{ valid: boolean; viaItemId?: string }>;
  /** Candidate next entities offered to the player. */
  getOptions(fromEntityId: string, options?: { limit?: number }): Promise<ContentEntity[]>;
  /**
   * Optional: validate a link when entity names are available (e.g. Deezer text search).
   * When absent the caller falls back to `validateLink`.
   */
  validateWithNames?(
    fromEntityId: string,
    fromEntityName: string,
    toEntityId: string,
    toEntityName: string,
  ): Promise<{ valid: boolean; viaItemId?: string; previewUrl?: string }>;
}

/** Full description of a Klash vertical. */
export type VerticalConfig = {
  /** URL/workspace slug, e.g. "musiklash". */
  slug: string;
  /** Display name, e.g. "MusiKlash". */
  name: string;
  /** Provider tag written into item rows (`source` column) at create time. */
  source: string;
  /** Adapter feeding all content-driven game modes. */
  contentSource: ContentSource;
  branding: VerticalBranding;
  nouns: VerticalNouns;
  /** Image CDN hosts allowed by next.config `images.remotePatterns`. */
  imageHosts: string[];
  /** Enabled game modes. */
  gameModes: GameMode[];
  /**
   * BattleFeat relation graph provider. Required when `battle-feat` is in gameModes.
   * Resolved at runtime via `@klash/relation-graph` + the app Prisma client.
   */
  relationGraph?: "deezer" | "anilist";
  /** @deprecated Use `relationGraph` — runtime graph from createRelationGraph(prisma). */
  battleFeat?: RelationGraph;
  /**
   * Per-locale wording overrides deep-merged onto the shared base dictionary.
   * Verticals only specify the keys whose phrasing differs from the base.
   */
  i18nOverrides?: DictionaryOverrides;
  /**
   * Domain used for guest user fallback emails (e.g. "guest.musiklash.app").
   * Defaults to "guest.klash.local" if omitted.
   */
  guestEmailDomain?: string;
};
