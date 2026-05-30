import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";
import pokemonFrNames from "./data/pokemon-fr-names.json";

const POKEAPI_BASE = "https://pokeapi.co/api/v2";

const POPULAR_POKEMON_IDS = [
  25, 6, 150, 151, 445, 448, 94, 143, 130, 149, 384, 493, 700, 778, 887, 892, 1, 4, 7,
];

const GENERATION_LABELS: Record<number, string> = {
  1: "Génération I — Kanto",
  2: "Génération II — Johto",
  3: "Génération III — Hoenn",
  4: "Génération IV — Sinnoh",
  5: "Génération V — Unova",
  6: "Génération VI — Kalos",
  7: "Génération VII — Alola",
  8: "Génération VIII — Galar",
  9: "Génération IX — Paldea",
};

const TYPE_LABELS_FR: Record<string, string> = {
  normal: "Normal",
  fire: "Feu",
  water: "Eau",
  electric: "Électrik",
  grass: "Plante",
  ice: "Glace",
  fighting: "Combat",
  poison: "Poison",
  ground: "Sol",
  flying: "Vol",
  psychic: "Psy",
  bug: "Insecte",
  rock: "Roche",
  ghost: "Spectre",
  dragon: "Dragon",
  dark: "Ténèbres",
  steel: "Acier",
  fairy: "Fée",
};

// ─── Raw PokéAPI types (subset) ───────────────────────────────────────────────

type PokeListEntry = { name: string; url: string };

type PokeList = { count: number; results: PokeListEntry[] };

type PokePokemon = {
  id: number;
  name: string;
  species?: { name: string; url: string };
  types?: { type: { name: string } }[];
  sprites?: {
    other?: { "official-artwork"?: { front_default?: string | null } };
    front_default?: string | null;
  };
};

type PokeType = {
  id: number;
  name: string;
  pokemon: { pokemon: { name: string; url: string } }[];
};

type PokeGeneration = {
  id: number;
  name: string;
  pokemon_species: { name: string; url: string }[];
};

type PokeEvolutionChain = {
  id: number;
  chain: PokeEvolutionLink;
};

