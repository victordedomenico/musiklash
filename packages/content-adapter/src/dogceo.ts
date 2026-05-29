import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const DOG_CEO_BASE = "https://dog.ceo/api";
const CAT_API_BASE = "https://api.thecatapi.com/v1";

// ─── Types ────────────────────────────────────────────────────────────────────

type DogBreedsList = {
  message: Record<string, string[]>;
  status: string;
};

type DogImagesResponse = {
  message: string | string[];
  status: string;
};

type CatBreed = {
  id: string;
  name: string;
  temperament?: string;
  origin?: string;
  description?: string;
  reference_image_id?: string;
};

type CatImage = {
  id: string;
  url: string;
  breeds?: CatBreed[];
};

export type PetBreedRef = {
  id: string;
  species: "dog" | "cat";
  title: string;
  subtitle?: string;
  breedPath?: string;
  catBreedId?: string;
};

// ─── Popular breeds (home marquee) ────────────────────────────────────────────

const POPULAR_DOG_PATHS = [
  "retriever/golden",
  "bulldog/french",
  "husky",
  "poodle/standard",
  "beagle",
  "corgi",
  "shiba",
  "dachshund",
  "labrador",
  "germanshepherd",
  "pug",
  "samoyed",
];

const POPULAR_CAT_IDS = [
  "abys",
  "beng",
  "siam",
  "ragd",
  "mcoo",
  "pers",
  "sphy",
  "norw",
  "sava",
  "munc",
  "bomb",
  "asho",
];

// ─── Cache ────────────────────────────────────────────────────────────────────

let cachedDogBreeds: DogBreedsList["message"] | null = null;
let cachedCatBreeds: CatBreed[] | null = null;
const dogImageCache = new Map<string, string>();
const catImageCache = new Map<string, string>();

function catApiHeaders(): HeadersInit {
  const key = process.env.THECAT_API_KEY ?? process.env.PETFINDER_API_KEY;
  return key ? { "x-api-key": key } : {};
}

