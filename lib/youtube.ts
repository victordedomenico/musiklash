import { searchYoutubeMusicCatalog } from "./youtube-music";
import {
  channelIncludesArtist,
  channelMatchesArtist,
  isTopicChannel,
  isVevoChannel,
  normalizeMusicText,
  titleContainsTrack,
  titleLooksFake,
  titleMatchRatio,
  titleSearchVariants,
} from "./youtube-match";

export type YoutubeSearchResult = {
  videoId: string;
  title: string;
  channelTitle: string | null;
};

type YoutubeCandidate = {
  videoId: string;
  title: string;
  channelTitle: string;
  verified: boolean;
  views: number;
};

const memoryCache = new Map<string, YoutubeSearchResult | null>();
const CACHE_VERSION = "official-v5-episode";

export { normalizeMusicText, significantTokensForMatch, titleSearchVariants } from "./youtube-match";

function cacheKey(artist: string, title: string, album?: string | null): string {
  return `${CACHE_VERSION}::${artist.trim().toLowerCase()}::${title.trim().toLowerCase()}::${(album ?? "").trim().toLowerCase()}`;
}

function buildSearchQueries(artist: string, trackTitle: string): string[] {
  const queries: string[] = [];
  for (const variant of titleSearchVariants(trackTitle)) {
    queries.push(`"${artist}" "${variant}"`);
    queries.push(`${artist} ${variant} official`);
    queries.push(`${artist} ${variant}`);
  }
  return [...new Set(queries)];
}

/** Exported for unit tests — ranks official sources above fan uploads. */
export function scoreYoutubeCandidate(
  candidate: Omit<YoutubeCandidate, "videoId">,
  artist: string,
  trackTitle: string,
): number {
  if (!titleContainsTrack(candidate.title, trackTitle)) return -Infinity;
  if (titleLooksFake(candidate.title, trackTitle)) return -Infinity;

  const channel = candidate.channelTitle;
  const isArtistChannel = channelMatchesArtist(channel, artist);
  const includesArtist = channelIncludesArtist(channel, artist);
  const topic = isTopicChannel(channel) && includesArtist;
  const vevo = isVevoChannel(channel) && includesArtist;
  const ratio = titleMatchRatio(candidate.title, trackTitle);
  const titleNorm = normalizeMusicText(candidate.title);
  const officialMarker =
    /\b(official (video|audio|music video)|clip officiel|audio officiel|official lyric|lyric video|freestyle)\b/.test(
      titleNorm,
    ) || /\b(official|officiel)\b/.test(titleNorm);

  let score = 0;

  // Strong official sources only — unverified channels that steal the artist
  // name (e.g. "djadja & dinaz") must not clear the acceptance threshold.
  if (topic) score += 110;
  if (vevo) score += 105;
  if (candidate.verified && isArtistChannel) score += 120;
  if (candidate.verified && includesArtist && !isArtistChannel) score += 70;
  // Verified non-artist channels (e.g. Booska-P freestyles) when title is strong.
  if (candidate.verified && !isArtistChannel && officialMarker && ratio >= 0.75) score += 100;
  if (candidate.verified && ratio >= 0.9) score += 20;

  if (isArtistChannel && !candidate.verified && !topic && !vevo) score += 25;
  if (officialMarker) score += 5;
  if (ratio >= 1) score += 8;
  else if (ratio >= 0.85) score += 4;

  if (score >= 100) {
    score += Math.min(10, Math.log10(Math.max(candidate.views, 1)));
  }

  return score;
}

/** Accept only strong official matches — otherwise prefer Deezer preview. */
export function pickOfficialYoutubeMatch(
  candidates: YoutubeCandidate[],
  artist: string,
  trackTitle: string,
): YoutubeSearchResult | null {
  let best: { candidate: YoutubeCandidate; score: number } | null = null;

  for (const candidate of candidates) {
    const score = scoreYoutubeCandidate(candidate, artist, trackTitle);
    if (score < 100) continue;
    if (!best || score > best.score) best = { candidate, score };
  }

  if (!best) return null;
  return {
    videoId: best.candidate.videoId,
    title: best.candidate.title,
    channelTitle: best.candidate.channelTitle || null,
  };
}