type PokeEvolutionLink = {
  species: { name: string; url: string };
  evolves_to: PokeEvolutionLink[];
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

let cachedPokemonNames: PokeListEntry[] | null = null;

const frenchNameIndex = new Map<string, string>(
  Object.entries(pokemonFrNames as Record<string, string>),
);

function formatPokemonName(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function speciesSlugFromPokemon(p: PokePokemon): string {
  return p.species?.name ?? p.name.split("-")[0] ?? p.name;
}

function getFrenchNameIndex(): Map<string, string> {
  return frenchNameIndex;
}

function resolveFrenchPokemonName(p: PokePokemon): string {
  const index = getFrenchNameIndex();
  const speciesSlug = speciesSlugFromPokemon(p);
  const cached = index.get(speciesSlug) ?? index.get(String(p.id));
  if (cached) return cached;
  return formatPokemonName(p.name);
}

/** Nom d'affichage français (espèce) pour un Pokémon PokéAPI. */
export function getPokemonDisplayName(p: PokePokemon): string {
  return resolveFrenchPokemonName(p);
}

function matchesFrenchQuery(frName: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const normalized = frName.toLowerCase();
  const qCompact = q.replace(/\s+/g, "");
  const frCompact = normalized.replace(/\s+/g, "");
  return normalized.includes(q) || frCompact.includes(qCompact);
}

function speciesSlugFromListName(pokemonSlug: string): string {
  return pokemonSlug.split("-")[0] ?? pokemonSlug;
}

function formatTypeName(name: string): string {
  return TYPE_LABELS_FR[name] ?? formatPokemonName(name);
}

function pokemonIdFromUrl(url: string): number | null {
  const match = /\/pokemon\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : null;
}

function speciesIdFromUrl(url: string): number | null {
  const match = /\/pokemon-species\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : null;
}

function generationIdFromUrl(url: string): number | null {
  const match = /\/generation\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : null;
}

function artworkUrl(id: number, sprites?: PokePokemon["sprites"]): string | undefined {
  return (
    sprites?.other?.["official-artwork"]?.front_default ??
    sprites?.front_default ??
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
  );
}

async function pokeGet<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${POKEAPI_BASE}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 86400 } as any,
  });
  if (!res.ok) {
    throw new Error(`PokéAPI ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function getAllPokemonNames(): Promise<PokeListEntry[]> {
  if (cachedPokemonNames) return cachedPokemonNames;
  const json = await pokeGet<PokeList>("/pokemon?limit=1025&offset=0");
  cachedPokemonNames = json.results ?? [];
  return cachedPokemonNames;
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, "-");
}

function matchesQuery(name: string, query: string): boolean {
  const q = normalizeQuery(query);
  if (!q) return false;
  return name.includes(q) || formatPokemonName(name).toLowerCase().includes(q.replace(/-/g, " "));
}

// ─── Raw API (for routes / home trending) ─────────────────────────────────────

export async function searchPokemon(query: string, limit = 20): Promise<PokePokemon[]> {
  const q = normalizeQuery(query);
  if (!q) return [];

  const names = await getAllPokemonNames();
  const frIndex = getFrenchNameIndex();
  const matches = names
    .filter((entry) => {
      if (matchesQuery(entry.name, q)) return true;
      const speciesSlug = speciesSlugFromListName(entry.name);
      const fr = frIndex.get(entry.name) ?? frIndex.get(speciesSlug);
      return fr ? matchesFrenchQuery(fr, q) : false;
    })
    .slice(0, limit);

  const results = await Promise.all(
    matches.map(async (entry) => {
      try {
        return await pokeGet<PokePokemon>(`/pokemon/${entry.name}`);
      } catch {
        return null;
      }
    }),
  );
  return results.filter((p): p is PokePokemon => p !== null);
}

export async function searchTypes(query: string, limit = 20): Promise<PokeType[]> {
  const q = normalizeQuery(query);
  const json = await pokeGet<PokeList>("/type?limit=100&offset=0");
  const types = (json.results ?? []).filter((entry) => {
    if (!q) return true;
    return (
      entry.name.includes(q) ||
      formatTypeName(entry.name).toLowerCase().includes(q.replace(/-/g, " "))
    );
  });
  const results = await Promise.all(
    types.slice(0, limit).map(async (entry) => pokeGet<PokeType>(`/type/${entry.name}`)),
  );
  return results;
}

export async function searchGenerations(query: string, limit = 20): Promise<PokeGeneration[]> {
  const q = normalizeQuery(query);
  const json = await pokeGet<PokeList>("/generation?limit=20&offset=0");
  const generations = (json.results ?? []).filter((entry) => {
    if (!q) return true;
    const id = generationIdFromUrl(entry.url) ?? 0;
    const label = GENERATION_LABELS[id] ?? entry.name;
    return entry.name.includes(q) || label.toLowerCase().includes(q.replace(/-/g, " "));
  });
  const results = await Promise.all(
    generations.slice(0, limit).map(async (entry) =>
      pokeGet<PokeGeneration>(`/generation/${entry.name}`),
    ),
  );
  return results;
}

export async function getPokemonById(id: string | number): Promise<PokePokemon | null> {
  try {
    return await pokeGet<PokePokemon>(`/pokemon/${id}`);
  } catch {
    return null;
  }
}

export async function getTypeById(typeId: string | number): Promise<PokeType | null> {
  try {
    return await pokeGet<PokeType>(`/type/${typeId}`);
  } catch {
    return null;
  }
}

export async function getGenerationById(generationId: string | number): Promise<PokeGeneration | null> {
  try {
    return await pokeGet<PokeGeneration>(`/generation/${generationId}`);
  } catch {
    return null;
  }
}

export async function getTypePokemon(typeId: string | number, limit = 200): Promise<PokePokemon[]> {
  const type = await getTypeById(typeId);
  if (!type) return [];
  // Filter to only main-series pokemon (no forms like "-alola", "-galar" duplicates)
  const mainEntries = type.pokemon
    .filter((e) => {
      const name = e.pokemon.name;
      // Keep base forms + common forms, skip most alternate forms to avoid clutter
      return !/-totem$|-mega-?[xy]?$|-gmax$|-eternamax$|-low-key|-amped/.test(name);
    })
    .slice(0, limit);

  // Fetch in batches of 20 to avoid rate-limiting
  const results: PokePokemon[] = [];
  const BATCH = 20;
  for (let i = 0; i < mainEntries.length; i += BATCH) {
    const batch = mainEntries.slice(i, i + BATCH);
    const fetched = await Promise.all(
      batch.map(async (entry) => {
        const id = pokemonIdFromUrl(entry.pokemon.url);
        if (id) return getPokemonById(id);
        try {
          return await pokeGet<PokePokemon>(`/pokemon/${entry.pokemon.name}`);
        } catch {
          return null;
        }
      }),
    );
    results.push(...fetched.filter((p): p is PokePokemon => p !== null));
  }
  return results;
}

export async function getGenerationPokemon(
  generationId: string | number,
  limit = 200,
): Promise<PokePokemon[]> {
  const generation = await getGenerationById(generationId);
  if (!generation) return [];
  const species = generation.pokemon_species.slice(0, limit);
  // Fetch in batches of 20
  const results: PokePokemon[] = [];
  const BATCH = 20;
  for (let i = 0; i < species.length; i += BATCH) {
    const batch = species.slice(i, i + BATCH);
    const fetched = await Promise.all(
      batch.map(async (entry) => {
        try {
          return await pokeGet<PokePokemon>(`/pokemon/${entry.name}`);
        } catch {
          return null;
        }
      }),
    );
    results.push(...fetched.filter((p): p is PokePokemon => p !== null));
  }
  return results;
}

function flattenEvolutionChain(link: PokeEvolutionLink): string[] {
  const names = [link.species.name];
  for (const next of link.evolves_to) {
    names.push(...flattenEvolutionChain(next));
  }
  return names;
}

export async function getEvolutionChainPokemon(
  chainId: string | number,
  limit = 50,
): Promise<PokePokemon[]> {
  const chain = await pokeGet<PokeEvolutionChain>(`/evolution-chain/${chainId}`);
  const names = flattenEvolutionChain(chain.chain).slice(0, limit);
  const results = await Promise.all(
    names.map(async (name) => {
      try {
        return await pokeGet<PokePokemon>(`/pokemon/${name}`);
      } catch {
        return null;
      }
    }),
  );
  return results.filter((p): p is PokePokemon => p !== null);
}

export async function getTrendingPokemon(limit = 18): Promise<PokePokemon[]> {
  const ids = POPULAR_POKEMON_IDS.slice(0, limit);
  const results = await Promise.all(ids.map((id) => getPokemonById(id)));
  return results.filter((p): p is PokePokemon => p !== null);
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function pokemonToItem(p: PokePokemon): ContentItem {
  const types = p.types?.map((t) => formatTypeName(t.type.name)).join(" · ");
  const title = resolveFrenchPokemonName(p);
  return {
    id: String(p.id),
    title,
    subtitle: types ? `#${String(p.id).padStart(3, "0")} · ${types}` : `#${String(p.id).padStart(3, "0")}`,
    coverUrl: artworkUrl(p.id, p.sprites),
    source: "pokeapi",
    metadata: {
      itemKind: "pokemon",
      slug: p.name,
      types: p.types?.map((t) => t.type.name),
    },
  };
}

