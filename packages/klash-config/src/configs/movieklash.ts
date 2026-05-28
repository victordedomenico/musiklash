/**
 * MovieKlash vertical stub (not registered in `REGISTRY` until TMDB adapter exists).
 *
 * Missing pieces:
 * - `tmdbContentSource` in `@klash/content-adapter`
 * - `apps/movieklash` thin Next app + `vertical.config.ts`
 * - optional `relationGraph` if a "six degrés" film mode is added later
 */
export const MOVIEKLASH_STUB = {
  slug: "movieklash",
  name: "MovieKlash",
  source: "tmdb",
  branding: {
    tagline: "Fais s'affronter tes films",
    description: "Brackets et tierlists cinéma — en attente de l'adaptateur TMDB.",
    keywords: ["film", "cinéma", "bracket films", "tierlist films"],
    category: "movies",
    siteUrlFallback: "https://movieklash.vercel.app",
  },
  nouns: { item: "film", items: "films", collection: "saga", entity: "réalisateur" },
  imageHosts: ["image.tmdb.org"],
  gameModes: ["bracket", "tierlist"] as const,
} as const;
