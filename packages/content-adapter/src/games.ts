import type { ContentSource, ContentItem } from "./types";
import { rawgContentSource } from "./rawg";
import { rawgRetroContentSource } from "./rawg-retro";
import { rawgIndieContentSource } from "./rawg-indie";

function collectionToItem(col: {
  id: string;
  title: string;
  coverUrl?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}): ContentItem {
  return {
    id: col.id,
    title: col.title,
    coverUrl: col.coverUrl,
    source: col.source ?? "rawg",
    metadata: col.metadata,
  };
}

function entityToItem(entity: {
  id: string;
  name: string;
  pictureUrl?: string | null;
  source?: string;
  metadata?: Record<string, unknown>;
}): ContentItem {
  return {
    id: entity.id,
    title: entity.name,
    coverUrl: entity.pictureUrl ?? undefined,
    source: entity.source ?? "rawg",
    metadata: entity.metadata,
  };
}

/**
 * GameKlash — jeux modernes (RAWG) + rétro + indés in one vertical.
 * Collection/entity ids are prefixed for routing:
 *   series-*, genre-*  → modern
 *   platform-*        → retro consoles
 *   tag-*             → indie tags
 *   era-*             → retro eras
 *   jam-*             → indie jams
 */
export const gamesContentSource: ContentSource = {
  source: "gameklash",

  searchItems: (query, options) => rawgContentSource.searchItems(query, options),

  async searchItemsByKind(kind, query, options) {
    switch (kind) {
      case "retro":
      case "retro-game":
        return rawgRetroContentSource.searchItems(query, options);
      case "indie":
      case "indie-game":
        return rawgIndieContentSource.searchItems(query, options);
      case "retro-collections": {
        const cols = await rawgRetroContentSource.searchCollections(query, options);
        return cols.map(collectionToItem);
      }
      case "indie-collections": {
        const cols = await rawgIndieContentSource.searchCollections(query, options);
        return cols.map(collectionToItem);
      }
      case "retro-entities": {
        const entities = await rawgRetroContentSource.searchEntities(query, options);
        return entities.map(entityToItem);
      }
      case "indie-entities": {
        const entities = await rawgIndieContentSource.searchEntities(query, options);
        return entities.map(entityToItem);
      }
      case "genre":
        return rawgContentSource.searchItemsByKind?.("genre", query, options) ?? [];
      default:
        return rawgContentSource.searchItems(query, options);
    }
  },

  searchCollections: (query, options) => rawgContentSource.searchCollections(query, options),
  searchEntities: (query, options) => rawgContentSource.searchEntities(query, options),

  async getCollectionItems(collectionId, options) {
    if (collectionId.startsWith("platform-")) {
      return rawgRetroContentSource.getCollectionItems(collectionId, options);
    }
    if (collectionId.startsWith("tag-")) {
      return rawgIndieContentSource.getCollectionItems(collectionId, options);
    }
    return rawgContentSource.getCollectionItems(collectionId, options);
  },

  async getEntityTopItems(entityId, options) {
    if (entityId.startsWith("era-")) {
      return rawgRetroContentSource.getEntityTopItems(entityId, options);
    }
    if (entityId.startsWith("jam-")) {
      return rawgIndieContentSource.getEntityTopItems(entityId, options);
    }
    const indieEntity = await rawgIndieContentSource.getEntityById(entityId);
    if (indieEntity && !entityId.startsWith("genre-")) {
      return rawgIndieContentSource.getEntityTopItems(entityId, options);
    }
    return rawgContentSource.getEntityTopItems(entityId, options);
  },

  async getEntityById(entityId) {
    const retro = await rawgRetroContentSource.getEntityById(entityId);
    if (retro) return retro;
    const indie = await rawgIndieContentSource.getEntityById(entityId);
    if (indie) return indie;
    return rawgContentSource.getEntityById(entityId);
  },

  getEntityCollections: (...args) => rawgContentSource.getEntityCollections(...args),
};
