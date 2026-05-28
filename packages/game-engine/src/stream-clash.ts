// `rank` is a popularity score (0 to ~1_000_000 for Deezer, or AniList `popularity`).
// Each difficulty level caps the allowed rank difference between the two items.

export const DIFFICULTY_THRESHOLDS: Record<StreamClashDifficulty, number | null> = {
  easy: null,
  normal: 500_000,
  hard: 100_000,
};

export type StreamClashDifficulty = "easy" | "normal" | "hard";

export type StreamClashItemData = {
  position: number;
  externalId: string;
  title: string;
  subtitle: string;
  previewUrl: string;
  coverUrl: string | null;
  rank: number;
};

export type StreamClashPair = {
  itemA: StreamClashItemData;
  itemB: StreamClashItemData;
};

export type StreamClashRound = {
  positionA: number;
  positionB: number;
  rankA: number;
  rankB: number;
  correct: boolean;
  chosenPosition: number;
};

export type StreamClashParticipant = {
  playerId: string;
  username: string;
  score: number;
  rounds: StreamClashRound[];
  lastSeenAt: string | null;
  joinedAt: string;
};

export function generatePairs(
  items: StreamClashItemData[],
  difficulty: StreamClashDifficulty,
  count: number,
): StreamClashPair[] {
  const threshold = DIFFICULTY_THRESHOLDS[difficulty];
  const ranked = items.map((t, index) => ({
    ...t,
    rank: t.rank > 0 ? t.rank : Math.max(1, 100_000 - index * 1_000),
  }));

  const candidates: StreamClashPair[] = [];

  for (let i = 0; i < ranked.length; i++) {
    for (let j = i + 1; j < ranked.length; j++) {
      const a = ranked[i]!;
      const b = ranked[j]!;
      const diff = Math.abs(a.rank - b.rank);
      if (threshold === null || diff <= threshold) {
        candidates.push({ itemA: a, itemB: b });
      }
    }
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = candidates[i]!;
    candidates[i] = candidates[j]!;
    candidates[j] = tmp;
  }

  return candidates.slice(0, count);
}

export function checkAnswer(pair: StreamClashPair, chosenPosition: number): boolean {
  const chosen = chosenPosition === pair.itemA.position ? pair.itemA : pair.itemB;
  const other = chosenPosition === pair.itemA.position ? pair.itemB : pair.itemA;
  return chosen.rank >= other.rank;
}

export const POINTS_PER_CORRECT = 100;

export function computeWinner(participants: StreamClashParticipant[]): string | null {
  if (participants.length === 0) return null;
  let max = -1;
  let winners: StreamClashParticipant[] = [];
  for (const p of participants) {
    if (p.score > max) {
      max = p.score;
      winners = [p];
    } else if (p.score === max) {
      winners.push(p);
    }
  }
  return winners.length === 1 ? winners[0]!.playerId : null;
}

export function normalizeParticipants(value: unknown): StreamClashParticipant[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
    .map((p) => ({
      playerId: typeof p.playerId === "string" ? p.playerId : "",
      username: typeof p.username === "string" ? p.username : "Joueur",
      score: typeof p.score === "number" ? p.score : 0,
      rounds: Array.isArray(p.rounds) ? (p.rounds as StreamClashRound[]) : [],
      lastSeenAt: typeof p.lastSeenAt === "string" ? p.lastSeenAt : null,
      joinedAt: typeof p.joinedAt === "string" ? p.joinedAt : new Date().toISOString(),
    }))
    .filter((p) => p.playerId.length > 0);
}

export function findParticipant(
  participants: StreamClashParticipant[],
  playerId: string,
): StreamClashParticipant | null {
  return participants.find((p) => p.playerId === playerId) ?? null;
}

export function formatRank(rank: number): string {
  if (rank >= 1_000_000) return `${(rank / 1_000_000).toFixed(1)}M`;
  if (rank >= 1_000) return `${(rank / 1_000).toFixed(0)}K`;
  return String(rank);
}
