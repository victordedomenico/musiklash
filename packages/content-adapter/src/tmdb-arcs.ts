/** Un arc/saison d'animé, prêt à être converti en collection. */
export type StoryArc = {
  id: string;
  title: string;
  saga?: string;
  /** Plage d'épisodes anime (ex. « 1–52 »). */
  animeEpisodes?: string | null;
  episodes?: number | null;
};

/**
 * Arcs d'animés via l'API **gratuite et officielle** de TMDB.
 *
 * Idée : sur TMDB, beaucoup d'animés longs sont découpés en saisons nommées
 * par arc/saga, déjà **en français** (langue `fr-FR`), avec le nombre d'épisodes.
 * Quand les saisons ne sont pas nommées (« Saison 1 »), elles servent quand même
 * de regroupement (l'utilisateur a validé « saison = arc »).
 *
 * Couverture quasi universelle (TMDB indexe presque tous les animés) : c'est la
 * **source unique** des arcs/saisons d'AnimeKlash.
 *
 * Mapping : on résout l'animé AniList → fiche TV TMDB par recherche de titre
 * (filtrée sur les séries japonaises animées), puis on lit ses saisons.
 */

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_LANG = "fr-FR";

type TmdbSearchResult = {
  id: number;
  name: string;
  original_name?: string;
  original_language?: string;
  popularity?: number;
  first_air_date?: string;
};

type TmdbSeason = {
  season_number: number;
  name: string;
  episode_count?: number;
};

async function tmdbGet<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) return null;
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("language", TMDB_LANG);
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

/**
 * Recherche la fiche TV TMDB la plus pertinente pour un animé (titres candidats).
 * TMDB classe par popularité, donc « Dragon Ball » renvoie d'abord « Dragon Ball Z ».
 * On privilégie donc une **correspondance exacte du titre** avant de retomber sur
 * le 1er résultat japonais.
 */
async function resolveTmdbId(titles: string[]): Promise<number | null> {
  let fallback: number | null = null;
  for (const title of titles) {
    const q = title?.trim();
    if (!q) continue;
    const data = await tmdbGet<{ results?: TmdbSearchResult[] }>("/search/tv", { query: q });
    const results = data?.results ?? [];
    if (results.length === 0) continue;

    const ql = q.toLowerCase();
    const exact = results.filter(
      (r) => r.name?.toLowerCase() === ql || r.original_name?.toLowerCase() === ql,
    );
    const best = exact.find((r) => r.original_language === "ja") ?? exact[0];
    if (best) return best.id;

    // Pas de correspondance exacte : mémorise un repli (1er résultat JA).
    if (fallback === null) {
      fallback = (results.find((r) => r.original_language === "ja") ?? results[0]).id;
    }
  }
  return fallback;
}

/** Retire les préfixes « S1 • », « Arc - », « Saga » d'un nom de saison. */
function cleanSeasonName(name: string): string {
  return name
    .replace(/^\s*s\d+\s*[•·|\-–—:]\s*/i, "") // « S1 • », « S2 - »…
    .replace(/^\s*(arc|saga)\s*[-–:]?\s*/i, "")
    .replace(/\s*\b(arc|saga)\b\s*$/i, "")
    .trim() || name.trim();
}

/** Une saison « Saison 12 » générique (non nommée par arc) ? */
function isGenericSeason(name: string): boolean {
  return /^(saison|season)\s*\d+$/i.test(name.trim());
}

/** Transforme une liste ordonnée (titre + nb d'épisodes) en arcs avec plages cumulées. */
function toArcs(items: Array<{ id: string; title: string; count: number }>): StoryArc[] {
  let cursor = 1;
  return items.map((it) => {
    const start = cursor;
    const end = it.count > 0 ? cursor + it.count - 1 : cursor;
    cursor = end + 1;
    return {
      id: it.id,
      title: it.title,
      episodes: it.count || null,
      animeEpisodes: it.count > 0 ? `${start}–${end}` : null,
    } satisfies StoryArc;
  });
}

// ─── Arcs via les saisons (diffusion) ─────────────────────────────────────────

async function fetchSeasonArcs(tvId: number): Promise<StoryArc[]> {
  // FR pour les séries traduites (One Piece, DBZ…), EN en repli quand TMDB n'a
  // nommé les saisons qu'en anglais (Naruto Shippuden → « Kazekage Rescue »).
  const [fr, en] = await Promise.all([
    tmdbGet<{ seasons?: TmdbSeason[] }>(`/tv/${tvId}`, {}),
    tmdbGet<{ seasons?: TmdbSeason[] }>(`/tv/${tvId}`, { language: "en-US" }),
  ]);
  const enByNum = new Map((en?.seasons ?? []).map((s) => [s.season_number, s.name]));
  const seasons = (fr?.seasons ?? [])
    .filter((s) => s.season_number > 0)
    .sort((a, b) => a.season_number - b.season_number);

  return toArcs(
    seasons.map((s) => {
      const enName = enByNum.get(s.season_number);
      let title: string;
      if (!isGenericSeason(s.name)) title = cleanSeasonName(s.name);
      else if (enName && !isGenericSeason(enName)) title = cleanSeasonName(enName);
      else title = s.name.trim();
      return { id: `tmdb-${tvId}-s${s.season_number}`, title, count: s.episode_count ?? 0 };
    }),
  );
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

const cache = new Map<string, Promise<StoryArc[]>>();

/**
 * Récupère les arcs (= saisons TMDB) d'un animé. On lit uniquement `/seasons` :
 * nom FR quand il est nommé par arc (One Piece « East Blue », DBZ « Saga
 * Saïyens »), nom EN en repli, sinon « Saison N ».
 *
 * @param titles titres candidats (anglais, romaji, natif…) pour la recherche.
 */
export function fetchTmdbArcs(cacheKey: string, titles: string[]): Promise<StoryArc[]> {
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const promise = (async () => {
    const tvId = await resolveTmdbId(titles);
    if (!tvId) return [];
    return fetchSeasonArcs(tvId);
  })();

  cache.set(cacheKey, promise);
  return promise;
}

/** Résolution TMDB TV pour séries live-action / cinéma (sans priorité animé japonais). */
async function resolveTmdbTvId(titles: string[]): Promise<number | null> {
  for (const title of titles) {
    const q = title?.trim();
    if (!q) continue;
    const data = await tmdbGet<{ results?: TmdbSearchResult[] }>("/search/tv", { query: q });
    const results = data?.results ?? [];
    if (results.length === 0) continue;

    const ql = q.toLowerCase();
    const exact = results.find(
      (r) => r.name?.toLowerCase() === ql || r.original_name?.toLowerCase() === ql,
    );
    if (exact) return exact.id;
    return results[0].id;
  }
  return null;
}

const tvArcCache = new Map<string, Promise<StoryArc[]>>();

/** Arcs / saisons TMDB pour une série TV (ScreenKlash). */
export function fetchTmdbArcsForTv(cacheKey: string, titles: string[]): Promise<StoryArc[]> {
  const hit = tvArcCache.get(cacheKey);
  if (hit) return hit;

  const promise = (async () => {
    const tvId = await resolveTmdbTvId(titles);
    if (!tvId) return [];
    return fetchSeasonArcs(tvId);
  })();

  tvArcCache.set(cacheKey, promise);
  return promise;
}
