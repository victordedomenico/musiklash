import type { ContentItem } from "./types";

const POKE_BASE = "https://api.pokemontcg.io/v2";

// ─── Raw types ────────────────────────────────────────────────────────────────

export type PokeTcgCard = {
  id: string;
  name: string;
  supertype?: string;
  types?: string[];
  hp?: string;
  rarity?: string;
  number: string;
  set: { id: string; name: string; series: string };
  images: { small: string; large: string };
};

export type PokeTcgSet = {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  releaseDate: string;
  images: { symbol: string; logo: string };
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function pokeGet<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${POKE_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const apiKey = typeof process !== "undefined" ? process.env.POKEMON_TCG_API_KEY : undefined;
  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      ...(apiKey ? { "X-Api-Key": apiKey } : {}),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 3600 } as any,
  });

  if (!res.ok) throw new Error(`PokemonTCG ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function searchPokemonCards(
  query: string,
  limit = 20,
): Promise<PokeTcgCard[]> {
  if (!query.trim()) return [];
  const json = await pokeGet<{ data?: PokeTcgCard[] }>("/cards", {
    q: `name:${query.trim()}*`,
    pageSize: String(Math.min(limit, 40)),
    page: "1",
    orderBy: "-set.releaseDate",
  });
  return (json.data ?? []).slice(0, limit);
}

export async function getPokemonSets(query?: string, limit = 30): Promise<PokeTcgSet[]> {
  const params: Record<string, string> = {
    pageSize: String(Math.min(limit, 50)),
    page: "1",
    orderBy: "-releaseDate",
  };
  if (query?.trim()) params.q = `name:${query.trim()}*`;
  const json = await pokeGet<{ data?: PokeTcgSet[] }>("/sets", params);
  return (json.data ?? []).slice(0, limit);
}

export async function getPokemonSetCards(
  setId: string,
  limit = 50,
): Promise<PokeTcgCard[]> {
  const json = await pokeGet<{ data?: PokeTcgCard[] }>("/cards", {
    q: `set.id:${setId}`,
    pageSize: String(Math.min(limit, 50)),
    page: "1",
    orderBy: "number",
  });
  return (json.data ?? []).slice(0, limit);
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function pokemonCardToItem(card: PokeTcgCard): ContentItem {
  const subtitle = [
    card.set.name,
    card.types?.join("/"),
    card.rarity,
  ].filter(Boolean).join(" · ");

  return {
    id: `ptcg-${card.id}`,
    title: card.name,
    subtitle: subtitle || undefined,
    coverUrl: card.images.small,
    source: "pokemontcg",
    metadata: {
      itemKind: "card",
      tcg: "pokemon",
      cardId: card.id,
      setId: card.set.id,
      setName: card.set.name,
      series: card.set.series,
      number: card.number,
      supertype: card.supertype,
      rarity: card.rarity,
      largeImage: card.images.large,
    },
  };
}

export function pokemonSetToItem(set: PokeTcgSet): ContentItem {
  return {
    id: `ptcgset-${set.id}`,
    title: set.name,
    subtitle: `${set.series} · ${set.printedTotal} cartes`,
    coverUrl: set.images.logo,
    source: "pokemontcg",
    metadata: {
      itemKind: "set",
      tcg: "pokemon",
      setId: set.id,
      series: set.series,
      printedTotal: set.printedTotal,
      releaseDate: set.releaseDate,
    },
  };
}
