import {
  normalizeMusicText,
  titleContainsTrack,
  titleSearchVariants,
} from "./youtube-match";

const YTM_ENDPOINT = "https://music.youtube.com/youtubei/v1";
const YTM_CONTEXT = {
  client: {
    clientName: "WEB_REMIX",
    clientVersion: "1.20250317.01.00",
    hl: "fr",
    gl: "FR",
  },
};

const ARTISTS_FILTER = "EgWKAQIgAWoKEAMQBBAJEAoQBQ%3D%3D";
const ALBUMS_FILTER = "EgWKAQIYAWoKEAMQBBAJEAoQBQ%3D%3D";
const SONGS_FILTER = "EgWKAQIIAWoKEAMQBBAJEAoQBQ%3D%3D";

type YtmTrackHit = {
  videoId: string;
  title: string;
  channelTitle: string;
};

type YtmAlbumHit = {
  name: string;
  browseId: string;
  subtitle: string;
};

async function ytmPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${YTM_ENDPOINT}/${path}?prettyPrint=false`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Origin: "https://music.youtube.com",
      Referer: "https://music.youtube.com/",
    },
    body: JSON.stringify({ context: YTM_CONTEXT, ...body }),
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`YouTube Music ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

function walk(obj: unknown, visit: (node: Record<string, unknown>) => void): void {
  if (Array.isArray(obj)) {
    for (const item of obj) walk(item, visit);
    return;
  }
  if (!obj || typeof obj !== "object") return;
  const node = obj as Record<string, unknown>;
  visit(node);
  for (const value of Object.values(node)) walk(value, visit);
}

