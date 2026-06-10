import type { ContentItem } from "./types";
import { searchTracks, type DeezerTrack } from "./deezer";
import { searchMovies } from "./tmdb";
import { getShowById, searchShows } from "./tvmaze";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

export type ScreenThemeKind = "intro" | "outro";

type TmdbVideo = {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
};

type TmdbMediaHit = {
  id: number;
  name?: string;
  title?: string;
  poster_path: string | null;
};

function themeKindFromApi(type: "opening" | "ending" | "OP" | "ED"): ScreenThemeKind {
  if (type === "opening" || type === "OP") return "intro";
  return "outro";
}

/** Déduit intro vs outro depuis le titre Deezer (évite de tout étiqueter comme l'onglet actif). */
export function classifyDeezerThemeTitle(title: string, albumTitle = ""): ScreenThemeKind | null {
  const hay = `${title} ${albumTitle}`.toLowerCase();

  const hasEnding =
    /\b(ending|end credits|outro|closing credits|générique de fin|credit suite|finale? theme)\b/i.test(
      hay,
    ) || /\bend theme\b/i.test(hay);
  const hasOpening =
    /\b(opening|intro|main title|title theme|générique de début|générique d'ouverture|opening credits)\b/i.test(
      hay,
    ) || /\bopen theme\b/i.test(hay);

  if (hasEnding && !hasOpening) return "outro";
  if (hasOpening && !hasEnding) return "intro";
  // « Star Wars Rebels Theme » sans mention ending → générique de début
  if (/\btheme\b/i.test(hay) && !hasEnding) return "intro";
  return null;
}

function themeLabel(kind: ScreenThemeKind): string {
  return kind === "intro" ? "Générique début" : "Générique fin";
}

async function tmdbGetOptional<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) return null;
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", "fr-FR");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(({ next: { revalidate: 86400 } } as any)),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function isExcludedVideo(name: string, type: string): boolean {
  const n = name.toLowerCase();
  const t = type.toLowerCase();
  return (
    t === "trailer" ||
    t === "teaser" ||
    /trailer|teaser|bande-annonce|behind the scenes|bloopers|featurette|clip officiel/i.test(n)
  );
}

/** Classe une vidéo TMDB en générique début ou fin (séries / films). */
export function classifyScreenThemeVideo(name: string, type: string): ScreenThemeKind | null {
  if (isExcludedVideo(name, type)) return null;
  const n = name.toLowerCase();
  const t = type.toLowerCase();

  if (
    t === "opening credits" ||
    /opening credits|title sequence|main title|générique d.?ouverture|générique de début|intro|theme song/i.test(n)
  ) {
    if (!/ending|de fin|outro|closing/i.test(n)) return "intro";
  }
  if (
    t === "closing credits" ||
    /closing credits|end credits|générique de fin|générique de clôture|outro|ending credits/i.test(n)
  ) {
    return "outro";
  }
  if (/générique(?! de fin)/i.test(n) && !/fin|ending|outro/i.test(n)) return "intro";
  return null;
}

function videoToThemeItem(
  video: TmdbVideo,
  mediaTitle: string,
  posterUrl: string | undefined,
  mediaKey: string,
  kind: ScreenThemeKind,
): ContentItem {
  const label = themeLabel(kind);
  return {
    id: `screentheme-${mediaKey}-${video.id}`,
    title: video.name,
    subtitle: `${label} — ${mediaTitle} (vidéo TMDB)`,
    coverUrl: posterUrl,
    previewUrl: video.site === "YouTube" ? `https://www.youtube.com/watch?v=${video.key}` : undefined,
    source: "tmdb",
    metadata: {
      itemKind: "theme",
      themeType: kind,
      mediaTitle,
      youtubeKey: video.key,
      tmdbVideoType: video.type,
      themeSource: "tmdb",
    },
  };
}

