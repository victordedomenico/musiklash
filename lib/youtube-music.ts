import { normalizeMusicText, significantTokensForMatch } from "./youtube-match";

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

type YtmTrackHit = {
  videoId: string;
  title: string;
  channelTitle: string;
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

function titleMatchesTrack(candidateTitle: string, trackTitle: string): boolean {
  const candidate = normalizeMusicText(candidateTitle);
  const tokens = significantTokensForMatch(trackTitle);
  if (!candidate || tokens.length === 0) return false;
  return tokens.every((token) => candidate.includes(token));
}

function albumNameMatches(candidateAlbum: string, album: string): boolean {
  const left = normalizeMusicText(candidateAlbum);
  const right = normalizeMusicText(album);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function extractArtistBrowseId(searchPayload: unknown, artist: string): string | null {
  const artistNorm = normalizeMusicText(artist);
  let fallback: string | null = null;
  walk(searchPayload, (node) => {
    const renderer = node.musicResponsiveListItemRenderer;
    if (!renderer || typeof renderer !== "object") return;
    const texts = flexTexts(renderer as Record<string, unknown>);
    const name = texts[0] || "";
    const browseId = (
      ((renderer as { navigationEndpoint?: { browseEndpoint?: { browseId?: string } } })
        .navigationEndpoint || {}).browseEndpoint || {}
    ).browseId;
    if (!browseId || !name) return;
    if (normalizeMusicText(name) === artistNorm) {
      fallback = browseId;
    }
  });
  return fallback;
}

function extractAlbums(
  payload: unknown,
): Array<{ name: string; browseId: string }> {
  const albums: Array<{ name: string; browseId: string }> = [];
  const seen = new Set<string>();
  walk(payload, (node) => {
    const renderer = node.musicTwoRowItemRenderer;
    if (!renderer || typeof renderer !== "object") return;
    const title = runsText(
      ((renderer as { title?: { runs?: unknown } }).title || {}).runs,
    );
    const browseId = (
      ((renderer as { navigationEndpoint?: { browseEndpoint?: { browseId?: string } } })
        .navigationEndpoint || {}).browseEndpoint || {}
    ).browseId;
    if (!title || !browseId || seen.has(browseId)) return;
    seen.add(browseId);
    albums.push({ name: title, browseId });
  });
  // Album search list items
  walk(payload, (node) => {
    const renderer = node.musicResponsiveListItemRenderer;
    if (!renderer || typeof renderer !== "object") return;
    const texts = flexTexts(renderer as Record<string, unknown>);
    const browseId = (
      ((renderer as { navigationEndpoint?: { browseEndpoint?: { browseId?: string } } })
        .navigationEndpoint || {}).browseEndpoint || {}
    ).browseId;
    if (!browseId || !texts[0] || seen.has(browseId)) return;
    // Album browse ids typically start with MPRE
    if (!browseId.startsWith("MPRE") && !browseId.startsWith("MPRL")) return;
    seen.add(browseId);
    albums.push({ name: texts[0], browseId });
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
    if (!titleMatchesTrack(title, trackTitle)) return;
    hit = {
      videoId,
      title,
      channelTitle: `${artist} - Topic`,
    };
  });
  return hit;
}

async function findAlbumBrowseId(artist: string, album: string): Promise<string | null> {
  const query = `${artist} ${album}`.trim();
  const search = await ytmPost<unknown>("search", {
    query,
    params: ALBUMS_FILTER,
  });
  const albums = extractAlbums(search);
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

/**
 * Resolve official Topic / YouTube Music catalog audio for a track.
 * Uses album metadata when available (e.g. PNL "Ryuk" on Deux frères).
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
    if (album) {
      const albumBrowseId = await findAlbumBrowseId(artist, album);
      if (albumBrowseId) {
        const albumPage = await ytmPost<unknown>("browse", { browseId: albumBrowseId });
        const fromAlbum = extractTracksFromAlbum(albumPage, title, artist);
        if (fromAlbum) return fromAlbum;
      }
    }

    // Artist page: scan visible albums for the track title.
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

    for (const entry of prioritized.slice(0, 8)) {
      const albumPage = await ytmPost<unknown>("browse", { browseId: entry.browseId });
      const hit = extractTracksFromAlbum(albumPage, title, artist);
      if (hit) return hit;
    }
  } catch (err) {
    console.warn("YouTube Music catalog search failed:", err);
  }

  return null;
}
