import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const SCRYFALL_BASE = "https://api.scryfall.com";

// ─── Raw Scryfall types (subset) ─────────────────────────────────────────────

export type ScryfallImageUris = {
  small?: string;
  normal?: string;
  art_crop?: string;
};

export type ScryfallCardFace = {
  name?: string;
  type_line?: string;
  mana_cost?: string;
  image_uris?: ScryfallImageUris;
};

export type ScryfallCard = {
  id: string;
  name: string;
  printed_name?: string;  // Localized name (e.g. "Éclair" for "Lightning Bolt" in French)
  lang?: string;
  set?: string;
  set_name?: string;
  printed_set_name?: string;
  type_line?: string;
  printed_type_line?: string;
  mana_cost?: string;
  rarity?: string;
  collector_number?: string;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
};

export type ScryfallSet = {
  id: string;
  code: string;
  name: string;
  set_type?: string;
  card_count?: number;
  released_at?: string;
  icon_svg_uri?: string;
};

export type ScryfallDeck = {
  id: string;
  name: string;
  format?: string;
  description?: string;
  mainboard?: ScryfallCard[];
  sideboard?: ScryfallCard[];
};

type ScryfallList<T> = {
  object?: string;
  data?: T[];
  has_more?: boolean;
  next_page?: string;
};