function generationToCollection(g: PokeGeneration): ContentCollection {
  const label = GENERATION_LABELS[g.id] ?? formatPokemonName(g.name);
  const firstSpecies = g.pokemon_species[0];
  const speciesId = firstSpecies ? speciesIdFromUrl(firstSpecies.url) : null;
  return {
    id: `gen-${g.id}`,
    title: label,
    coverUrl: speciesId
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${speciesId}.png`
      : undefined,
    source: "pokeapi",
    metadata: {
      collectionKind: "generation",
      generationId: g.id,
      speciesCount: g.pokemon_species.length,
    },
  };
}

function typeToEntity(t: PokeType): ContentEntity {
  return {
    id: `type-${t.id}`,
    name: formatTypeName(t.name),
    fanCount: t.pokemon.length,
    source: "pokeapi",
    metadata: { entityKind: "type", typeId: t.id, slug: t.name },
  };
}

function typeToCollection(t: PokeType): ContentCollection {
  return {
    id: `type-${t.id}`,
    title: `Type ${formatTypeName(t.name)}`,
    source: "pokeapi",
    metadata: { collectionKind: "type", typeId: t.id, slug: t.name },
  };
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const pokeapiContentSource: ContentSource = {
  source: "pokeapi",

  async searchItems(query, { limit = 20 } = {}) {
    const pokemon = await searchPokemon(query, limit);
    return pokemon.map(pokemonToItem);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "pokemon") {
      return this.searchItems(query, { limit });
    }
    if (kind === "evolution") {
      const q = normalizeQuery(query);
      if (!q) return [];
      const names = await getAllPokemonNames();
      const match = names.find((entry) => entry.name === q);
      if (!match) return [];
      try {
        const species = await pokeGet<{ evolution_chain?: { url?: string } }>(
          `/pokemon-species/${match.name}`,
        );
        const chainUrl = species.evolution_chain?.url;
        if (!chainUrl) return [];
        const chainId = /\/evolution-chain\/(\d+)\/?$/.exec(chainUrl)?.[1];
        if (!chainId) return [];
        const pokemon = await getEvolutionChainPokemon(chainId, limit);
        return pokemon.map(pokemonToItem);
      } catch {
        return [];
      }
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const [generations, types] = await Promise.all([
      searchGenerations(query, limit),
      searchTypes(query, Math.ceil(limit / 2)),
    ]);
    return [
      ...generations.map(generationToCollection),
      ...types.map(typeToCollection),
    ].slice(0, limit);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const types = await searchTypes(query, limit);
    return types.map(typeToEntity);
  },

  async getCollectionItems(collectionId) {
    if (collectionId.startsWith("gen-")) {
      const generationId = collectionId.replace(/^gen-/, "");
      const pokemon = await getGenerationPokemon(generationId);
      return pokemon.map(pokemonToItem);
    }
    if (collectionId.startsWith("type-")) {
      const typeId = collectionId.replace(/^type-/, "");
      const pokemon = await getTypePokemon(typeId);
      return pokemon.map(pokemonToItem);
    }
    if (collectionId.startsWith("evo-")) {
      const chainId = collectionId.replace(/^evo-/, "");
      const pokemon = await getEvolutionChainPokemon(chainId);
      return pokemon.map(pokemonToItem);
    }
    return [];
  },

  async getEntityTopItems(entityId, { limit = 200 } = {}) {
    if (entityId.startsWith("type-")) {
      const typeId = entityId.replace(/^type-/, "");
      const pokemon = await getTypePokemon(typeId, limit);
      return pokemon.map(pokemonToItem);
    }
    return [];
  },

  async getEntityById(entityId) {
    if (entityId.startsWith("type-")) {
      const typeId = entityId.replace(/^type-/, "");
      const type = await getTypeById(typeId);
      return type ? typeToEntity(type) : null;
    }
    return null;
  },

  async getEntityCollections(_entityId, _options) {
    return [];
  },
};
