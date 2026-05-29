import type {
  ContentCollection,
  ContentEntity,
  ContentItem,
  ContentSource,
} from "./types";

const RC_BASE = "https://restcountries.com/v3.1";
const FLAG_CDN = "https://flagcdn.com/w320";

const REGIONS: { id: string; title: string; apiName: string }[] = [
  { id: "africa", title: "Afrique", apiName: "Africa" },
  { id: "americas", title: "Amériques", apiName: "Americas" },
  { id: "asia", title: "Asie", apiName: "Asia" },
  { id: "europe", title: "Europe", apiName: "Europe" },
  { id: "oceania", title: "Océanie", apiName: "Oceania" },
];

const POPULAR_COUNTRY_CODES = [
  "FR",
  "US",
  "JP",
  "IT",
  "ES",
  "TH",
  "GB",
  "DE",
  "AU",
  "BR",
  "MX",
  "GR",
  "PT",
  "MA",
  "CA",
  "IN",
  "KR",
  "NZ",
  "TR",
  "NL",
];

// ─── Raw RestCountries types (subset) ─────────────────────────────────────────

type RcName = {
  common?: string;
  official?: string;
};

type RcCountry = {
  cca2?: string;
  cca3?: string;
  ccn3?: string;
  name?: RcName;
  capital?: string[];
  region?: string;
  subregion?: string;
  population?: number;
  flags?: { png?: string; svg?: string };
  languages?: Record<string, string>;
  latlng?: [number, number];
};

