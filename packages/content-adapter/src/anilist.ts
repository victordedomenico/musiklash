import type { ContentItem, ContentCollection, ContentEntity, ContentSource } from "./types";
import { fetchTmdbArcs, type StoryArc } from "./tmdb-arcs";
const ANILIST_URL = "https://graphql.anilist.co";
const ANIMETHEMES_GQL_URL = "https://graphql.animethemes.moe";

// ─── AniList raw types ────────────────────────────────────────────────────────

export type AniListMedia = {
  id: number;
  idMal: number | null;
  title: { romaji: string; english: string | null; native: string | null };
  coverImage: { large: string | null; medium: string | null; color: string | null };
  bannerImage: string | null;
  popularity: number;
  averageScore: number | null;
  genres: string[];
  seasonYear: number | null;
  episodes: number | null;
  status: string;
  description: string | null;
};

export type AniListCharacter = {
  id: number;
  name: { full: string; native: string | null };
  image: { large: string | null; medium: string | null };
  favourites: number;
  media?: {
    nodes: Array<{ id: number; title: { romaji: string } }>;
  };
};

export type AnimeThemeEntry = {
  id: number;
  slug: string;
  type: "OP" | "ED";
  sequence: number | null;
  song: { title: string; performances: Array<{ artist: { name: string } }> };
  animethemeentries: Array<{
    videos: { nodes: Array<{ filename: string; link: string; audio: { link: string } | null }> };
  }>;
};

// ─── GraphQL helpers ──────────────────────────────────────────────────────────

async function anilistQuery<T>(
  query: string,
  variables: Record<string, unknown>,
  options?: { live?: boolean },
): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    ...(options?.live ? { cache: "no-store" as const } : {}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(options?.live ? {} : ({ next: { revalidate: 3600 } } as any)),
  });
  if (!res.ok) throw new Error(`AniList query failed: ${res.status}`);
  const json = await res.json() as { data: T; errors?: unknown[] };
  if (json.errors?.length) throw new Error(`AniList GraphQL error: ${JSON.stringify(json.errors[0])}`);
  return json.data;
}

function mediaDisplayTitle(n: { title: { romaji: string; english: string | null } }): string {
  return n.title.english ?? n.title.romaji;
}

// ─── AniList queries ──────────────────────────────────────────────────────────

const SEARCH_ANIME_QUERY = `
query SearchAnime($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(search: $search, type: ANIME, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
      id idMal
      title { romaji english native }
      coverImage { large medium color }
      bannerImage popularity averageScore genres
      seasonYear episodes status description
    }
  }
}`;

const SEARCH_CHARACTER_QUERY = `
query SearchCharacter($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    characters(search: $search, sort: [SEARCH_MATCH, FAVOURITES_DESC]) {
      id
      name { full native }
      image { large medium }
      favourites
      media(sort: [POPULARITY_DESC], perPage: 1) { nodes { id title { romaji } } }
    }
  }
}`;

const GET_ANIME_BY_ID_QUERY = `
query GetAnime($id: Int) {
  Media(id: $id, type: ANIME) {
    id idMal
    title { romaji english native }
    coverImage { large medium color }
    bannerImage popularity averageScore genres
    seasonYear episodes status description
  }
}`;

const GET_ANIME_ARCS_QUERY = `
query GetAnimeArcs($id: Int!) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english native }
    relations {
      edges {
        relationType
        node {
          id
          type
          format
          episodes
          popularity
          title { romaji english native }
          coverImage { large medium }
        }
      }
    }
  }
}`;

const SEARCH_ARC_MEDIA_QUERY = `
query SearchArcMedia($search: String, $perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(search: $search, type: ANIME, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
      id
      format
      episodes
      popularity
      title { romaji english native }
      coverImage { large medium }
      relations {
        edges { relationType }
      }
    }
  }
}`;

const GET_CHARACTER_BY_ID_QUERY = `
query GetCharacter($id: Int) {
  Character(id: $id) {
    id
    name { full native }
    image { large medium }
    favourites
    media(sort: [POPULARITY_DESC], perPage: 5) { nodes { id title { romaji } } }
  }
}`;

