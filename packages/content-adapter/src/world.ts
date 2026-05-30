import type { ContentSource } from "./types";
import { countryKlashContentSource } from "./countryklash";
import { searchCities } from "./restcountries";

/**
 * WorldKlash — pays, capitales, drapeaux, cultures, régions, villes et lieux.
 * Merges CountryKlash (geo quiz) + TravelKlash (destinations).
 */
export const worldContentSource: ContentSource = {
  source: "worldklash",

  searchItems: (...args) => countryKlashContentSource.searchItems(...args),

  async searchItemsByKind(kind, query, options) {
    if (kind === "city") {
      const limit = options?.limit ?? 20;
      return searchCities(query, limit);
    }
    if (countryKlashContentSource.searchItemsByKind) {
      return countryKlashContentSource.searchItemsByKind(kind, query, options);
    }
    return countryKlashContentSource.searchItems(query, options);
  },

  searchCollections: (...args) => countryKlashContentSource.searchCollections(...args),
  searchEntities: (...args) => countryKlashContentSource.searchEntities(...args),
  getCollectionItems: (...args) => countryKlashContentSource.getCollectionItems(...args),
  getEntityTopItems: (...args) => countryKlashContentSource.getEntityTopItems(...args),
  getEntityById: (...args) => countryKlashContentSource.getEntityById(...args),
  getEntityCollections: (...args) => countryKlashContentSource.getEntityCollections(...args),
};