function filterVideos(
  videos: TmdbVideo[],
  kind?: ScreenThemeKind,
): Array<{ video: TmdbVideo; kind: ScreenThemeKind }> {
  const out: Array<{ video: TmdbVideo; kind: ScreenThemeKind }> = [];
  for (const v of videos.filter((x) => x.site === "YouTube")) {
    const classified = classifyScreenThemeVideo(v.name, v.type);
    if (!classified) continue;
    if (kind && classified !== kind) continue;
    out.push({ video: v, kind: classified });
  }
  return out;
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function isLowQualityThemeTitle(title: string): boolean {
  return /8\s*bit|karaok|chipmunk|cover version|tribute|remix|rework|midi|ringtone/i.test(title);
}

function scoreDeezerTrack(track: DeezerTrack, mediaTitle: string, kind: ScreenThemeKind): number {
  const hay = `${track.title} ${track.album.title} ${track.artist.name}`.toLowerCase();
  const media = mediaTitle.toLowerCase();
  const mediaNorm = normalizeTitle(mediaTitle);
  let score = track.rank ?? 0;

  if (hay.includes(media) || normalizeTitle(track.title).includes(mediaNorm)) score += 50_000;
  if (isLowQualityThemeTitle(track.title)) score -= 80_000;

  if (kind === "intro") {
    if (/theme|opening|main title|générique|intro|rebel|title music/i.test(hay)) score += 20_000;
    if (/ending|end credits|outro|fin\b/i.test(hay)) score -= 30_000;
  } else {
    if (/ending|end credits|outro|générique de fin|closing/i.test(hay)) score += 20_000;
    if (/opening|intro|main title/i.test(hay) && !/ending|end credits/i.test(hay)) score -= 15_000;
  }
  return score;
}

function deezerToThemeItem(
  track: DeezerTrack,
  mediaTitle: string,
  kind: ScreenThemeKind,
  mediaKey: string,
): ContentItem {
  const label = themeLabel(kind);
  return {
    id: `deezer-theme-${mediaKey}-${track.id}`,
    title: track.title,
    subtitle: `${label} — ${mediaTitle} · ${track.artist.name}`,
    coverUrl: track.album.cover_medium ?? track.album.cover_big ?? track.artist.picture_medium,
    previewUrl: track.preview || undefined,
    source: "deezer",
    metadata: {
      itemKind: "theme",
      themeType: kind,
      mediaTitle,
      deezerTrackId: track.id,
      themeSource: "deezer",
    },
  };
}

/** Morceaux-thème via Deezer (repli quand TMDB n'a pas de vidéo de générique). */
async function searchDeezerThemeItems(
  mediaTitle: string,
  kind: ScreenThemeKind,
  limit = 6,
  mediaKey?: string,
): Promise<ContentItem[]> {
  const key = mediaKey ?? `media-${normalizeTitle(mediaTitle)}`;
  const queries =
    kind === "intro"
      ? [
          `${mediaTitle} theme`,
          `${mediaTitle} opening theme`,
          `${mediaTitle} main title`,
        ]
      : [
          `${mediaTitle} ending theme`,
          `${mediaTitle} end credits`,
          `${mediaTitle} closing theme`,
        ];

  const seen = new Set<number>();
  const ranked: Array<{ track: DeezerTrack; score: number; detected: ScreenThemeKind }> = [];

  for (const q of queries) {
    try {
      const tracks = await searchTracks(q, 12, { requirePreview: true });
      for (const track of tracks) {
        if (seen.has(track.id)) continue;
        const detected = classifyDeezerThemeTitle(track.title, track.album.title);
        if (detected && detected !== kind) continue;
        if (!detected && kind === "outro") continue;
        seen.add(track.id);
        ranked.push({
          track,
          score: scoreDeezerTrack(track, mediaTitle, kind),
          detected: detected ?? kind,
        });
      }
    } catch {
      // Deezer indisponible — on ignore
    }
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked
    .filter((r) => r.score > -20_000)
    .slice(0, limit)
    .map((r) => deezerToThemeItem(r.track, mediaTitle, r.detected, key));
}

async function mergeThemeItems(
  tmdb: ContentItem[],
  mediaTitle: string,
  kind: ScreenThemeKind | undefined,
  mediaKey: string,
  max = 10,
): Promise<ContentItem[]> {
  const seen = new Set<string>();
  const out: ContentItem[] = [];
  for (const item of tmdb) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  if (out.length < max && kind) {
    const deezer = await searchDeezerThemeItems(mediaTitle, kind, max - out.length, mediaKey);
    for (const item of deezer) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  return out.slice(0, max);
}

async function getTmdbTvThemeItemsById(
  tvId: number,
  displayName: string,
  posterPath: string | null | undefined,
  filter?: ScreenThemeKind,
): Promise<ContentItem[]> {
  const videosJson = await tmdbGetOptional<{ results?: TmdbVideo[] }>(`/tv/${tvId}/videos`, {});
  const poster = posterPath ? `${TMDB_IMG}${posterPath}` : undefined;
  const mediaKey = `tv-${tvId}`;
  const tmdb = filterVideos(videosJson?.results ?? [], filter).map(({ video, kind }) =>
    videoToThemeItem(video, displayName, poster, mediaKey, kind),
  );
  return mergeThemeItems(tmdb, displayName, filter, mediaKey);
}

async function getTmdbMovieThemeItemsById(
  movieId: number,
  title: string,
  posterPath: string | null | undefined,
  filter?: ScreenThemeKind,
): Promise<ContentItem[]> {
  const videosJson = await tmdbGetOptional<{ results?: TmdbVideo[] }>(`/movie/${movieId}/videos`, {});
  const poster = posterPath ? `${TMDB_IMG}${posterPath}` : undefined;
  const mediaKey = `movie-${movieId}`;
  const tmdb = filterVideos(videosJson?.results ?? [], filter).map(({ video, kind }) =>
    videoToThemeItem(video, title, poster, mediaKey, kind),
  );
  return mergeThemeItems(tmdb, title, filter, mediaKey);
}

async function resolveTmdbTvIdForShow(showName: string, imdbId?: string | null): Promise<number | null> {
  if (imdbId) {
    const found = await tmdbGetOptional<{ tv_results?: { id: number }[] }>("/find/external", {
      external_source: "imdb_id",
      external_id: imdbId,
    });
    const tvId = found?.tv_results?.[0]?.id;
    if (tvId) return tvId;
  }
  const data = await tmdbGetOptional<{ results?: TmdbMediaHit[] }>("/search/tv", {
    query: showName.trim(),
    page: "1",
  });
  const results = data?.results ?? [];
  if (results.length === 0) return null;

  const norm = normalizeTitle(showName);
  const exact = results.find(
    (r) => normalizeTitle(r.name ?? "") === norm || normalizeTitle(r.name ?? "").includes(norm),
  );
  return (exact ?? results[0]).id;
}

async function getTmdbTvThemeItems(
  showName: string,
  imdbId: string | null | undefined,
  filter?: ScreenThemeKind,
): Promise<ContentItem[]> {
  const tvId = await resolveTmdbTvIdForShow(showName, imdbId);
  if (!tvId) {
    if (!filter) return [];
    return searchDeezerThemeItems(showName, filter, 8);
  }
  const tvJson = await tmdbGetOptional<{ name?: string; poster_path?: string | null }>(`/tv/${tvId}`, {});
  return getTmdbTvThemeItemsById(
    tvId,
    tvJson?.name ?? showName,
    tvJson?.poster_path,
    filter,
  );
}

/** Génériques d'une série (TMDB vidéos + morceaux Deezer). */
export async function getShowThemeItems(
  showId: string | number,
  filter?: ScreenThemeKind,
): Promise<ContentItem[]> {
  const show = await getShowById(showId);
  if (!show) return [];
  return getTmdbTvThemeItems(show.name, show.externals?.imdb ?? null, filter);
}

/** Recherche de génériques début/fin (films & séries). */
export async function searchScreenThemes(
  query: string,
  apiType: "opening" | "ending",
  limit = 20,
): Promise<ContentItem[]> {
  if (!query.trim()) return [];
  const kind = themeKindFromApi(apiType);
  const q = query.trim().toLowerCase();
  const seen = new Set<string>();
  const items: ContentItem[] = [];

  const push = (list: ContentItem[], mediaTitle = "") => {
    for (const item of list) {
      if (seen.has(item.id)) continue;
      const media = String(item.metadata?.mediaTitle ?? mediaTitle);
      const hay = `${item.title} ${item.subtitle} ${media}`.toLowerCase();
      if (!hay.includes(q) && mediaTitle && !media.toLowerCase().includes(q)) continue;
      seen.add(item.id);
      items.push(item);
      if (items.length >= limit) return true;
    }
    return false;
  };

  const deezerDirect = await searchDeezerThemeItems(query, kind, Math.min(limit, 8));
  if (push(deezerDirect, query)) return items;

  const [tvHits, movieHits] = await Promise.all([
    tmdbGetOptional<{ results?: TmdbMediaHit[] }>("/search/tv", { query: query.trim(), page: "1" }),
    tmdbGetOptional<{ results?: TmdbMediaHit[] }>("/search/movie", {
      query: query.trim(),
      page: "1",
      include_adult: "false",
    }),
  ]);

  for (const tv of (tvHits?.results ?? []).slice(0, 5)) {
    const name = tv.name ?? "";
    const themes = await getTmdbTvThemeItemsById(tv.id, name, tv.poster_path, kind);
    if (push(themes, name)) return items;
  }

  for (const movie of (movieHits?.results ?? []).slice(0, 4)) {
    const title = movie.title ?? movie.name ?? "";
    const themes = await getTmdbMovieThemeItemsById(movie.id, title, movie.poster_path, kind);
    if (push(themes, title)) return items;
  }

  const shows = await searchShows(query, 4);
  for (const show of shows) {
    const themes = await getTmdbTvThemeItems(show.name, show.externals?.imdb ?? null, kind);
    if (push(themes, show.name)) return items;
  }

  if (items.length === 0) {
    const extraMovies = await searchMovies(query, 3);
    for (const m of extraMovies) {
      const themes = await getTmdbMovieThemeItemsById(m.id, m.title, m.poster_path, kind);
      if (push(themes, m.title)) return items;
    }
  }

  if (items.length === 0) {
    push(await searchDeezerThemeItems(query, kind, limit), query);
  }

  return items;
}
