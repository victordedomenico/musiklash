import type { ContentItem, ContentSource } from "./types";
import {
  getCountriesByRegion,
  getCountryByCode,
  restCountriesContentSource,
  searchCountries,
} from "./restcountries";
import { searchWikidataPlaces } from "./wikidata";

const FLAG_CDN = "https://flagcdn.com/w320";

type RcCountry = Awaited<ReturnType<typeof searchCountries>>[number];

function flagUrl(cca2?: string): string | undefined {
  if (!cca2) return undefined;
  return `${FLAG_CDN}/${cca2.toLowerCase()}.png`;
}

function countryToItem(c: RcCountry, itemKind = "country"): ContentItem {
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
      itemKind,
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

function capitalToItem(c: RcCountry): ContentItem | null {
  const capital = c.capital?.[0];
  if (!capital) return null;
  return {
    id: `${c.cca2 ?? c.cca3}-capital`,
    title: capital,
    subtitle: c.name?.common,
    coverUrl: flagUrl(c.cca2) ?? c.flags?.png,
    source: "restcountries",
    metadata: {
      itemKind: "capital",
      country: c.name?.common,
      cca2: c.cca2,
      capital,
    },
  };
}

function cultureToItem(c: RcCountry, language: string): ContentItem {
  return {
    id: `${c.cca2 ?? c.cca3}-culture-${language}`,
    title: language,
    subtitle: c.name?.common,
    coverUrl: flagUrl(c.cca2) ?? c.flags?.png,
    source: "restcountries",
    metadata: {
      itemKind: "culture",
      country: c.name?.common,
      cca2: c.cca2,
      language,
    },
  };
}

async function searchCapitals(query: string, limit = 20): Promise<ContentItem[]> {
  const countries = await searchCountries(query, limit * 2);
  const items: ContentItem[] = [];
  for (const c of countries) {
    const item = capitalToItem(c);
    if (item) items.push(item);
    if (items.length >= limit) break;
  }
  return items;
}

async function searchCultures(query: string, limit = 20): Promise<ContentItem[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const countries = await searchCountries(q, 40);
  const items: ContentItem[] = [];
  for (const c of countries) {
    const langs = c.languages ? Object.values(c.languages) : [];
    for (const lang of langs) {
      if (lang.toLowerCase().includes(q) || q.length <= 2) {
        items.push(cultureToItem(c, lang));
        if (items.length >= limit) return items;
      }
    }
  }
  return items;
}

async function searchFlags(query: string, limit = 20): Promise<ContentItem[]> {
  const countries = await searchCountries(query, limit);
  return countries.map((c) => countryToItem(c, "flag"));
}

/** Geo-quiz ContentSource — pays, capitales, drapeaux, cultures (+ lieux Wikidata). */
export const countryKlashContentSource: ContentSource = {
  source: "restcountries",

  async searchItems(query, options) {
    return restCountriesContentSource.searchItems(query, options);
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    switch (kind) {
      case "capital":
        return searchCapitals(query, limit);
      case "flag":
        return searchFlags(query, limit);
      case "culture":
        return searchCultures(query, limit);
      case "place":
        return searchWikidataPlaces(query, { limit });
      case "region":
        return restCountriesContentSource.searchItemsByKind?.("region", query, { limit }) ?? [];
      default:
        return this.searchItems(query, { limit });
    }
  },

  searchCollections: (...args) => restCountriesContentSource.searchCollections(...args),
  searchEntities: (...args) => restCountriesContentSource.searchEntities(...args),
  getCollectionItems: (...args) => restCountriesContentSource.getCollectionItems(...args),
  getEntityTopItems: (...args) => restCountriesContentSource.getEntityTopItems(...args),
  getEntityById: (...args) => restCountriesContentSource.getEntityById(...args),
  getEntityCollections: (...args) => restCountriesContentSource.getEntityCollections(...args),
};

export { getCountryByCode, getCountriesByRegion, searchCountries };
