import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";
import {
  theSportsDbContentSource,
  footballSportsDbContentSource,
  tennisTheSportsDbContentSource,
} from "./thesportsdb";
import { balldontlieContentSource } from "./balldontlie";
import { ergastContentSource } from "./ergast";
import { apiSportsMmaContentSource } from "./api-sports-mma";

/**
 * SportKlash — un seul vertical multi-disciplines :
 *   multi-sport (TheSportsDB) + football + basket (NBA) + F1 + MMA + tennis.
 *
 * Les sous-sources ont des id-spaces qui se chevauchent (TheSportsDB émet
 * `team-*`/`player-*`/`league-*` pour foot, tennis ET multi-sport ; basket et
 * F1 émettent tous deux `season-*`). On préfixe donc chaque id par un tag de
 * discipline (`foot__`, `basket__`, …) pour pouvoir router le drill-down
 * (getCollectionItems / getEntityTopItems / getEntityById) sans ambiguïté.
 */

const SEP = "__";

type Tag = "sport" | "foot" | "basket" | "f1" | "mma" | "tennis";

const SOURCES: Record<Tag, ContentSource> = {
  sport: theSportsDbContentSource,
  foot: footballSportsDbContentSource,
  basket: balldontlieContentSource,
  f1: ergastContentSource,
  mma: apiSportsMmaContentSource,
  tennis: tennisTheSportsDbContentSource,
};

function isTag(value: string): value is Tag {
  return value in SOURCES;
}

function tagId(tag: Tag, id: string): string {
  return `${tag}${SEP}${id}`;
}

/** Strip the discipline tag from a namespaced id, defaulting to multi-sport. */
function parseId(nsId: string): { tag: Tag; id: string } {
  const i = nsId.indexOf(SEP);
  if (i === -1) return { tag: "sport", id: nsId };
  const tag = nsId.slice(0, i);
  if (!isTag(tag)) return { tag: "sport", id: nsId };
  return { tag, id: nsId.slice(i + SEP.length) };
}

function nsItem(tag: Tag, it: ContentItem): ContentItem {
  return { ...it, id: tagId(tag, it.id) };
}
function nsCollection(tag: Tag, c: ContentCollection): ContentCollection {
  return { ...c, id: tagId(tag, c.id) };
}
function nsEntity(tag: Tag, e: ContentEntity): ContentEntity {
  return { ...e, id: tagId(tag, e.id) };
}

/** Discipline tabs that search items directly (matchs, courses, combats…). */
const ITEM_KINDS: Record<string, Tag> = {
  foot: "foot",
  basket: "basket",
  f1: "f1",
  mma: "mma",
  tennis: "tennis",
};

export const sportsContentSource: ContentSource = {
  source: "sportklash",

  // Default search = multi-sport matchs (TheSportsDB).
  async searchItems(query, options) {
    const items = await SOURCES.sport.searchItems(query, options);
    return items.map((it) => nsItem("sport", it));
  },

  async searchItemsByKind(kind, query, options) {
    const tag = ITEM_KINDS[kind];
    if (tag) {
      const items = await SOURCES[tag].searchItems(query, options);
      return items.map((it) => nsItem(tag, it));
    }
    return this.searchItems(query, options);
  },

  // Multi-sport leagues / teams & players drill down into matchs.
  async searchCollections(query, options) {
    const cols = await SOURCES.sport.searchCollections(query, options);
    return cols.map((c) => nsCollection("sport", c));
  },

  async searchEntities(query, options) {
    const ents = await SOURCES.sport.searchEntities(query, options);
    return ents.map((e) => nsEntity("sport", e));
  },

  async getCollectionItems(collectionId, options) {
    const { tag, id } = parseId(collectionId);
    const items = await SOURCES[tag].getCollectionItems(id, options);
    return items.map((it) => nsItem(tag, it));
  },

  async getEntityTopItems(entityId, options) {
    const { tag, id } = parseId(entityId);
    const items = await SOURCES[tag].getEntityTopItems(id, options);
    return items.map((it) => nsItem(tag, it));
  },

  async getEntityById(entityId) {
    const { tag, id } = parseId(entityId);
    const entity = await SOURCES[tag].getEntityById(id);
    return entity ? nsEntity(tag, entity) : null;
  },

  async getEntityCollections(entityId, options) {
    const { tag, id } = parseId(entityId);
    const cols = await SOURCES[tag].getEntityCollections(id, options);
    return cols.map((c) => nsCollection(tag, c));
  },
};
