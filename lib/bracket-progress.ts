import { buildBracketState, type BracketSize, type Vote } from "./bracket";

const PROGRESS_VERSION = 1;
const STORAGE_PREFIX = "musiklash:bracket-progress";

type StoredBracketProgress = {
  version: number;
  bracketId: string;
  size: number;
  trackSignature: string;
  votes: unknown;
};

function isVote(value: unknown): value is Vote {
  if (!value || typeof value !== "object") return false;
  const vote = value as Record<string, unknown>;
  return (
    Number.isInteger(vote.round) &&
    Number.isInteger(vote.matchIndex) &&
    Number.isInteger(vote.winnerSeed)
  );
}

/**
 * A persisted draft is untrusted browser data. Rebuild the bracket one vote at
 * a time so an old or malformed draft can never create an impossible matchup.
 */
export function validateBracketProgress(
  size: BracketSize,
  trackCount: number,
  votes: unknown,
): Vote[] | null {
  if (!Array.isArray(votes) || !votes.every(isVote)) return null;

  const accepted: Vote[] = [];
  for (const vote of votes) {
    const state = buildBracketState(size, accepted, trackCount);
    if (state.winner) return null;

    const round = state.rounds.length;
    const pairing = state.rounds
      .at(-1)
      ?.find((candidate) => candidate.matchIndex === vote.matchIndex);
    const isRealMatch = pairing && pairing.seedB <= trackCount;
    const pickedParticipant =
      pairing && (vote.winnerSeed === pairing.seedA || vote.winnerSeed === pairing.seedB);

    if (vote.round !== round || !isRealMatch || !pickedParticipant) return null;
    accepted.push(vote);
  }

  return accepted;
}

export function bracketProgressStorageKey(bracketId: string) {
  return `${STORAGE_PREFIX}:v${PROGRESS_VERSION}:${bracketId}`;
}

export function makeTrackSignature(tracks: ReadonlyArray<{ seed: number; deezerTrackId: number }>) {
  return tracks.map((track) => `${track.seed}:${track.deezerTrackId}`).join(",");
}

export function readBracketProgress(
  raw: string | null,
  {
    bracketId,
    size,
    trackCount,
    trackSignature,
  }: {
    bracketId: string;
    size: BracketSize;
    trackCount: number;
    trackSignature: string;
  },
): Vote[] | null {
  if (!raw) return null;

  try {
    const saved = JSON.parse(raw) as StoredBracketProgress;
    if (
      saved.version !== PROGRESS_VERSION ||
      saved.bracketId !== bracketId ||
      saved.size !== size ||
      saved.trackSignature !== trackSignature
    ) {
      return null;
    }
    return validateBracketProgress(size, trackCount, saved.votes);
  } catch {
    return null;
  }
}

export function writeBracketProgress(
  storage: Pick<Storage, "setItem">,
  {
    bracketId,
    size,
    trackSignature,
    votes,
  }: {
    bracketId: string;
    size: BracketSize;
    trackSignature: string;
    votes: Vote[];
  },
) {
  storage.setItem(
    bracketProgressStorageKey(bracketId),
    JSON.stringify({
      version: PROGRESS_VERSION,
      bracketId,
      size,
      trackSignature,
      votes,
    }),
  );
}

export function clearBracketProgress(storage: Pick<Storage, "removeItem">, bracketId: string) {
  storage.removeItem(bracketProgressStorageKey(bracketId));
}