const GET_CHARACTER_CONNECTIONS_QUERY = `
query GetCharConnections($id: Int!) {
  Character(id: $id) {
    id
    name { full }
    media(type: ANIME, perPage: 5, sort: POPULARITY_DESC) {
      nodes {
        id
        title { romaji english }
        popularity
      }
    }
  }
}`;

const GET_MEDIA_CHARACTERS_QUERY = `
query GetMediaChars($id: Int!) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english }
    characters(perPage: 25, sort: [ROLE, FAVOURITES_DESC]) {
      nodes {
        id
        name { full }
        image { medium }
        favourites
      }
    }
  }
}`;

const VALIDATE_CO_APPEARANCE_QUERY = `
query ValidateCoAppearance($charAId: Int!, $charBId: Int!) {
  charA: Character(id: $charAId) {
    media(type: ANIME, perPage: 20, sort: POPULARITY_DESC) {
      nodes { id title { romaji english } }
    }
  }
  charB: Character(id: $charBId) {
    media(type: ANIME, perPage: 20, sort: POPULARITY_DESC) {
      nodes { id }
    }
  }
}`;

// ─── AnimeThemes GraphQL helper ───────────────────────────────────────────────

const ANIMETHEMES_BY_MAL_QUERY = `
query GetThemesByMal($malId: Int!) {
  findAnimeByExternalSite(site: MAL, id: [$malId]) {
    animethemes {
      id type sequence slug
      song { title performances { artist { name } } }
      animethemeentries { videos { nodes { link filename audio { link } } } }
    }
  }
}`;

const ANIMETHEMES_SEARCH_QUERY = `
query SearchThemes($query: String!, $first: Int) {
  search(search: $query, first: $first) {
    animethemes {
      id type sequence slug
      song { title performances { artist { name } } }
      animethemeentries { videos { nodes { link filename audio { link } } } }
      anime { name images { nodes { facet link } } }
    }
  }
}`;

// AnimeThemes' GraphQL endpoint sits behind Cloudflare, which 403s the default
// undici User-Agent. Spoof a browser UA so server-side fetches get through.
const ANIMETHEMES_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function animethemesQuery<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(ANIMETHEMES_GQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": ANIMETHEMES_UA,
    },
    body: JSON.stringify({ query, variables }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(({ next: { revalidate: 3600 } } as any)),
  });
  if (!res.ok) throw new Error(`AnimeThemes GraphQL failed: ${res.status}`);
  const json = await res.json() as { data: T; errors?: unknown[] };
  if (json.errors?.length) throw new Error(`AnimeThemes GraphQL error: ${JSON.stringify(json.errors[0])}`);
  return json.data;
}

