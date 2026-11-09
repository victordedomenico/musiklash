import { DEFAULT_TIERS, type TierConfig } from "./tierlist-tiers";

type Ballot = { tierId: string | null };

export function resolveTierlistBallots(ballots: Ballot[], tiers: TierConfig[] = DEFAULT_TIERS) {
  const votesByTier = Object.fromEntries(tiers.map((tier) => [tier.id, 0]));
  let skippedCount = 0;
  for (const ballot of ballots) {
    if (ballot.tierId === null) skippedCount += 1;
    else if (Object.hasOwn(votesByTier, ballot.tierId)) votesByTier[ballot.tierId]! += 1;
  }
  const counts = tiers.map((tier) => votesByTier[tier.id] ?? 0);
  const totalVotes = counts.reduce((sum, count) => sum + count, 0);
  if (totalVotes === 0) return { tierId: null, votesByTier, skippedCount, tie: false };
  const weightedSum = counts.reduce((sum, count, index) => sum + count * index, 0);
  // A half-way average goes to the higher row (the lower index).
  const index = Math.ceil(weightedSum / totalVotes - 0.5);
  const topVotes = Math.max(...counts);
  return {
    tierId: tiers[index]!.id,
    votesByTier,
    skippedCount,
    tie: counts.filter((count) => count === topVotes).length > 1,
  };
}

/** Keep the current vote unless its track was removed. */
export function planTierlistRoomTrackEdit(
  status: "waiting" | "playing" | "finished",
  placements: Record<string, string>,
  activePositions: number[],
  firstAddedPosition: number | undefined,
  currentPosition: number,
  resume?: { position: number; finished: boolean },
) {
  const ordered = [...activePositions].sort((a, b) => a - b);
  const active = new Set(ordered);
  const keptPlacements = Object.fromEntries(
    Object.entries(placements).filter(([position]) => active.has(Number(position))),
  );
  const nextAfterResume = resume
    ? resume.finished
      ? firstAddedPosition
      : ordered.find((position) => position >= resume.position)
    : undefined;
  const adjustedResume = resume
    ? nextAfterResume === undefined
      ? { position: resume.position, finished: true }
      : { position: nextAfterResume, finished: false }
    : undefined;

  let nextStatus: "waiting" | "playing" | "finished" = status;
  let nextPosition = currentPosition;
  let resetVote = false;
  if (status === "finished" && firstAddedPosition !== undefined) {
    nextStatus = "playing";
    nextPosition = firstAddedPosition;
    resetVote = true;
  } else if (status === "playing" && !active.has(currentPosition)) {
    const next = resume ? nextAfterResume : ordered.find((position) => position > currentPosition);
    nextStatus = next === undefined ? "finished" : "playing";
    nextPosition = next ?? currentPosition;
    resetVote = true;
  }
  return {
    placements: keptPlacements,
    status: nextStatus,
    currentPosition: nextPosition,
    resetVote,
    resume: status === "playing" && !resetVote ? adjustedResume : undefined,
  };
}