type OtmPlace = {
  xid?: string;
  name?: string;
  country?: string;
  rate?: number;
  kinds?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function flagUrl(cca2?: string): string | undefined {
  if (!cca2) return undefined;
  return `${FLAG_CDN}/${cca2.toLowerCase()}.png`;
}

function regionById(id: string) {
  return REGIONS.find((r) => r.id === id.toLowerCase());
}

function regionByApiName(name?: string) {
  if (!name) return undefined;
  return REGIONS.find((r) => r.apiName.toLowerCase() === name.toLowerCase());
}

async function rcFetch<T>(
  path: string,
  options?: { live?: boolean },
): Promise<T | T[]> {
  const url = path.startsWith("http") ? path : `${RC_BASE}${path}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    ...(options?.live ? { cache: "no-store" as const } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(options?.live ? {} : ({ next: { revalidate: 86400 } } as any)),
  });
  if (!res.ok) {
    throw new Error(`RestCountries ${path} → ${res.status}`);
  }
  const json = (await res.json()) as T | T[];
  return Array.isArray(json) ? (json as T[]) : json;
}

async function rcFetchArray(path: string): Promise<RcCountry[]> {
  const json = await rcFetch<RcCountry>(path);
  if (Array.isArray(json)) return json;
  return json ? [json] : [];
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function matchesRegion(query: string, region: (typeof REGIONS)[number]): boolean {
  const q = normalizeQuery(query);
  if (!q) return true;
  return (
    region.id.includes(q) ||
    region.title.toLowerCase().includes(q) ||
    region.apiName.toLowerCase().includes(q)
  );
}

// ─── Raw API (for routes / home trending) ─────────────────────────────────────

export async function searchCountries(query: string, limit = 20): Promise<RcCountry[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const countries = await rcFetchArray(
      `/name/${encodeURIComponent(q)}?fields=cca2,cca3,name,capital,region,subregion,population,flags,languages,latlng`,
    );
    return countries.slice(0, limit);
  } catch {
    return [];
  }
}

export async function getCountryByCode(code: string): Promise<RcCountry | null> {
  const id = code.trim().toUpperCase();
  if (!id) return null;
  try {
    const countries = await rcFetchArray(
      `/alpha/${encodeURIComponent(id)}?fields=cca2,cca3,name,capital,region,subregion,population,flags,languages,latlng`,
    );
    return countries[0] ?? null;
  } catch {
    return null;
  }
}

export async function getCountriesByRegion(regionId: string, limit = 50): Promise<RcCountry[]> {
  const region = regionById(regionId);
  if (!region) return [];
  const countries = await rcFetchArray(
    `/region/${encodeURIComponent(region.apiName)}?fields=cca2,cca3,name,capital,region,subregion,population,flags,languages,latlng`,
  );
  return countries
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
    .slice(0, limit);
}

export async function searchRegions(query: string, limit = 20): Promise<(typeof REGIONS)[number][]> {
  return REGIONS.filter((r) => matchesRegion(query, r)).slice(0, limit);
}

export async function getTrendingCountries(limit = 18): Promise<RcCountry[]> {
  const codes = POPULAR_COUNTRY_CODES.slice(0, limit);
  const results = await Promise.all(codes.map((code) => getCountryByCode(code)));
  return results.filter((c): c is RcCountry => c !== null);
}

export async function searchCities(query: string, limit = 20): Promise<ContentItem[]> {
  const key = process.env.OPENTRIPMAP_API_KEY;
  const q = query.trim();
  if (!key || !q) return [];

  const url = new URL("https://api.opentripmap.com/0.1/en/places/autosuggest");
  url.searchParams.set("name", q);
  url.searchParams.set("radius", "500000");
  url.searchParams.set("lon", "2.3522");
  url.searchParams.set("lat", "48.8566");
  url.searchParams.set("apikey", key);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 3600 } as any,
    });
    if (!res.ok) return [];
    const places = (await res.json()) as OtmPlace[];
    return (places ?? []).slice(0, limit).map((place) => ({
      id: place.xid ?? place.name ?? q,
      title: place.name ?? "Ville",
      subtitle: place.country ?? place.kinds?.split(",")[0],
      source: "opentripmap",
      metadata: {
        itemKind: "city",
        xid: place.xid,
        rate: place.rate,
        kinds: place.kinds,
      },
    }));
  } catch {
    return [];
  }
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function countryToItem(c: RcCountry): ContentItem {
  const capital = c.capital?.[0];
  const population =
    c.population && c.population >= 1_000_000
      ? `${Math.round(c.population / 1_000_000)} M hab.`
      : c.population
        ? `${Math.round(c.population / 1_000).toLocaleString("fr-FR")} k hab.`
        : undefined;
  return {
    id: c.cca2 ?? c.cca3 ?? c.name?.common ?? "",
    title: c.name?.common ?? "Pays inconnu",
    subtitle: [capital, c.subregion ?? c.region, population].filter(Boolean).join(" · "),
    coverUrl: flagUrl(c.cca2) ?? c.flags?.png,
    source: "restcountries",
    metadata: {
      itemKind: "country",
      cca2: c.cca2,
      cca3: c.cca3,
      capital,
      region: c.region,
      subregion: c.subregion,
      population: c.population,
      languages: c.languages ? Object.values(c.languages) : undefined,
      latlng: c.latlng,
    },
  };
}

function regionToCollection(region: (typeof REGIONS)[number]): ContentCollection {
  return {
    id: region.id,
    title: region.title,
    source: "restcountries",
    metadata: { itemKind: "region", apiName: region.apiName },
  };
}

function regionToEntity(region: (typeof REGIONS)[number]): ContentEntity {
  return {
    id: region.id,
    name: region.title,
    source: "restcountries",
    metadata: { itemKind: "region", apiName: region.apiName },
  };
}

// ─── ContentSource ────────────────────────────────────────────────────────────

export const restCountriesContentSource: ContentSource = {
  source: "restcountries",

  async searchItems(query, { limit = 20 } = {}) {
    const countries = await searchCountries(query, limit);
    return countries.map(countryToItem);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    if (kind === "city") return searchCities(query, limit);
    if (kind === "region") {
      const regions = await searchRegions(query, limit);
      return regions.map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: "Région du monde",
        source: "restcountries",
        metadata: { itemKind: "region", apiName: r.apiName },
      }));
    }
    return this.searchItems(query, { limit });
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const regions = await searchRegions(query, limit);
    return regions.map(regionToCollection);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const regions = await searchRegions(query, limit);
    return regions.map(regionToEntity);
  },

  async getCollectionItems(collectionId) {
    return getCountriesByRegion(collectionId, 50).then((countries) =>
      countries.map(countryToItem),
    );
  },

  async getEntityTopItems(entityId, { limit = 50 } = {}) {
    return getCountriesByRegion(entityId, limit).then((countries) =>
      countries.map(countryToItem),
    );
  },

  async getEntityById(entityId) {
    const region = regionById(entityId) ?? regionByApiName(entityId);
    return region ? regionToEntity(region) : null;
  },

  async getEntityCollections(_entityId, { limit = 20 } = {}) {
    void _entityId;
    void limit;
    return [];
  },
};
