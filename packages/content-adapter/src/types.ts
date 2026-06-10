/**
 * Generic content item used across all game modes.
 * Each app provides a ContentSource that maps its data to this shape.
 */
export type ContentItem = {
  id: string;
  title: string;
  subtitle?: string;
  coverUrl?: string;
  previewUrl?: string;
  source: string;
  metadata?: Record<string, unknown>;
};

/**
 * A collection groups items (album, anime series, arc…).
 */
export type ContentCollection = {
  id: string;
  title: string;
  coverUrl?: string;
  source: string;
  metadata?: Record<string, unknown>;
};

/**
 * A named entity (artist, anime, character…) owning collections/items.
 */
export type ContentEntity = {
  id: string;
  name: string;
  pictureUrl?: string;
  fanCount?: number;
  source: string;
  metadata?: Record<string, unknown>;
};

/**
 * The interface each app implements to feed game modes with content.
 */
export interface ContentSource {
  readonly source: string;

  /** Full-text search returning items (tracks, openings, characters…). */
  searchItems(query: string, options?: { limit?: number; requirePreview?: boolean }): Promise<ContentItem[]>;

  /**
   * Search a vertical-native item kind that doesn't fit the generic
   * items/collections/entities split (e.g. AniList "anime" vs "character" vs "arc").
   * The `kind` strings are defined by the adapter and used by that vertical's picker UI.
   * Adapters whose taxonomy is fully covered by the three standard searches may omit this.
   */
  searchItemsByKind?(kind: string, query: string, options?: { limit?: number }): Promise<ContentItem[]>;

  /** Search for collections (albums, anime series, arcs…). */
  searchCollections(query: string, options?: { limit?: number }): Promise<ContentCollection[]>;

  /** Search for entities (artists, anime studios, character publishers…). */
  searchEntities(query: string, options?: { limit?: number }): Promise<ContentEntity[]>;

  /** Get all items belonging to a collection. */
  getCollectionItems(
    collectionId: string,
    options?: { requirePreview?: boolean; themeKind?: "intro" | "outro" },
  ): Promise<ContentItem[]>;

  /** Get top items for an entity (top tracks for artist, top OPs for anime). */
  getEntityTopItems(entityId: string, options?: { limit?: number; requirePreview?: boolean }): Promise<ContentItem[]>;

  /** Fetch a single entity by ID. */
  getEntityById(entityId: string): Promise<ContentEntity | null>;

  /** Get collections owned by an entity (artist→albums, anime→arcs). */
  getEntityCollections(entityId: string, options?: { limit?: number }): Promise<ContentCollection[]>;

  /**
   * Refresh a single item's preview URL when it expires (Deezer signed URLs).
   * Adapters whose previews never expire (AniList) may omit this.
   */
  refreshItemPreview?(itemId: string): Promise<string | null>;
}
