const FAKE_TITLE_RE =
  /\b(remix|nightcore|slowed|reverb|sped\s*up|8d|cover|karaoke|piano|instrumental|instru|mashup|bootleg|edit|tribute|type\s*beat|lofi)\b/i;

export function normalizeMusicText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function significantTokensForMatch(value: string): string[] {
  return normalizeMusicText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !["feat", "ft", "the", "and", "vs"].includes(token));
}

export function titleLooksFake(videoTitle: string, trackTitle: string): boolean {
  const normalizedVideo = normalizeMusicText(videoTitle);
  const normalizedTrack = normalizeMusicText(trackTitle);
  return FAKE_TITLE_RE.test(normalizedVideo) && !FAKE_TITLE_RE.test(normalizedTrack);
}

export function titleContainsTrack(videoTitle: string, trackTitle: string): boolean {
  const video = normalizeMusicText(videoTitle);
  const tokens = significantTokensForMatch(trackTitle);
  if (tokens.length === 0) return false;
  return tokens.every((token) => video.includes(token));
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