async function dogGet<T>(path: string): Promise<T> {
  const res = await fetch(`${DOG_CEO_BASE}${path}`, {
    headers: { Accept: "application/json" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 86400 } as any,
  });
  if (!res.ok) throw new Error(`Dog CEO ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function catGet<T>(path: string): Promise<T> {
  const res = await fetch(`${CAT_API_BASE}${path}`, {
    headers: { Accept: "application/json", ...catApiHeaders() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: { revalidate: 86400 } as any,
  });
  if (!res.ok) throw new Error(`TheCatAPI ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

function formatName(slug: string): string {
  return slug
    .split(/[-_/]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function matchesText(text: string, query: string): boolean {
  const q = normalizeQuery(query);
  if (!q) return true;
  return text.toLowerCase().includes(q);
}

async function getDogBreedsMap(): Promise<DogBreedsList["message"]> {
  if (cachedDogBreeds) return cachedDogBreeds;
  const json = await dogGet<DogBreedsList>("/breeds/list/all");
  cachedDogBreeds = json.message ?? {};
  return cachedDogBreeds;
}

async function getCatBreedsList(): Promise<CatBreed[]> {
  if (cachedCatBreeds) return cachedCatBreeds;
  cachedCatBreeds = await catGet<CatBreed[]>("/breeds");
  return cachedCatBreeds;
}

function dogItemId(breed: string, subBreed?: string): string {
  return subBreed ? `dog:${breed}:${subBreed}` : `dog:${breed}`;
}

function dogBreedPath(breed: string, subBreed?: string): string {
  return subBreed ? `${breed}/${subBreed}` : breed;
}

function parseDogItemId(id: string): { breed: string; subBreed?: string } | null {
  if (!id.startsWith("dog:")) return null;
  const parts = id.slice(4).split(":");
  if (parts.length === 1) return { breed: parts[0] };
  if (parts.length === 2) return { breed: parts[0], subBreed: parts[1] };
  return null;
}

function parseCatItemId(id: string): string | null {
  return id.startsWith("cat:") ? id.slice(4) : null;
}

async function getDogImage(breed: string, subBreed?: string): Promise<string | undefined> {
  const path = dogBreedPath(breed, subBreed);
  const cached = dogImageCache.get(path);
  if (cached) return cached;
  try {
    const apiPath = subBreed
      ? `/breed/${breed}/${subBreed}/images/random`
      : `/breed/${breed}/images/random`;
    const json = await dogGet<DogImagesResponse>(apiPath);
    const url = Array.isArray(json.message) ? json.message[0] : json.message;
    if (typeof url === "string") {
      dogImageCache.set(path, url);
      return url;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

async function getCatImage(breedId: string): Promise<string | undefined> {
  const cached = catImageCache.get(breedId);
  if (cached) return cached;
  try {
    const images = await catGet<CatImage[]>(
      `/images/search?breed_ids=${encodeURIComponent(breedId)}&limit=1`,
    );
    const url = images[0]?.url;
    if (url) {
      catImageCache.set(breedId, url);
      return url;
    }
  } catch {
    /* ignore */
  }
  const breeds = await getCatBreedsList();
  const breed = breeds.find((b) => b.id === breedId);
  if (breed?.reference_image_id) {
    const url = `https://cdn2.thecatapi.com/images/${breed.reference_image_id}.jpg`;
    catImageCache.set(breedId, url);
    return url;
  }
  return undefined;
}

function listAllDogBreeds(map: DogBreedsList["message"]): PetBreedRef[] {
  const refs: PetBreedRef[] = [];
  for (const [breed, subBreeds] of Object.entries(map)) {
    if (subBreeds.length === 0) {
      refs.push({
        id: dogItemId(breed),
        species: "dog",
        title: formatName(breed),
        subtitle: "Chien",
        breedPath: breed,
      });
    } else {
      for (const sub of subBreeds) {
        refs.push({
          id: dogItemId(breed, sub),
          species: "dog",
          title: `${formatName(sub)} ${formatName(breed)}`,
          subtitle: "Chien",
          breedPath: dogBreedPath(breed, sub),
        });
      }
    }
  }
  return refs;
}

function listAllCatBreeds(breeds: CatBreed[]): PetBreedRef[] {
  return breeds.map((b) => ({
    id: `cat:${b.id}`,
    species: "cat",
    title: b.name,
    subtitle: b.origin ? `Chat · ${b.origin}` : "Chat",
    catBreedId: b.id,
  }));
}

function collectCatTraits(breeds: CatBreed[]): Map<string, string[]> {
  const traits = new Map<string, string[]>();
  for (const breed of breeds) {
    if (!breed.temperament) continue;
    for (const raw of breed.temperament.split(",")) {
      const trait = raw.trim();
      if (!trait) continue;
      const key = trait.toLowerCase();
      const list = traits.get(key) ?? [];
      list.push(breed.id);
      traits.set(key, list);
    }
  }
  return traits;
}

async function breedRefToItem(ref: PetBreedRef): Promise<ContentItem> {
  const coverUrl =
    ref.species === "dog" && ref.breedPath
      ? await getDogImage(...ref.breedPath.split("/") as [string, string?])
      : ref.catBreedId
        ? await getCatImage(ref.catBreedId)
        : undefined;

  return {
    id: ref.id,
    title: ref.title,
    subtitle: ref.subtitle,
    coverUrl,
    source: "dogceo",
    metadata: {
      itemKind: "breed",
      species: ref.species,
      breedPath: ref.breedPath,
      catBreedId: ref.catBreedId,
    },
  };
}

function speciesToEntity(species: "dog" | "cat", count: number): ContentEntity {
  return {
    id: `species:${species}`,
    name: species === "dog" ? "Chien" : "Chat",
    fanCount: count,
    source: "dogceo",
    metadata: { entityKind: "species", species },
  };
}

function traitToCollection(traitKey: string, displayName: string, count: number): ContentCollection {
  return {
    id: `trait:${traitKey}`,
    title: displayName,
    source: "dogceo",
    metadata: { collectionKind: "behavior", trait: traitKey, breedCount: count },
  };
}

function dogGroupToCollection(breed: string, subBreeds: string[]): ContentCollection {
  return {
    id: `group:dog:${breed}`,
    title: `Famille ${formatName(breed)}`,
    source: "dogceo",
    metadata: { collectionKind: "breed-group", species: "dog", breed, subCount: subBreeds.length },
  };
}

// ─── Raw exports (home / routes) ──────────────────────────────────────────────

export async function searchBreeds(query: string, limit = 20): Promise<ContentItem[]> {
  const q = normalizeQuery(query);
  const [dogMap, catBreeds] = await Promise.all([getDogBreedsMap(), getCatBreedsList()]);
  const dogRefs = listAllDogBreeds(dogMap).filter(
    (r) => !q || matchesText(r.title, q) || matchesText(r.subtitle ?? "", q),
  );
  const catRefs = listAllCatBreeds(catBreeds).filter(
    (r) => !q || matchesText(r.title, q) || matchesText(r.subtitle ?? "", q),
  );
  const merged = [...dogRefs, ...catRefs].slice(0, limit);
  return Promise.all(merged.map(breedRefToItem));
}

export async function searchSpecies(query: string, limit = 10): Promise<ContentEntity[]> {
  const [dogMap, catBreeds] = await Promise.all([getDogBreedsMap(), getCatBreedsList()]);
  const entities = [
    speciesToEntity("dog", listAllDogBreeds(dogMap).length),
    speciesToEntity("cat", catBreeds.length),
  ];
  const q = normalizeQuery(query);
  return entities
    .filter((e) => !q || matchesText(e.name, q))
    .slice(0, limit);
}

export async function searchBehaviors(query: string, limit = 20): Promise<ContentCollection[]> {
  const catBreeds = await getCatBreedsList();
  const traits = collectCatTraits(catBreeds);
  const q = normalizeQuery(query);
  const collections: ContentCollection[] = [];
  for (const [key, breedIds] of traits) {
    const displayName = key.charAt(0).toUpperCase() + key.slice(1);
    if (q && !matchesText(displayName, q)) continue;
    collections.push(traitToCollection(key, displayName, breedIds.length));
  }
  return collections.sort((a, b) => a.title.localeCompare(b.title, "fr")).slice(0, limit);
}

export async function getSpeciesBreeds(
  species: "dog" | "cat",
  limit = 50,
): Promise<ContentItem[]> {
  if (species === "dog") {
    const map = await getDogBreedsMap();
    const refs = listAllDogBreeds(map).slice(0, limit);
    return Promise.all(refs.map(breedRefToItem));
  }
  const breeds = await getCatBreedsList();
  const refs = listAllCatBreeds(breeds).slice(0, limit);
  return Promise.all(refs.map(breedRefToItem));
}

export async function getBehaviorBreeds(traitKey: string, limit = 50): Promise<ContentItem[]> {
  const catBreeds = await getCatBreedsList();
  const traits = collectCatTraits(catBreeds);
  const breedIds = traits.get(traitKey.toLowerCase()) ?? [];
  const refs = breedIds
    .slice(0, limit)
    .map((id) => {
      const breed = catBreeds.find((b) => b.id === id);
      if (!breed) return null;
      return {
        id: `cat:${breed.id}`,
        species: "cat" as const,
        title: breed.name,
        subtitle: breed.origin ? `Chat · ${breed.origin}` : "Chat",
        catBreedId: breed.id,
      };
    })
    .filter((r) => r !== null);
  return Promise.all(refs.map(breedRefToItem));
}

export async function getDogGroupBreeds(groupBreed: string, limit = 50): Promise<ContentItem[]> {
  const map = await getDogBreedsMap();
  const subBreeds = map[groupBreed] ?? [];
  const refs = subBreeds.slice(0, limit).map((sub) => ({
    id: dogItemId(groupBreed, sub),
    species: "dog" as const,
    title: `${formatName(sub)} ${formatName(groupBreed)}`,
    subtitle: "Chien",
    breedPath: dogBreedPath(groupBreed, sub),
  }));
  return Promise.all(refs.map(breedRefToItem));
}

export async function getTrendingBreeds(limit = 18): Promise<ContentItem[]> {
  const [dogMap, catBreeds] = await Promise.all([getDogBreedsMap(), getCatBreedsList()]);
  const dogRefs: PetBreedRef[] = [];
  for (const path of POPULAR_DOG_PATHS) {
    const parts = path.split("/");
    const breed = parts[0];
    const sub = parts[1];
    if (sub && !mapHasSub(dogMap, breed, sub)) continue;
    if (!sub && !(breed in dogMap)) continue;
    dogRefs.push({
      id: sub ? dogItemId(breed, sub) : dogItemId(breed),
      species: "dog",
      title: sub ? `${formatName(sub)} ${formatName(breed)}` : formatName(breed),
      subtitle: "Chien",
      breedPath: path,
    });
  }
  const catRefs: PetBreedRef[] = [];
  for (const id of POPULAR_CAT_IDS) {
    const breed = catBreeds.find((b) => b.id === id);
    if (!breed) continue;
    catRefs.push({
      id: `cat:${breed.id}`,
      species: "cat",
      title: breed.name,
      subtitle: breed.origin ? `Chat · ${breed.origin}` : "Chat",
      catBreedId: breed.id,
    });
  }

  const merged = [...dogRefs, ...catRefs].slice(0, limit);
  return Promise.all(merged.map(breedRefToItem));
}

function mapHasSub(map: DogBreedsList["message"], breed: string, sub: string): boolean {
  return (map[breed] ?? []).includes(sub);
}

export async function getBreedById(itemId: string): Promise<ContentItem | null> {
  const dog = parseDogItemId(itemId);
  if (dog) {
    const map = await getDogBreedsMap();
    const subBreeds = map[dog.breed] ?? [];
    if (dog.subBreed) {
      if (!subBreeds.includes(dog.subBreed)) return null;
      return breedRefToItem({
        id: itemId,
        species: "dog",
        title: `${formatName(dog.subBreed)} ${formatName(dog.breed)}`,
        subtitle: "Chien",
        breedPath: dogBreedPath(dog.breed, dog.subBreed),
      });
    }
    if (!(dog.breed in map) || subBreeds.length > 0) {
      if (subBreeds.length > 0) return null;
    }
    return breedRefToItem({
      id: itemId,
      species: "dog",
      title: formatName(dog.breed),
      subtitle: "Chien",
      breedPath: dog.breed,
    });
  }
  const catId = parseCatItemId(itemId);
  if (catId) {
    const breeds = await getCatBreedsList();
    const breed = breeds.find((b) => b.id === catId);
    if (!breed) return null;
    return breedRefToItem({
      id: itemId,
      species: "cat",
      title: breed.name,
      subtitle: breed.origin ? `Chat · ${breed.origin}` : "Chat",
      catBreedId: breed.id,
    });
  }
  return null;
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const dogceoContentSource: ContentSource = {
  source: "dogceo",

  async searchItems(query, { limit = 20 } = {}) {
    return searchBreeds(query, limit);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "breed") return searchBreeds(query, limit);
    if (kind === "dog") {
      const map = await getDogBreedsMap();
      const q = normalizeQuery(query);
      const refs = listAllDogBreeds(map)
        .filter((r) => !q || matchesText(r.title, q))
        .slice(0, limit);
      return Promise.all(refs.map(breedRefToItem));
    }
    if (kind === "cat") {
      const breeds = await getCatBreedsList();
      const q = normalizeQuery(query);
      const refs = listAllCatBreeds(breeds)
        .filter((r) => !q || matchesText(r.title, q))
        .slice(0, limit);
      return Promise.all(refs.map(breedRefToItem));
    }
    return searchBreeds(query, limit);
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const [behaviors, dogMap] = await Promise.all([searchBehaviors(query, limit), getDogBreedsMap()]);
    const q = normalizeQuery(query);
    const groups: ContentCollection[] = [];
    for (const [breed, subBreeds] of Object.entries(dogMap)) {
      if (subBreeds.length === 0) continue;
      const title = `Famille ${formatName(breed)}`;
      if (q && !matchesText(title, q)) continue;
      groups.push(dogGroupToCollection(breed, subBreeds));
    }
    return [...behaviors, ...groups].slice(0, limit);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    return searchSpecies(query, limit);
  },

  async getCollectionItems(collectionId) {
    if (collectionId.startsWith("trait:")) {
      const traitKey = collectionId.replace(/^trait:/, "");
      return getBehaviorBreeds(traitKey);
    }
    if (collectionId.startsWith("group:dog:")) {
      const breed = collectionId.replace(/^group:dog:/, "");
      return getDogGroupBreeds(breed);
    }
    return [];
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    if (entityId === "species:dog") return getSpeciesBreeds("dog", limit);
    if (entityId === "species:cat") return getSpeciesBreeds("cat", limit);
    return [];
  },

  async getEntityById(entityId) {
    if (entityId === "species:dog") {
      const map = await getDogBreedsMap();
      return speciesToEntity("dog", listAllDogBreeds(map).length);
    }
    if (entityId === "species:cat") {
      const breeds = await getCatBreedsList();
      return speciesToEntity("cat", breeds.length);
    }
    return null;
  },

  async getEntityCollections(_entityId) {
    return [];
  },
};