async function getAnimeThemes(malId: number): Promise<AnimeThemeEntry[]> {
  try {
    const data = await animethemesQuery<{
      findAnimeByExternalSite: Array<{ animethemes: AnimeThemeEntry[] }> | null;
    }>(ANIMETHEMES_BY_MAL_QUERY, { malId });
    return data.findAnimeByExternalSite?.[0]?.animethemes ?? [];
  } catch {
    return [];
  }
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function animeTitle(m: AniListMedia): string {
  return m.title.english ?? m.title.romaji ?? m.title.native ?? String(m.id);
}

function mediaToItem(m: AniListMedia): ContentItem {
  return {
    id: String(m.id),
    title: animeTitle(m),
    subtitle: m.genres.slice(0, 2).join(", ") || undefined,
    coverUrl: m.coverImage.large ?? m.coverImage.medium ?? undefined,
    source: "anilist",
    metadata: {
      idMal: m.idMal,
      popularity: m.popularity,
      averageScore: m.averageScore,
      seasonYear: m.seasonYear,
      episodes: m.episodes,
      status: m.status,
      bannerImage: m.bannerImage,
    },
  };
}

function characterToItem(c: AniListCharacter): ContentItem {
  const animeTitle = c.media?.nodes[0]?.title?.romaji;
  return {
    id: `char-${c.id}`,
    title: c.name.full,
    subtitle: animeTitle,
    coverUrl: c.image.large ?? c.image.medium ?? undefined,
    source: "anilist",
    metadata: {
      anilistCharacterId: c.id,
      type: "character",
      favourites: c.favourites,
      nativeName: c.name.native,
    },
  };
}

function themeToItem(theme: AnimeThemeEntry, anime: AniListMedia): ContentItem {
  const artist = theme.song.performances.map((p) => p.artist.name).join(", ") || animeTitle(anime);
  const videoEntry = theme.animethemeentries[0];
  const video = videoEntry?.videos.nodes[0];
  const label = `${theme.type}${theme.sequence ?? ""}`;
  return {
    id: `theme-${theme.id}`,
    title: theme.song.title,
    subtitle: `${label} — ${animeTitle(anime)} (${artist})`,
    coverUrl: anime.coverImage.large ?? anime.coverImage.medium ?? undefined,
    // Prefer the .ogg audio track; the .webm is video and not always playable in <audio>.
    previewUrl: video?.audio?.link ?? video?.link ?? undefined,
    source: "animethemes",
    metadata: {
      themeType: theme.type,
      sequence: theme.sequence,
      animeId: anime.id,
      animeTitle: animeTitle(anime),
      artist,
      videoFilename: video?.filename,
    },
  };
}

function mediaToCollection(m: AniListMedia): ContentCollection {
  return {
    id: String(m.id),
    title: animeTitle(m),
    coverUrl: m.coverImage.large ?? m.coverImage.medium ?? undefined,
    source: "anilist",
    metadata: {
      episodes: m.episodes,
      popularity: m.popularity,
      seasonYear: m.seasonYear,
    },
  };
}

function arcToCollection(a: AniListArc): ContentCollection {
  return {
    id: String(a.id),
    title: arcDisplayTitle(a),
    coverUrl: a.coverImage.large ?? a.coverImage.medium ?? undefined,
    source: typeof a.id === "string" ? "story-arc" : "anilist",
    metadata: {
      episodes: a.episodes,
      format: a.format,
      popularity: a.popularity,
      parentTitle: a.parentTitle,
      saga: a.saga,
      animeEpisodes: a.animeEpisodes,
      curated: typeof a.id === "string",
    },
  };
}

function mediaToEntity(m: AniListMedia): ContentEntity {
  return {
    id: String(m.id),
    name: animeTitle(m),
    pictureUrl: m.coverImage.large ?? m.coverImage.medium ?? undefined,
    fanCount: m.popularity,
    source: "anilist",
  };
}

// ─── Raw API exports ──────────────────────────────────────────────────────────

export async function searchAnime(query: string, limit = 20): Promise<AniListMedia[]> {
  if (!query.trim()) return [];
  const data = await anilistQuery<{ Page: { media: AniListMedia[] } }>(SEARCH_ANIME_QUERY, {
    search: query.trim(),
    page: 1,
    perPage: limit,
  });
  return data.Page.media ?? [];
}

/** Arc narratif — entrée AniList liée ou arc curaté (ex. « Wano »). */
export type AniListArc = {
  id: number | string;
  title: { romaji: string; english: string | null; native: string | null };
  coverImage: { large: string | null; medium: string | null };
  popularity: number;
  format?: string | null;
  episodes?: number | null;
  /** Série parente quand connue. */
  parentTitle?: string;
  /** Saga parente pour les arcs curatés (ex. « East Blue »). */
  saga?: string;
  /** Plage d'épisodes anime (ex. « 890 - 1085 »). */
  animeEpisodes?: string | null;
};

const NON_ARC_FORMATS = new Set(["MOVIE", "SPECIAL", "OVA", "MUSIC", "MANGA", "NOVEL"]);
const ARC_RELATIONS = new Set(["SEQUEL", "PREQUEL", "SIDE_STORY", "SPIN_OFF"]);

function arcDisplayTitle(a: AniListArc): string {
  return a.title.english ?? a.title.romaji ?? a.title.native ?? String(a.id);
}

function curatedArcToAniListArc(
  arc: StoryArc,
  parentTitle: string,
): AniListArc {
  return {
    id: arc.id,
    title: { romaji: arc.title, english: arc.title, native: null },
    coverImage: { large: null, medium: null },
    popularity: 0,
    episodes: arc.episodes,
    parentTitle,
    saga: arc.saga,
    animeEpisodes: arc.animeEpisodes,
  };
}

type AniListTitleFields = {
  title: { romaji: string; english: string | null; native?: string | null };
};

function displayTitle(m: AniListTitleFields): string {
  return m.title.english ?? m.title.romaji ?? m.title.native ?? "";
}

function looksLikeArcTitle(title: string): boolean {
  if (/\b(film|movie|3d2y|stampede)\b/i.test(title)) return false;
  return /\b(arc|saga)\b/i.test(title) || /:\s*\S/.test(title);
}

function isLikelyAnilistArcRelation(
  relationType: string,
  node: {
    type: string;
    format: string | null;
    episodes: number | null;
    title: { romaji: string; english: string | null; native: string | null };
  },
): boolean {
  if (node.type !== "ANIME") return false;
  const title = displayTitle(node);
  if (node.format && NON_ARC_FORMATS.has(node.format)) return false;
  if (looksLikeArcTitle(title)) return true;
  if (!ARC_RELATIONS.has(relationType)) return false;
  if ((node.episodes ?? 0) <= 1) return false;
  return node.format === "TV" || node.format === "ONA";
}

function isLikelyStandaloneArc(
  media: AniListTitleFields & {
    format?: string | null;
    episodes?: number | null;
    relations?: { edges: Array<{ relationType: string }> };
  },
): boolean {
  const title = displayTitle(media);
  if (media.format && NON_ARC_FORMATS.has(media.format)) return false;
  if ((media.episodes ?? 0) <= 1 && !looksLikeArcTitle(title)) return false;
  if (looksLikeArcTitle(title)) return true;
  return (media.relations?.edges ?? []).some((e) => e.relationType === "PARENT");
}

export async function searchAnimeArcs(query: string, limit = 20): Promise<AniListArc[]> {
  if (!query.trim()) return [];

  // Recherche d'arc par nom : TMDB n'expose pas d'index global, on s'appuie donc
  // sur le fallback « média-arc » AniList (saisons/spin-offs ressemblant à un arc).
  const data = await anilistQuery<{
    Page: {
      media: Array<
        AniListArc & { relations?: { edges: Array<{ relationType: string }> } }
      >;
    };
  }>(SEARCH_ARC_MEDIA_QUERY, {
    search: query.trim(),
    perPage: Math.min(limit * 3, 50),
  });

  return (data.Page.media ?? [])
    .filter(isLikelyStandaloneArc)
    .slice(0, limit)
    .map((m) => ({
      id: m.id,
      title: m.title,
      coverImage: m.coverImage,
      popularity: m.popularity,
      format: m.format,
      episodes: m.episodes,
    }));
}

export async function getAnimeArcs(animeId: number): Promise<AniListArc[]> {
  // Source unique des arcs : saisons TMDB (souvent nommées par arc, en français).
  // (AniList sert au mapping titre + au fallback relations ci-dessous.)
  const anime = await getAnimeById(animeId);
  if (anime) {
    const tmdb = await fetchTmdbArcs(`anilist-${animeId}`, [
      anime.title.english ?? "",
      anime.title.romaji ?? "",
      anime.title.native ?? "",
    ]);
    if (tmdb.length > 0) {
      const parentTitle = animeTitle(anime);
      return tmdb.map((arc) => curatedArcToAniListArc(arc, parentTitle));
    }
  }

  const data = await anilistQuery<{
    Media: {
      title: { romaji: string; english: string | null; native: string | null };
      relations: {
        edges: Array<{
          relationType: string;
          node: {
            id: number;
            type: string;
            format: string | null;
            episodes: number | null;
            popularity: number;
            title: { romaji: string; english: string | null; native: string | null };
            coverImage: { large: string | null; medium: string | null };
          } | null;
        }>;
      };
    } | null;
  }>(GET_ANIME_ARCS_QUERY, { id: animeId }, { live: true });

  const parent = data.Media;
  if (!parent) return [];

  const parentTitle = displayTitle(parent);
  const arcs: AniListArc[] = [];

  for (const edge of parent.relations?.edges ?? []) {
    const node = edge.node;
    if (!node || !isLikelyAnilistArcRelation(edge.relationType, node)) continue;
    arcs.push({
      id: node.id,
      title: node.title,
      coverImage: node.coverImage,
      popularity: node.popularity,
      format: node.format,
      episodes: node.episodes,
      parentTitle,
    });
  }

  return arcs.sort((a, b) => b.popularity - a.popularity);
}

const TRENDING_CHARACTERS_QUERY = `
query TrendingCharacters($perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    characters(sort: [FAVOURITES_DESC]) {
      id
      name { full native }
      image { large medium }
      favourites
      media(sort: [POPULARITY_DESC], perPage: 1) { nodes { id title { romaji } } }
    }
  }
}`;

export async function getTrendingCharacters(limit = 18): Promise<AniListCharacter[]> {
  const data = await anilistQuery<{ Page: { characters: AniListCharacter[] } }>(
    TRENDING_CHARACTERS_QUERY,
    { perPage: limit },
  );
  return data.Page.characters ?? [];
}

export async function getAnimeCharacters(animeId: number, limit = 25): Promise<AniListCharacter[]> {
  const data = await anilistQuery<{
    Media: { characters: { nodes: AniListCharNode[] } } | null;
  }>(GET_MEDIA_CHARACTERS_QUERY, { id: animeId }, { live: true });

  return (data.Media?.characters?.nodes ?? []).slice(0, limit).map((c) => ({
    id: c.id,
    name: { full: c.name.full, native: null },
    image: { large: c.image.medium, medium: c.image.medium },
    favourites: c.favourites,
  }));
}

export async function searchCharacters(query: string, limit = 20): Promise<AniListCharacter[]> {
  if (!query.trim()) return [];
  const data = await anilistQuery<{ Page: { characters: AniListCharacter[] } }>(SEARCH_CHARACTER_QUERY, {
    search: query.trim(),
    page: 1,
    perPage: limit,
  });
  return data.Page.characters ?? [];
}

export async function getAnimeById(id: number): Promise<AniListMedia | null> {
  try {
    const data = await anilistQuery<{ Media: AniListMedia }>(GET_ANIME_BY_ID_QUERY, { id });
    return data.Media;
  } catch {
    return null;
  }
}

export async function getCharacterById(id: number): Promise<AniListCharacter | null> {
  try {
    const data = await anilistQuery<{ Character: AniListCharacter }>(GET_CHARACTER_BY_ID_QUERY, { id });
    return data.Character;
  } catch {
    return null;
  }
}

/** Personnage lié par co-apparition dans un animé (BattleClash). */
export type ConnectedCharacter = {
  id: string;
  name: string;
  pictureUrl: string | null;
  favourites: number;
  animeTitle: string | null;
};

type AniListCharNode = {
  id: number;
  name: { full: string };
  image: { medium: string | null };
  favourites: number;
};

/** Personnages des 3 animés les plus populaires du personnage source. */
export async function fetchCharacterCoAppearances(characterId: string): Promise<ConnectedCharacter[]> {
  const charIdInt = parseInt(characterId, 10);
  if (!charIdInt) return [];

  const data = await anilistQuery<{
    Character: { media: { nodes: Array<{ id: number; title: { romaji: string; english: string | null } }> } };
  }>(GET_CHARACTER_CONNECTIONS_QUERY, { id: charIdInt }, { live: true });

  const topAnime = data.Character.media.nodes.slice(0, 3);
  if (topAnime.length === 0) return [];

  const results = await Promise.all(
    topAnime.map(async (anime) => {
      const mediaData = await anilistQuery<{
        Media: { title: { romaji: string; english: string | null }; characters: { nodes: AniListCharNode[] } };
      }>(GET_MEDIA_CHARACTERS_QUERY, { id: anime.id }, { live: true });
      return { anime, chars: mediaData.Media.characters.nodes };
    }),
  );

  const byId = new Map<string, ConnectedCharacter>();
  for (const { anime, chars } of results) {
    for (const c of chars) {
      const id = String(c.id);
      if (id === characterId) continue;
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          name: c.name.full,
          pictureUrl: c.image.medium ?? null,
          favourites: c.favourites,
          animeTitle: mediaDisplayTitle(anime),
        });
      }
    }
  }

  return [...byId.values()];
}

