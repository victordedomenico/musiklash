const ANILIST_API = "https://graphql.anilist.co";

const TRENDING_QUERY = `
query TrendingAnime($perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(type: ANIME, sort: TRENDING_DESC, status_not: NOT_YET_RELEASED) {
      id
      title { romaji english }
      coverImage { large medium }
      siteUrl
    }
  }
}
`;

export type TopAnimeItem = {
  id: number;
  title: string;
  coverUrl: string;
  url: string;
};

export async function getTopAnime(limit = 20): Promise<TopAnimeItem[]> {
  try {
    const res = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: TRENDING_QUERY, variables: { perPage: limit } }),
      next: { revalidate: 3600 },
    } as RequestInit);

    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: {
        Page?: {
          media?: Array<{
            id: number;
            title: { romaji?: string; english?: string | null };
            coverImage: { large?: string | null; medium?: string | null };
            siteUrl?: string;
          }>;
        };
      };
    };

    return (json.data?.Page?.media ?? []).map((m) => ({
      id: m.id,
      title: m.title.english ?? m.title.romaji ?? `Anime ${m.id}`,
      coverUrl: m.coverImage.large ?? m.coverImage.medium ?? "",
      url: m.siteUrl ?? `https://anilist.co/anime/${m.id}`,
    })).filter((m) => m.coverUrl);
  } catch {
    return [];
  }
}