function extractVideoId(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "https://www.youtube.com");
    const fromQuery = parsed.searchParams.get("v");
    if (fromQuery) return fromQuery;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] === "shorts" && parts[1]) return parts[1];
    return null;
  } catch {
    return null;
  }
}

async function searchWithYoutubeDataApi(
  artist: string,
  trackTitle: string,
  apiKey: string,
): Promise<YoutubeSearchResult | null> {
  const queries = buildSearchQueries(artist, trackTitle);

  const candidates: YoutubeCandidate[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "10");
    url.searchParams.set("videoEmbeddable", "true");
    url.searchParams.set("videoCategoryId", "10");
    url.searchParams.set("q", query);
    url.searchParams.set("key", apiKey);

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      console.warn("YouTube Data API search failed:", res.status);
      continue;
    }

    const json = (await res.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: { title?: string; channelTitle?: string };
      }>;
    };

    for (const item of json.items ?? []) {
      const videoId = item.id?.videoId?.trim();
      if (!videoId || seen.has(videoId)) continue;
      seen.add(videoId);
      candidates.push({
        videoId,
        title: item.snippet?.title?.trim() || query,
        channelTitle: item.snippet?.channelTitle?.trim() || "",
        verified: false,
        views: 0,
      });
    }
  }

  return pickOfficialYoutubeMatch(candidates, artist, trackTitle);
}

async function searchWithPiped(
  artist: string,
  trackTitle: string,
): Promise<YoutubeSearchResult | null> {
  const endpoints = [
    "https://api.piped.private.coffee",
    "https://pipedapi.reallyaweso.me",
    "https://pipedapi.kavin.rocks",
  ];
  const queries = buildSearchQueries(artist, trackTitle);

  for (const base of endpoints) {
    const candidates: YoutubeCandidate[] = [];
    const seen = new Set<string>();

    try {
      for (const query of queries) {
        const url = `${base}/search?q=${encodeURIComponent(query)}&filter=videos`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        });
        if (!res.ok) continue;

        const json = (await res.json()) as {
          items?: Array<{
            type?: string;
            url?: string;
            title?: string;
            uploaderName?: string;
            uploaderVerified?: boolean;
            views?: number;
          }>;
        };

        for (const entry of json.items ?? []) {
          if (entry.type && entry.type !== "stream" && entry.type !== "video") continue;
          const videoId = extractVideoId(entry.url);
          if (!videoId || seen.has(videoId)) continue;
          seen.add(videoId);
          candidates.push({
            videoId,
            title: entry.title?.trim() || query,
            channelTitle: entry.uploaderName?.trim() || "",
            verified: Boolean(entry.uploaderVerified),
            views: typeof entry.views === "number" ? entry.views : 0,
          });
        }
      }

      const picked = pickOfficialYoutubeMatch(candidates, artist, trackTitle);
      if (picked) return picked;
    } catch (err) {
      console.warn("Piped YouTube search failed:", base, err);
    }
  }

  return null;
}

export async function searchYoutubeVideo(
  artist: string,
  title: string,
  album?: string | null,
): Promise<YoutubeSearchResult | null> {
  const artistTrim = artist.trim();
  const titleTrim = title.trim();
  const albumTrim = album?.trim() || null;
  if (!artistTrim || !titleTrim) return null;

  const key = cacheKey(artistTrim, titleTrim, albumTrim);
  if (memoryCache.has(key)) return memoryCache.get(key) ?? null;

  const apiKey = process.env.YOUTUBE_API_KEY?.trim();

  let result: YoutubeSearchResult | null = null;
  try {
    // 1) YouTube Music catalog (Topic / album tracks) — finds official audio like PNL Ryuk
    const catalog = await searchYoutubeMusicCatalog({
      artist: artistTrim,
      title: titleTrim,
      album: albumTrim,
    });
    if (catalog) {
      result = {
        videoId: catalog.videoId,
        title: catalog.title,
        channelTitle: catalog.channelTitle,
      };
    } else {
      // 2) Official video channel / VEVO clips via search
      result = apiKey
        ? await searchWithYoutubeDataApi(artistTrim, titleTrim, apiKey)
        : await searchWithPiped(artistTrim, titleTrim);
    }
  } catch (err) {
    console.warn("YouTube search error:", err);
    result = null;
  }

  memoryCache.set(key, result);
  return result;
}