export async function validateCharacterCoAppearance(
  charAId: string,
  charBId: string,
): Promise<{ animeTitle: string } | null> {
  const aId = parseInt(charAId, 10);
  const bId = parseInt(charBId, 10);
  if (!aId || !bId || aId === bId) return null;

  const data = await anilistQuery<{
    charA: { media: { nodes: Array<{ id: number; title: { romaji: string; english: string | null } }> } };
    charB: { media: { nodes: Array<{ id: number }> } };
  }>(VALIDATE_CO_APPEARANCE_QUERY, { charAId: aId, charBId: bId }, { live: true });

  const bIds = new Set(data.charB.media.nodes.map((n) => n.id));
  const shared = data.charA.media.nodes.find((n) => bIds.has(n.id));
  if (!shared) return null;
  return { animeTitle: mediaDisplayTitle(shared) };
}

export async function getAnimeThemeItems(animeId: number): Promise<ContentItem[]> {
  const anime = await getAnimeById(animeId);
  if (!anime?.idMal) return [];
  const themes = await getAnimeThemes(anime.idMal);
  return themes.map((t) => themeToItem(t, anime));
}

// ─── AnimeThemes song-title search ───────────────────────────────────────────

type AnimeThemeSearchEntry = {
  id: number;
  type: "OP" | "ED";
  sequence: number | null;
  slug: string;
  song: { title: string; performances: Array<{ artist: { name: string } }> };
  animethemeentries: Array<{ videos: { nodes: Array<{ link: string; filename: string; audio: { link: string } | null }> } }>;
  anime: {
    name: string;
    images: { nodes: Array<{ facet: string | null; link: string }> };
  } | null;
};

