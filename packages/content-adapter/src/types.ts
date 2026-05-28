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
};

/**
 * The interface each app implements to feed game modes with content.
 */
export interface ContentSource {
  readonly source: string;

  /** Full-text search returning items (tracks, openings, characters…). */
  searchItems(query: string, options?: { limit?: number; requirePreview?: boolean }): Promise<ContentItem[]>;

  /** Search for collections (albums, anime series, arcs…). */
  searchCollections(query: string, options?: { limit?: number }): Promise<ContentCollection[]>;

  /** Search for entities (artists, anime studios, character publishers…). */
  searchEntities(query: string, options?: { limit?: number }): Promise<ContentEntity[]>;

  /** Get all items belonging to a collection. */
  getCollectionItems(collectionId: string, options?: { requirePreview?: boolean }): Promise<ContentItem[]>;

  /** Get top items for an entity (top tracks for artist, top OPs for anime). */
  getEntityTopItems(entityId: string, options?: { limit?: number; requirePreview?: boolean }): Promise<ContentItem[]>;

  /** Fetch a single entity by ID. */
  getEntityById(entityId: string): Promise<ContentEntity | null>;
}
