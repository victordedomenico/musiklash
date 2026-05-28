import type { BattleFeatParticipant, FeatMove } from "./types";

export function normalizeMoves(moves: unknown): FeatMove[] {
  return Array.isArray(moves) ? (moves as FeatMove[]) : [];
}

export function normalizeUsedArtistIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export function normalizeBattleFeatParticipants(value: unknown): BattleFeatParticipant[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
    .map((p, i) => ({
      playerId: typeof p.playerId === "string" ? p.playerId : "",
      username: typeof p.username === "string" ? p.username : "Joueur",
      score: typeof p.score === "number" ? p.score : 0,
      jokers: typeof p.jokers === "number" ? p.jokers : 1,
      eliminated: typeof p.eliminated === "boolean" ? p.eliminated : false,
      position: typeof p.position === "number" ? p.position : i,
      lastSeenAt: typeof p.lastSeenAt === "string" ? p.lastSeenAt : null,
      joinedAt: typeof p.joinedAt === "string" ? p.joinedAt : new Date().toISOString(),
    }))
    .filter((p) => p.playerId.length > 0)
    .sort((a, b) => a.position - b.position);
}

export function findBattleFeatParticipant(
  participants: BattleFeatParticipant[],
  playerId: string,
): BattleFeatParticipant | null {
  return participants.find((p) => p.playerId === playerId) ?? null;
}

export function nextActiveParticipant(
  participants: BattleFeatParticipant[],
  currentPlayerId: string,
): BattleFeatParticipant | null {
  const active = participants.filter((p) => !p.eliminated);
  if (active.length === 0) return null;
  if (active.length === 1) return active[0];
  const idx = active.findIndex((p) => p.playerId === currentPlayerId);
  if (idx === -1) return active[0];
  return active[(idx + 1) % active.length];
}

export function canClaimTurnTimeout(updatedAt: Date, turnSeconds: number, toleranceSeconds = 2) {
  const elapsedMs = Date.now() - updatedAt.getTime();
  return elapsedMs >= Math.max(0, turnSeconds - toleranceSeconds) * 1000;
}
