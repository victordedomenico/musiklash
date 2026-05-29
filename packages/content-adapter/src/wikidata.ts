import type { ContentItem } from "./types";

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";

type WbSearchHit = {
  id?: string;
  label?: string;
  description?: string;
};

/**
 * Optional Wikidata search for landmarks, cities and cultural entities.
 * No API key required — rate-limit friendly (small limits only).
 */
export async function searchWikidataPlaces(
  query: string,
  { limit = 12, language = "fr" }: { limit?: number; language?: string } = {},
): Promise<ContentItem[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL(WIKIDATA_API);
  url.searchParams.set("action", "wbsearchentities");
  url.searchParams.set("search", q);
  url.searchParams.set("language", language);
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("limit", String(Math.min(limit, 20)));

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      next: { revalidate: 86400 } as any,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { search?: WbSearchHit[] };
    return (json.search ?? []).slice(0, limit).map((hit) => ({
      id: hit.id ?? hit.label ?? q,
      title: hit.label ?? "Lieu",
      subtitle: hit.description,
      source: "wikidata",
      metadata: {
        itemKind: "place",
        wikidataId: hit.id,
      },
    }));
  } catch {
    return [];
  }
}
