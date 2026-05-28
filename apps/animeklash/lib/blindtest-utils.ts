/** Comparaisons de chaînes pour openings/endings et titres d'animé (blindtest). */

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCorrect(guess: string, truth: string): boolean {
  const g = normalize(guess);
  const t = normalize(truth);
  if (!g) return false;
  return t.includes(g) || g.includes(t);
}

/** True si tous les extraits partagent le même titre d'animé (champ `artist` en base). */
export function isSingleArtistBlindtest(tracks: { artist: string }[]): boolean {
  if (tracks.length === 0) return false;
  const ref = normalize(tracks[0].artist);
  return tracks.every((t) => normalize(t.artist) === ref);
}
