/** Comparaisons de chaînes pour titres / artistes (solo & multijoueur blindtest). */

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

/** True si tous les morceaux ont le même artiste (après normalisation). */
export function isSingleArtistBlindtest(tracks: { artist: string }[]): boolean {
  if (tracks.length === 0) return false;
  const ref = normalize(tracks[0].artist);
  return tracks.every((t) => normalize(t.artist) === ref);
}

// ─── Scoring basé sur la vitesse ──────────────────────────────────────────────
//
// Plus on répond vite, plus on marque de points. Une bonne réponse instantanée
// vaut le maximum ; au buzzer (fin du chrono) elle vaut encore SPEED_FLOOR du max.
// Une mauvaise réponse vaut 0.

export const TIMER_SECONDS = 30;
export const POINTS_TITLE_MAX = 1000;
export const POINTS_ARTIST_MAX = 500;
export const POINTS_PER_TRACK_MAX = POINTS_TITLE_MAX + POINTS_ARTIST_MAX;

/** Part minimale du score conservée pour une bonne réponse donnée au buzzer. */
const SPEED_FLOOR = 0.5;

/** Facteur de rapidité dans [SPEED_FLOOR, 1] selon le temps écoulé. */
export function speedFactor(elapsedMs: number, timerSeconds = TIMER_SECONDS): number {
  const ratio = Math.min(1, Math.max(0, elapsedMs / (timerSeconds * 1000)));
  return SPEED_FLOOR + (1 - SPEED_FLOOR) * (1 - ratio);
}

/**
 * Points maximum atteignables sur un morceau.
 * En mode artiste unique, l'artiste ne rapporte rien : seul le titre compte.
 */
export function maxTrackPoints(singleArtist: boolean): number {
  return singleArtist ? POINTS_TITLE_MAX : POINTS_PER_TRACK_MAX;
}

export type AnswerScore = {
  points: number;
  titlePoints: number;
  artistPoints: number;
};

/** Calcule les points d'une réponse (titre / artiste) en fonction de la vitesse. */
export function scoreAnswer(
  correctTitle: boolean,
  correctArtist: boolean,
  elapsedMs: number,
): AnswerScore {
  const factor = speedFactor(elapsedMs);
  const titlePoints = correctTitle ? Math.round(POINTS_TITLE_MAX * factor) : 0;
  const artistPoints = correctArtist ? Math.round(POINTS_ARTIST_MAX * factor) : 0;
  return { points: titlePoints + artistPoints, titlePoints, artistPoints };
}
