export const FLASH_DIFFICULTIES = ["easy", "medium", "hard", "expert", "impossible"] as const;
export type FlashDifficulty = (typeof FLASH_DIFFICULTIES)[number];

export const FLASH_LISTEN_SECONDS = [0.1, 0.5, 2, 8, 15] as const;
export type FlashListenSeconds = (typeof FLASH_LISTEN_SECONDS)[number];

export const FLASH_TRACKS_PER_SESSION = FLASH_DIFFICULTIES.length;
export const FLASH_MAX_ATTEMPTS = FLASH_LISTEN_SECONDS.length;

export const FLASH_DIFFICULTY_CONFIG: Record<
  FlashDifficulty,
  { label: string; multiplier: number; color: string }
> = {
  easy: { label: "Easy", multiplier: 1, color: "#20df70" },
  medium: { label: "Medium", multiplier: 1.5, color: "#f4c542" },
  hard: { label: "Hard", multiplier: 2.5, color: "#f58a3a" },
  expert: { label: "Expert", multiplier: 4, color: "#f05a5f" },
  impossible: { label: "Impossible", multiplier: 6, color: "#ae76f7" },
};

export const FLASH_LISTEN_MULTIPLIERS: Record<FlashListenSeconds, number> = {
  0.1: 4,
  0.5: 2.5,
  2: 1.5,
  8: 0.8,
  15: 0.4,
};

export type FlashAnswer = {
  position: number;
  correct: boolean;
  skipped: boolean;
  points: number;
  difficulty?: FlashDifficulty;
  listenSeconds?: FlashListenSeconds;
};

export function flashListenTier(seconds: number): FlashListenSeconds {
  return (
    FLASH_LISTEN_SECONDS.find((limit) => seconds <= limit) ??
    FLASH_LISTEN_SECONDS[FLASH_LISTEN_SECONDS.length - 1]
  );
}

export function flashAttemptListenSeconds(attemptIndex: number): FlashListenSeconds {
  const clamped = Math.min(Math.max(attemptIndex, 0), FLASH_LISTEN_SECONDS.length - 1);
  return FLASH_LISTEN_SECONDS[clamped];
}

export function flashNextAttempt(attemptIndex: number): number | null {
  return attemptIndex + 1 < FLASH_LISTEN_SECONDS.length ? attemptIndex + 1 : null;
}

export function flashDifficultyAt(index: number): FlashDifficulty | undefined {
  return FLASH_DIFFICULTIES[index];
}

export function flashAnswerPoints(
  answer: FlashAnswer,
  difficulty: FlashDifficulty,
  listenSeconds: FlashListenSeconds,
) {
  return answer.correct
    ? flashPoints(answer.difficulty ?? difficulty, answer.listenSeconds ?? listenSeconds)
    : 0;
}

export function isFlashDifficulty(value: unknown): value is FlashDifficulty {
  return typeof value === "string" && FLASH_DIFFICULTIES.includes(value as FlashDifficulty);
}

export function isFlashListenSeconds(value: unknown): value is FlashListenSeconds {
  return typeof value === "number" && FLASH_LISTEN_SECONDS.includes(value as FlashListenSeconds);
}

export function flashPoints(
  difficulty: FlashDifficulty,
  listenSeconds: FlashListenSeconds,
): number {
  return Math.round(
    100 * FLASH_DIFFICULTY_CONFIG[difficulty].multiplier * FLASH_LISTEN_MULTIPLIERS[listenSeconds],
  );
}

export function flashPerfectScore(trackCount = FLASH_TRACKS_PER_SESSION): number {
  return FLASH_DIFFICULTIES.slice(0, trackCount).reduce(
    (total, difficulty) => total + flashPoints(difficulty, 0.1),
    0,
  );
}

/** One track per difficulty, most popular first (Easy → Impossible). */
export function assignFlashSessionTracks(
  tracks: readonly { position: number; rank: number }[],
  random: () => number = Math.random,
): number[] {
  if (tracks.length === 0) return [];
  const ranked = [...tracks].sort((a, b) => b.rank - a.rank || a.position - b.position);
  const count = Math.min(FLASH_TRACKS_PER_SESSION, ranked.length);
  if (count === ranked.length) return ranked.map((track) => track.position);

  const used = new Set<number>();
  const positions: number[] = [];
  for (let index = 0; index < count; index++) {
    const start = Math.floor((index * ranked.length) / count);
    const end = Math.max(start + 1, Math.floor(((index + 1) * ranked.length) / count));
    const bucket = ranked.slice(start, end).filter((track) => !used.has(track.position));
    const pool = bucket.length > 0 ? bucket : ranked.filter((track) => !used.has(track.position));
    const pick = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
    used.add(pick.position);
    positions.push(pick.position);
  }
  return positions;
}