type ScryfallSetsResponse = { data?: ScryfallSet[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cardImageUrl(card: ScryfallCard): string | undefined {
  return (
    card.image_uris?.normal ??
    card.image_uris?.small ??
    card.card_faces?.[0]?.image_uris?.normal ??
    card.card_faces?.[0]?.image_uris?.small
  );
}

function cardSubtitle(card: ScryfallCard): string | undefined {
  const parts = [card.set_name, card.type_line?.split("—")[0]?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : card.mana_cost || undefined;
}

function cardToItem(card: ScryfallCard): ContentItem {
  return {
    id: card.id,
    title: card.printed_name ?? card.name,
    subtitle: cardSubtitle(card),
    coverUrl: cardImageUrl(card),
    source: "scryfall",
    metadata: {
      itemKind: "card",
      setCode: card.set,
      setName: card.set_name,
      typeLine: card.type_line,
      manaCost: card.mana_cost,
      rarity: card.rarity,
      collectorNumber: card.collector_number,
    },
  };
}

function setToCollection(set: ScryfallSet): ContentCollection {
  const year = set.released_at?.slice(0, 4);
  return {
    id: set.code,
    title: set.name,
    coverUrl: set.icon_svg_uri,
    source: "scryfall",
    metadata: {
      itemKind: "set",
      setType: set.set_type,
      cardCount: set.card_count,
      releasedAt: set.released_at,
      subtitle: year ? `${year} · ${set.card_count ?? "?"} cartes` : undefined,
    },
  };
}

function deckToEntity(deck: ScryfallDeck): ContentEntity {
  return {
    id: deck.id,
    name: deck.name,
    fanCount: deck.mainboard?.length,
    source: "scryfall",
    metadata: {
      format: deck.format,
      description: deck.description,
      cardCount: deck.mainboard?.length,
    },
  };
}

async function scryfallFetch<T>(
  path: string,
  params: Record<string, string> = {},
  options?: { live?: boolean },
): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${SCRYFALL_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "CardKlash/1.0 (https://cardklash.app)",
    },
    ...(options?.live ? { cache: "no-store" as const } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(options?.live ? {} : ({ next: { revalidate: 3600 } } as any)),
  });

  if (res.status === 404) {
    throw new Error(`Scryfall ${path} → 404`);
  }
  if (!res.ok) {
    throw new Error(`Scryfall ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function scryfallFetchAllPages<T>(firstPath: string, params: Record<string, string> = {}): Promise<T[]> {
  let url: string | null = null;
  const firstUrl = new URL(`${SCRYFALL_BASE}${firstPath}`);
  for (const [k, v] of Object.entries(params)) {
    firstUrl.searchParams.set(k, v);
  }
  url = firstUrl.toString();

  const items: T[] = [];
  while (url) {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CardKlash/1.0 (https://cardklash.app)",
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 86400 } as any,
    });
    if (!res.ok) break;
    const json = (await res.json()) as ScryfallList<T>;
    items.push(...(json.data ?? []));
    url = json.has_more ? (json.next_page ?? null) : null;
  }
  return items;
}

// ─── Raw API (for routes / home trending) ─────────────────────────────────────

export async function searchCards(query: string, limit = 20): Promise<ScryfallCard[]> {
  if (!query.trim()) return [];
  // Try French first, fall back to English if no results
  for (const q of [`${query.trim()} lang:fr`, query.trim()]) {
    try {
      const json = await scryfallFetch<ScryfallList<ScryfallCard>>("/cards/search", { q });
      const results = (json.data ?? []).slice(0, limit);
      if (results.length > 0) return results;
    } catch {
      // continue to next query
    }
  }
  return [];
}

export async function searchSets(query: string, limit = 20): Promise<ScryfallSet[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = await scryfallFetchAllPages<ScryfallSet>("/sets");
  return all
    .filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.set_type?.toLowerCase().includes(q),
    )
    .slice(0, limit);
}

export async function searchDecks(query: string, limit = 20): Promise<ScryfallDeck[]> {
  if (!query.trim()) return [];
  try {
    const json = await scryfallFetch<ScryfallList<ScryfallDeck>>("/decks/search", {
      q: query.trim(),
    });
    return (json.data ?? []).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getSetByCode(code: string): Promise<ScryfallSet | null> {
  try {
    return await scryfallFetch<ScryfallSet>(`/sets/${encodeURIComponent(code)}`);
  } catch {
    return null;
  }
}

export async function getSetCards(setCode: string, limit = 50): Promise<ScryfallCard[]> {
  for (const q of [
    `e:${setCode} lang:fr game:paper`,
    `e:${setCode} game:paper`,
  ]) {
    try {
      const json = await scryfallFetch<ScryfallList<ScryfallCard>>("/cards/search", {
        q,
        unique: "prints",
      });
      const results = (json.data ?? []).slice(0, limit);
      if (results.length > 0) return results;
    } catch {
      // continue to next query
    }
  }
  return [];
}

export async function getDeckById(deckId: string): Promise<ScryfallDeck | null> {
  try {
    return await scryfallFetch<ScryfallDeck>(`/decks/${encodeURIComponent(deckId)}`);
  } catch {
    return null;
  }
}

export async function getTrendingCards(limit = 18): Promise<ScryfallCard[]> {
  try {
    const json = await scryfallFetch<ScryfallList<ScryfallCard>>("/cards/search", {
      q: "order:edhrec",
      unique: "cards",
    });
    return (json.data ?? []).slice(0, limit);
  } catch {
    return [];
  }
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const scryfallContentSource: ContentSource = {
  source: "scryfall",

  async searchItems(query, { limit = 20 } = {}) {
    const cards = await searchCards(query, limit);
    return cards.map(cardToItem);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "card") return this.searchItems(query, { limit });
    if (kind === "set") {
      const sets = await searchSets(query, limit);
      return sets.map((s) => ({
        id: s.code,
        title: s.name,
        subtitle: s.released_at?.slice(0, 4),
        coverUrl: s.icon_svg_uri,
        source: "scryfall",
        metadata: { itemKind: "set", cardCount: s.card_count, setType: s.set_type },
      }));
    }
    if (kind === "deck") {
      const decks = await searchDecks(query, limit);
      return decks.map((d) => ({
        id: d.id,
        title: d.name,
        subtitle: d.format,
        source: "scryfall",
        metadata: { itemKind: "deck", format: d.format, cardCount: d.mainboard?.length },
      }));
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const sets = await searchSets(query, limit);
    return sets.map(setToCollection);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const decks = await searchDecks(query, limit);
    return decks.map(deckToEntity);
  },

  async getCollectionItems(collectionId) {
    const code = collectionId.replace(/^set-/, "");
    const cards = await getSetCards(code, 50);
    return cards.map(cardToItem);
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    const deck = await getDeckById(entityId);
    if (!deck?.mainboard?.length) return [];
    const seen = new Set<string>();
    const items: ContentItem[] = [];
    for (const card of deck.mainboard) {
      if (seen.has(card.id)) continue;
      seen.add(card.id);
      items.push(cardToItem(card));
      if (items.length >= limit) break;
    }
    return items;
  },

  async getEntityById(entityId) {
    const deck = await getDeckById(entityId);
    return deck ? deckToEntity(deck) : null;
  },

  async getEntityCollections(entityId, { limit = 20 } = {}) {
    void entityId;
    void limit;
    return [];
  },
};
