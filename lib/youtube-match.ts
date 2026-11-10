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
      return (
        token.length > 1 &&
        !["feat", "ft", "the", "and", "vs", "de", "du", "la", "le", "les"].includes(token)
      );
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
  const tenueMotard = withoutPromo.replace(
    /\btenue\s+\d+\s+motard\s+(\d+)\b/i,
    "tenue de motard $1",
  );
  // Drop lone middle digits but keep a trailing episode number when present.
  const tokens = withoutPromo.split(" ").filter(Boolean);
  const withoutMiddleDigits = tokens
    .filter((token, index) => !(/^\d+$/.test(token) && index < tokens.length - 1))
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

/** Share of significant track tokens found as whole words in the video title. */
export function titleMatchRatio(videoTitle: string, trackTitle: string): number {
  const videoCounts = countTokens(significantTokensForMatch(stripPromoTitleNoise(videoTitle)));
  const tokens = significantTokensForMatch(stripPromoTitleNoise(trackTitle));
  if (tokens.length === 0) return 0;
  // Repeated words count: "En vrai" must not fully match "En Vrai de Vrai".
  let matched = 0;
  for (const token of tokens) {
    const left = videoCounts.get(token) ?? 0;
    if (left > 0) {
      matched += 1;
      videoCounts.set(token, left - 1);
    }
  }
  return matched / tokens.length;
}

function countTokens(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  return counts;
}

/** Last digit in the cleaned title — usually the freestyle / series episode. */
export function trailingEpisodeNumber(title: string): string | null {
  const digits = significantTokensForMatch(stripPromoTitleNoise(title)).filter((token) =>
    /^\d+$/.test(token),
  );
  return digits.length > 0 ? digits[digits.length - 1]! : null;
}

/**
 * True when the video title really is this track.
 * Uses whole-word tokens (so "Mama" ≠ "Pacha Mama") and, for single-word
 * titles, requires an exact core match after stripping artist / promo noise.
 */
export function titleContainsTrack(
  videoTitle: string,
  trackTitle: string,
  artist?: string | null,
): boolean {
  const trackTokens = significantTokensForMatch(stripPromoTitleNoise(trackTitle));
  if (trackTokens.length === 0) return false;

  const videoTokens = significantTokensForMatch(stripPromoTitleNoise(videoTitle));
  const videoSet = new Set(videoTokens);
  const wordTokens = trackTokens.filter((token) => !/^\d+$/.test(token));
  const episode = trailingEpisodeNumber(trackTitle);

  // Deezer sometimes inserts a middle digit ("tenue 2 motard 3") that is not on
  // YouTube ("Tenue De Motard 3"). Still require the final episode number.
  if (episode && !videoSet.has(episode)) return false;
  // Non-digit words must appear as whole tokens (not substrings).
  if (wordTokens.length === 0) return Boolean(episode && videoSet.has(episode));
  if (!wordTokens.every((token) => videoSet.has(token))) return false;
  // A word repeated in the track title ("En Vrai de Vrai") must be repeated in the video too.
  const videoWordCounts = countTokens(videoTokens);
  for (const [token, needed] of countTokens(wordTokens)) {
    if ((videoWordCounts.get(token) ?? 0) < needed) return false;
  }

  // Compare both sides: a title containing every requested word may still be a
  // different song ("J'veux plus les voir" vs "J'veux plus"). Remove the
  // artist prefix and featured-artist credit before checking for extra words.
  let coreTitle = normalizeMusicText(videoTitle);
  const artistPrefixes = [
    normalizeMusicText(artist ?? ""),
    normalizeMusicText((artist ?? "").replace(/&/g, " et ")),
  ];
  const artistPrefix = artistPrefixes.find(
    (prefix) => prefix && coreTitle.startsWith(`${prefix} `),
  );
  if (artistPrefix) coreTitle = coreTitle.slice(artistPrefix.length).trim();
  coreTitle = coreTitle.replace(/\b(?:feat|ft)\b.*$/, "");
  const coreWords = significantTokensForMatch(stripPromoTitleNoise(coreTitle)).filter(
    (token) => !/^\d+$/.test(token),
  );
  const requestedCounts = countTokens(wordTokens);
  const coreCounts = countTokens(coreWords);
  if (coreCounts.size !== requestedCounts.size) return false;
  for (const [token, count] of requestedCounts) {
    if (coreCounts.get(token) !== count) return false;
  }

  // Allow an omitted middle digit in Deezer's freestyle naming, but reject
  // additional episode numbers in a different YouTube title.
  const trackDigits = trackTokens.filter((token) => /^\d+$/.test(token));
  const videoDigits = significantTokensForMatch(coreTitle).filter((token) => /^\d+$/.test(token));
  return videoDigits.every((digit) => trackDigits.includes(digit));
}

export function channelMatchesArtist(channelTitle: string, artist: string): boolean {
  const channel = normalizeMusicText(channelTitle);
  const artistNorm = normalizeMusicText(artist);
  if (!channel || !artistNorm) return false;
  if (channel === artistNorm) return true;
  if (channel === `${artistNorm} topic` || channel === `${artistNorm} vevo`) return true;
  if (
    channel === `${artistNorm} officiel` ||
    channel === `${artistNorm} official` ||
    channel === `${artistNorm} vevo`
  ) {
    return true;
  }
  if (
    channel.startsWith(`${artistNorm} `) &&
    (channel.includes("topic") ||
      channel.endsWith("vevo") ||
      channel.includes("officiel") ||
      channel.includes("official"))
  ) {
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