export async function searchAnimeThemesBySong(
  query: string,
  type?: "OP" | "ED",
  limit = 20,
): Promise<ContentItem[]> {
  if (!query.trim()) return [];
  try {
    const data = await animethemesQuery<{
      search: { animethemes: AnimeThemeSearchEntry[] };
    }>(ANIMETHEMES_SEARCH_QUERY, { query: query.trim(), first: Math.min(limit * 2, 50) });
    const themes = (data.search?.animethemes ?? [])
      .filter((t) => !type || t.type === type)
      .slice(0, limit);
    return themes.map((t) => {
      const artist = t.song.performances.map((p) => p.artist.name).join(", ");
      const video = t.animethemeentries[0]?.videos.nodes[0];
      const images = t.anime?.images.nodes ?? [];
      const cover =
        images.find((i) => i.facet === "LARGE_COVER" || i.facet === "SMALL_COVER")?.link ??
        images[0]?.link;
      const label = `${t.type}${t.sequence ?? ""}`;
      return {
        id: `theme-${t.id}`,
        title: t.song.title,
        subtitle: `${label} — ${t.anime?.name ?? ""}${artist ? ` (${artist})` : ""}`,
        coverUrl: cover,
        previewUrl: video?.audio?.link ?? video?.link,
        source: "animethemes",
        metadata: {
          themeType: t.type,
          sequence: t.sequence,
          animeTitle: t.anime?.name,
          artist,
        },
      } satisfies ContentItem;
    });
  } catch {
    return [];
  }
}

