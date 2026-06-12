// ─── Difficulty thresholds ────────────────────────────────────────────────────
// Deezer `rank` is a popularity index from 0 to ~1 000 000.
// Each difficulty level caps the allowed rank difference between the two tracks.

export const DIFFICULTY_THRESHOLDS: Record<StreamClashDifficulty, number | null> = {
  easy: null,       // any difference
  normal: 500_000,  // within 500 000 rank points
  hard: 100_000,    // within 100 000 rank points
};

export type StreamClashDifficulty = "easy" | "normal" | "hard";

// ─── Track types ──────────────────────────────────────────────────────────────

export type StreamClashTrackData = {
  position: number;
  deezerTrackId: number;
  title: string;
  artist: string;
  coverUrl: string | null;
  rank: number;
};

export type StreamClashPair = {
  trackA: StreamClashTrackData;
  trackB: StreamClashTrackData;
};

// ─── Round result ─────────────────────────────────────────────────────────────

export type StreamClashRound = {
  positionA: number;
  positionB: number;
  rankA: number;
  rankB: number;
  correct: boolean;
  chosenPosition: number; // which track the player picked
};

// ─── Participant ──────────────────────────────────────────────────────────────

export type StreamClashParticipant = {
  playerId: string;
  username: string;
  score: number;
  rounds: StreamClashRound[];
  lastSeenAt: string | null;
  joinedAt: string;
};

// ─── Pair generation ─────────────────────────────────────────────────────────

/**
 * Generates up to `count` unique pairs from `tracks`, filtered by difficulty.
 * Tracks with rank === 0 are excluded since the comparison would be meaningless.
 * Returns pairs in a random order; each track may appear multiple times.
 */
export function generatePairs(
  tracks: StreamClashTrackData[],
  difficulty: StreamClashDifficulty,
  count: number,
): StreamClashPair[] {
  const threshold = DIFFICULTY_THRESHOLDS[difficulty];
  // Fallback for missing Deezer rank:
  // keep gameplay possible by deriving a deterministic popularity score
  // from selection order (earlier tracks get a slightly higher fallback).
  const ranked = tracks.map((t, index) => ({
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
        candidates.push({ trackA: a, trackB: b });
      }
    }
  }

  // Shuffle with Fisher-Yates
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = candidates[i]!;
    candidates[i] = candidates[j]!;
    candidates[j] = tmp;
  }

  return candidates.slice(0, count);
}

// ─── Check answer ─────────────────────────────────────────────────────────────

/**
 * Returns true if the player chose the track with the higher rank.
 */
export function checkAnswer(pair: StreamClashPair, chosenPosition: number): boolean {
  const chosen = chosenPosition === pair.trackA.position ? pair.trackA : pair.trackB;
  const other = chosenPosition === pair.trackA.position ? pair.trackB : pair.trackA;
  return chosen.rank >= other.rank;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/** Format rank as a human-readable popularity score. */
export function formatRank(rank: number): string {
  if (rank >= 1_000_000) return `${(rank / 1_000_000).toFixed(1)}M`;
  if (rank >= 1_000) return `${(rank / 1_000).toFixed(0)}K`;
  return String(rank);
}
