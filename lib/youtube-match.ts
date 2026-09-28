const FAKE_TITLE_RE =
  /\b(remix|nightcore|slowed|reverb|sped\s*up|8d|cover|karaoke|piano|instrumental|instru|mashup|bootleg|edit|tribute|type\s*beat|lofi)\b/i;

const PROMO_TITLE_TOKENS = new Set([
  "booska",
  "freestyle",
  "official",
  "officiel",
  "audio",
  "video",
  "clip",
  "lyrics",
  "paroles",
  "lyric",
  "music",
  "hd",
  "hq",
]);

export function normalizeMusicText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Keep digits (tenue 2 / motard 3) — they distinguish series tracks. */
export function significantTokensForMatch(value: string): string[] {
  return normalizeMusicText(value)
    .split(" ")
    .filter((token) => {
      if (!token) return false;
      if (/^\d+$/.test(token)) return true;
      return token.length > 1 && !["feat", "ft", "the", "and", "vs", "de", "du", "la", "le", "les"].includes(token);
    });
}

/** Strip compilation / freestyle promo words that Deezer often prefixes. */
export function stripPromoTitleNoise(title: string): string {
  const tokens = normalizeMusicText(title)
    .split(" ")
    .filter((token) => token && !PROMO_TITLE_TOKENS.has(token));
  return tokens.join(" ").trim();
}

/**
 * Alternate titles to search when Deezer naming differs from YouTube
 * (e.g. "Booska tenue 2 motard 3" → "tenue de motard 3").
 */
export function titleSearchVariants(title: string): string[] {
  const raw = title.trim();
  if (!raw) return [];

  const withoutPromo = stripPromoTitleNoise(raw);
  const tenueMotard = withoutPromo.replace(/\btenue\s+\d+\s+motard\s+(\d+)\b/i, "tenue de motard $1");
  // Drop lone middle digits but keep a trailing episode number when present.
  const tokens = withoutPromo.split(" ").filter(Boolean);
  const withoutMiddleDigits = tokens
    .filter((token, index) => !( /^\d+$/.test(token) && index < tokens.length - 1))
    .join(" ");

  const variants = [raw, withoutPromo, tenueMotard, withoutMiddleDigits]
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return [...new Set(variants)];
}

export function titleLooksFake(videoTitle: string, trackTitle: string): boolean {
  const normalizedVideo = normalizeMusicText(videoTitle);
  const normalizedTrack = normalizeMusicText(trackTitle);
  return FAKE_TITLE_RE.test(normalizedVideo) && !FAKE_TITLE_RE.test(normalizedTrack);
}

/** Share of significant track tokens found in the video title (promo words ignored). */
export function titleMatchRatio(videoTitle: string, trackTitle: string): number {
  const video = normalizeMusicText(videoTitle);
  const tokens = significantTokensForMatch(stripPromoTitleNoise(trackTitle));
  if (!video || tokens.length === 0) return 0;
  const matched = tokens.filter((token) => video.includes(token)).length;
  return matched / tokens.length;
}

/** Last digit in the cleaned title — usually the freestyle / series episode. */
export function trailingEpisodeNumber(title: string): string | null {
  const digits = significantTokensForMatch(stripPromoTitleNoise(title)).filter((token) =>
    /^\d+$/.test(token),
  );
  return digits.length > 0 ? digits[digits.length - 1]! : null;
}

export function titleContainsTrack(videoTitle: string, trackTitle: string): boolean {
  const video = normalizeMusicText(videoTitle);
  const episode = trailingEpisodeNumber(trackTitle);
  // Deezer sometimes inserts a middle digit ("tenue 2 motard 3") that is not on
  // YouTube ("Tenue De Motard 3"). Still require the final episode number.
  if (episode) {
    const videoTokens = new Set(video.split(" ").filter(Boolean));
    if (!videoTokens.has(episode)) return false;
  }
  // Allow one missing non-episode token while rejecting weak matches.
  return titleMatchRatio(videoTitle, trackTitle) >= 0.75;
}

export function channelMatchesArtist(channelTitle: string, artist: string): boolean {
  const channel = normalizeMusicText(channelTitle);
  const artistNorm = normalizeMusicText(artist);
  if (!channel || !artistNorm) return false;
  if (channel === artistNorm) return true;
  if (channel === `${artistNorm} topic` || channel === `${artistNorm} vevo`) return true;
  if (channel.startsWith(`${artistNorm} `) && (channel.includes("topic") || channel.endsWith("vevo"))) {
    return true;
  }
  if (channel.replace(/\s/g, "") === `${artistNorm.replace(/\s/g, "")}vevo`) return true;
  return false;
}

export function channelIncludesArtist(channelTitle: string, artist: string): boolean {
  const channel = normalizeMusicText(channelTitle);
  const artistNorm = normalizeMusicText(artist);
  return Boolean(channel && artistNorm && channel.includes(artistNorm));
}

export function isTopicChannel(channelTitle: string): boolean {
  return normalizeMusicText(channelTitle).includes("topic");
}

export function isVevoChannel(channelTitle: string): boolean {
  const channel = normalizeMusicText(channelTitle);
  return channel.includes("vevo") || channel.endsWith("vevo");
}
