export const FLASH_DIFFICULTIES = ["easy", "medium", "hard", "expert", "impossible"] as const;
export type FlashDifficulty = (typeof FLASH_DIFFICULTIES)[number];

export const FLASH_LISTEN_SECONDS = [0.1, 0.5, 2, 8] as const;
export type FlashListenSeconds = (typeof FLASH_LISTEN_SECONDS)[number];

export const FLASH_TRACK_COUNTS = [5, 10, 15, 20] as const;

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
};

export type FlashAnswer = {
  position: number;
  correct: boolean;
  skipped: boolean;
  points: number;
};

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

export function availableFlashTrackCounts(totalTracks: number): number[] {
  return FLASH_TRACK_COUNTS.filter((count) => count <= totalTracks);
}