function runsText(runs: unknown): string {
  if (!Array.isArray(runs)) return "";
  return runs
    .map((run) =>
      run && typeof run === "object" && typeof (run as { text?: unknown }).text === "string"
        ? (run as { text: string }).text
        : "",
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function flexTexts(renderer: Record<string, unknown>): string[] {
  const columns = renderer.flexColumns;
  if (!Array.isArray(columns)) return [];
  return columns.map((column) => {
    if (!column || typeof column !== "object") return "";
    const flex = (column as { musicResponsiveListItemFlexColumnRenderer?: unknown })
      .musicResponsiveListItemFlexColumnRenderer;
    if (!flex || typeof flex !== "object") return "";
    const text = (flex as { text?: unknown }).text;
    if (!text || typeof text !== "object") return "";
    return runsText((text as { runs?: unknown }).runs);
  });
}

function browseIdFrom(renderer: Record<string, unknown>): string | null {
  const browseId = (
    ((renderer as { navigationEndpoint?: { browseEndpoint?: { browseId?: string } } })
      .navigationEndpoint || {}).browseEndpoint || {}
  ).browseId;
  return browseId || null;
}

function isAlbumBrowseId(browseId: string): boolean {
  return browseId.startsWith("MPRE");
}

function albumNameMatches(candidateAlbum: string, album: string): boolean {
  const left = normalizeMusicText(candidateAlbum);
  const right = normalizeMusicText(album);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function albumBelongsToArtist(album: YtmAlbumHit, artist: string): boolean {
  const artistNorm = normalizeMusicText(artist);
  if (!artistNorm) return true;
  const haystack = normalizeMusicText(`${album.name} ${album.subtitle}`);
  return haystack.includes(artistNorm);
}

function extractSongHits(
  payload: unknown,
  trackTitle: string,
  artist: string,
): YtmTrackHit[] {
  const artistNorm = normalizeMusicText(artist);
  const hits: YtmTrackHit[] = [];
  const seen = new Set<string>();
  walk(payload, (node) => {
    const renderer = node.musicResponsiveListItemRenderer;
    if (!renderer || typeof renderer !== "object") return;
    const videoId = ((renderer as { playlistItemData?: { videoId?: string } }).playlistItemData || {})
      .videoId;
    if (!videoId || seen.has(videoId)) return;
    const texts = flexTexts(renderer as Record<string, unknown>);
    const title = texts[0] || "";
    const meta = texts[1] || "";
    if (!titleContainsTrack(title, trackTitle, artist)) return;
    const metaNorm = normalizeMusicText(`${title} ${meta}`);
    if (artistNorm && !metaNorm.includes(artistNorm) && !normalizeMusicText(title).includes(artistNorm)) {
      return;
    }
    // Premium / catalog songs expose Song|Album|Single — skip fan video hits.
    const catalogMeta = /\b(song|chanson|album|single|ep)\b/i.test(meta) || /\btopic\b/i.test(meta);
    if (!catalogMeta) return;
    seen.add(videoId);
    hits.push({
      videoId,
      title,
      channelTitle: meta.includes("Topic") ? `${artist} - Topic` : artist,
    });
  });
  return hits;
}

async function searchSongsCatalog(artist: string, title: string): Promise<YtmTrackHit | null> {
  for (const variant of titleSearchVariants(title)) {
    const search = await ytmPost<unknown>("search", {
      query: `${artist} ${variant}`.trim(),
      params: SONGS_FILTER,
    });
    const hits = extractSongHits(search, title, artist);
    if (hits[0]) return hits[0];
  }
  return null;
}

function extractArtistBrowseId(searchPayload: unknown, artist: string): string | null {
  const artistNorm = normalizeMusicText(artist);
  let fallback: string | null = null;
  walk(searchPayload, (node) => {
    const renderer = node.musicResponsiveListItemRenderer;
    if (!renderer || typeof renderer !== "object") return;
    const texts = flexTexts(renderer as Record<string, unknown>);
    const name = texts[0] || "";
    const browseId = browseIdFrom(renderer as Record<string, unknown>);
    if (!browseId || !name) return;
    if (normalizeMusicText(name) === artistNorm) {
      fallback = browseId;
    }
  });
  return fallback;
}

function extractAlbums(payload: unknown): YtmAlbumHit[] {
  const albums: YtmAlbumHit[] = [];
  const seen = new Set<string>();

  walk(payload, (node) => {
    const renderer = node.musicTwoRowItemRenderer;
    if (!renderer || typeof renderer !== "object") return;
    const title = runsText(((renderer as { title?: { runs?: unknown } }).title || {}).runs);
    const subtitle = runsText(
      ((renderer as { subtitle?: { runs?: unknown } }).subtitle || {}).runs,
    );
    const browseId = browseIdFrom(renderer as Record<string, unknown>);
    if (!title || !browseId || !isAlbumBrowseId(browseId) || seen.has(browseId)) return;
    seen.add(browseId);
    albums.push({ name: title, browseId, subtitle });
  });

  walk(payload, (node) => {
    const renderer = node.musicResponsiveListItemRenderer;
    if (!renderer || typeof renderer !== "object") return;
    const texts = flexTexts(renderer as Record<string, unknown>);
    const browseId = browseIdFrom(renderer as Record<string, unknown>);
    if (!browseId || !texts[0] || !isAlbumBrowseId(browseId) || seen.has(browseId)) return;
    seen.add(browseId);
    albums.push({ name: texts[0], browseId, subtitle: texts[1] || "" });
  });

  return albums;
}

function extractTracksFromAlbum(
  payload: unknown,
  trackTitle: string,
  artist: string,
): YtmTrackHit | null {
  let hit: YtmTrackHit | null = null;
  walk(payload, (node) => {
    if (hit) return;
    const renderer = node.musicResponsiveListItemRenderer;
    if (!renderer || typeof renderer !== "object") return;
    const videoId = ((renderer as { playlistItemData?: { videoId?: string } }).playlistItemData || {})
      .videoId;
    if (!videoId) return;
    const texts = flexTexts(renderer as Record<string, unknown>);
    const title = texts[0] || "";
    if (!titleContainsTrack(title, trackTitle, artist)) return;
    hit = {
      videoId,
      title,
      channelTitle: `${artist} - Topic`,
    };
  });
  return hit;
}

async function browseAlbumForTrack(
  browseId: string,
  trackTitle: string,
  artist: string,
): Promise<YtmTrackHit | null> {
  const albumPage = await ytmPost<unknown>("browse", { browseId });
  return extractTracksFromAlbum(albumPage, trackTitle, artist);
}

async function findAlbumBrowseId(artist: string, album: string): Promise<string | null> {
  const query = `${artist} ${album}`.trim();
  const search = await ytmPost<unknown>("search", {
    query,
    params: ALBUMS_FILTER,
  });
  const albums = extractAlbums(search).filter((entry) => albumBelongsToArtist(entry, artist));
  const exact = albums.find((entry) => albumNameMatches(entry.name, album));
  if (exact) return exact.browseId;

  // Fallback via artist page albums shelf
  const artistSearch = await ytmPost<unknown>("search", {
    query: artist,
    params: ARTISTS_FILTER,
  });
  const browseId = extractArtistBrowseId(artistSearch, artist);
  if (!browseId) return null;

  const artistPage = await ytmPost<unknown>("browse", { browseId });
  const artistAlbums = extractAlbums(artistPage);
  const matched = artistAlbums.find((entry) => albumNameMatches(entry.name, album));
  return matched?.browseId ?? null;
}

/** Premium ATVs often miss song search — resolve via album pages instead. */
async function findTrackViaAlbumSearch(
  artist: string,
  title: string,
): Promise<YtmTrackHit | null> {
  const queries = new Set<string>();
  for (const variant of titleSearchVariants(title)) {
    queries.add(`${artist} ${variant}`.trim());
  }

  const seenAlbums = new Set<string>();
  for (const query of queries) {
    const search = await ytmPost<unknown>("search", {
      query,
      params: ALBUMS_FILTER,
    });
    const albums = extractAlbums(search).filter((entry) => albumBelongsToArtist(entry, artist));
    for (const entry of albums.slice(0, 6)) {
      if (seenAlbums.has(entry.browseId)) continue;
      seenAlbums.add(entry.browseId);
      const hit = await browseAlbumForTrack(entry.browseId, title, artist);
      if (hit) return hit;
    }
  }
  return null;
}

async function findTrackViaArtistAlbums(
  artist: string,
  title: string,
  album?: string | null,
): Promise<YtmTrackHit | null> {
  const artistSearch = await ytmPost<unknown>("search", {
    query: artist,
    params: ARTISTS_FILTER,
  });
  const browseId = extractArtistBrowseId(artistSearch, artist);
  if (!browseId) return null;

  const artistPage = await ytmPost<unknown>("browse", { browseId });
  const albums = extractAlbums(artistPage);
  const prioritized = album
    ? [
        ...albums.filter((entry) => albumNameMatches(entry.name, album)),
        ...albums.filter((entry) => !albumNameMatches(entry.name, album)),
      ]
    : albums;

  for (const entry of prioritized.slice(0, 16)) {
    const hit = await browseAlbumForTrack(entry.browseId, title, artist);
    if (hit) return hit;
  }
  return null;
}

/**
 * Resolve official Topic / YouTube Music catalog audio for a track.
 * Prefers album browse — Premium-only ATVs often never appear in song search.
 */
export async function searchYoutubeMusicCatalog(options: {
  artist: string;
  title: string;
  album?: string | null;
}): Promise<YtmTrackHit | null> {
  const artist = options.artist.trim();
  const title = options.title.trim();
  const album = options.album?.trim() || null;
  if (!artist || !title) return null;

  try {
    // 1) Named album → browse its tracklist (works for Music Premium ATVs).
    if (album) {
      const albumBrowseId = await findAlbumBrowseId(artist, album);
      if (albumBrowseId) {
        const fromAlbum = await browseAlbumForTrack(albumBrowseId, title, artist);
        if (fromAlbum) return fromAlbum;
      }
    }

    // 2) Album search by artist + title (surfaces the parent album even when
    //    the song itself is Premium-hidden from song search).
    const viaAlbumSearch = await findTrackViaAlbumSearch(artist, title);
    if (viaAlbumSearch) return viaAlbumSearch;

    // 3) Scan the artist discography shelves.
    const viaArtist = await findTrackViaArtistAlbums(artist, title, album);
    if (viaArtist) return viaArtist;

    // 4) Last resort: catalog song search (non-Premium indexed tracks).
    return await searchSongsCatalog(artist, title);
  } catch (err) {
    console.warn("YouTube Music catalog search failed:", err);
  }

  return null;
}