// ─── ContentSource implementation ────────────────────────────────────────────

export const anilistContentSource: ContentSource = {
  source: "anilist",

  async searchItems(query, { limit = 20 } = {}) {
    // Search both anime and characters, merge results
    const [animes, characters] = await Promise.all([
      searchAnime(query, Math.ceil(limit / 2)),
      searchCharacters(query, Math.floor(limit / 2)),
    ]);
    return [
      ...animes.map(mediaToItem),
      ...characters.map(characterToItem),
    ].slice(0, limit);
  },

  async searchCollections(query, { limit = 20 } = {}) {
    const animes = await searchAnime(query, limit);
    return animes.map(mediaToCollection);
  },

  async searchEntities(query, { limit = 20 } = {}) {
    const animes = await searchAnime(query, limit);
    return animes.map(mediaToEntity);
  },

  async getCollectionItems(collectionId) {
    // For anime: return its openings/endings via AnimeThemes
    const animeId = Number(collectionId);
    if (!isNaN(animeId)) {
      return getAnimeThemeItems(animeId);
    }
    return [];
  },

  async getEntityTopItems(entityId, { limit = 20 } = {}) {
    // For an anime entity: return its themes + top characters
    const animeId = Number(entityId);
    const anime = await getAnimeById(animeId);
    if (!anime) return [];
    const items: ContentItem[] = [mediaToItem(anime)];
    if (anime.idMal) {
      const themes = await getAnimeThemes(anime.idMal);
      items.push(...themes.slice(0, limit - 1).map((t) => themeToItem(t, anime)));
    }
    return items.slice(0, limit);
  },

  async getEntityById(entityId) {
    if (entityId.startsWith("char-")) {
      const charId = Number(entityId.replace("char-", ""));
      const char = await getCharacterById(charId);
      if (!char) return null;
      return {
        id: entityId,
        name: char.name.full,
        pictureUrl: char.image.large ?? char.image.medium ?? undefined,
        fanCount: char.favourites,
        source: "anilist",
      };
    }
    const anime = await getAnimeById(Number(entityId));
    return anime ? mediaToEntity(anime) : null;
  },

  async getEntityCollections(entityId, { limit = 100 } = {}) {
    const animeId = Number(entityId);
    if (isNaN(animeId)) return [];
    const [arcs, anime] = await Promise.all([
      getAnimeArcs(animeId),
      getAnimeById(animeId),
    ]);
    const parentCover = anime?.coverImage.large ?? anime?.coverImage.medium ?? undefined;
    return arcs.slice(0, limit).map((a) => {
      const collection = arcToCollection(a);
      return {
        ...collection,
        coverUrl: collection.coverUrl ?? parentCover,
      };
    });
  },

  async searchItemsByKind(kind, query, { limit = 20 } = {}) {
    switch (kind) {
      case "anime": {
        const animes = await searchAnime(query, limit);
        return animes.map(mediaToItem);
      }
      case "character": {
        const chars = await searchCharacters(query, limit);
        return chars.map(characterToItem);
      }
      case "arc": {
        const arcs = await searchAnimeArcs(query, limit);
        return arcs.map((a) => ({
          id: String(a.id),
          title: arcDisplayTitle(a),
          coverUrl: a.coverImage.large ?? a.coverImage.medium ?? undefined,
          source: typeof a.id === "string" ? "story-arc" as const : "anilist" as const,
          metadata: {
            type: "arc",
            episodes: a.episodes,
            format: a.format,
            popularity: a.popularity,
            parentTitle: a.parentTitle,
            saga: a.saga,
            curated: typeof a.id === "string",
          },
        }));
      }
      case "opening":
        return searchAnimeThemesBySong(query, "OP", limit);
      case "ending":
        return searchAnimeThemesBySong(query, "ED", limit);
      default: {
        // Fallback: merge anime + characters
        const [animes, chars] = await Promise.all([
          searchAnime(query, Math.ceil(limit / 2)),
          searchCharacters(query, Math.floor(limit / 2)),
        ]);
        return [...animes.map(mediaToItem), ...chars.map(characterToItem)].slice(0, limit);
      }
    }
  },
};
