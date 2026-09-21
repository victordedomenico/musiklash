export const BRACKET_DUEL_SECONDS = 6 * 60;
export const BRACKET_ONE_MINUTE_WARNING_SECONDS = 60;

type Ballot = { winnerSeed: number | null };

export function resolveBracketBallots(
  ballots: Ballot[],
  seedA: number,
  seedB: number,
  random: () => number = Math.random,
) {
  const votesA = ballots.filter((ballot) => ballot.winnerSeed === seedA).length;
  const votesB = ballots.filter((ballot) => ballot.winnerSeed === seedB).length;
  const skippedCount = ballots.filter((ballot) => ballot.winnerSeed === null).length;

  if (votesA === votesB) {
    const coinSide = random() < 0.5 ? ("pile" as const) : ("face" as const);
    return {
      winnerSeed: coinSide === "pile" ? seedA : seedB,
      votesA,
      votesB,
      skippedCount,
      tie: true,
      coinSide,
    };
  }

  return {
    winnerSeed: votesA > votesB ? seedA : seedB,
    votesA,
    votesB,
    skippedCount,
    tie: false,
    coinSide: null,
  };
}

export function remainingDuelSeconds(
  duelStartedAt: string | Date | null,
  now: number = Date.now(),
) {
  if (!duelStartedAt) return BRACKET_DUEL_SECONDS;
  const startedAt = new Date(duelStartedAt).getTime();
  if (!Number.isFinite(startedAt)) return BRACKET_DUEL_SECONDS;
  return Math.max(0, Math.ceil((startedAt + BRACKET_DUEL_SECONDS * 1000 - now) / 1000));
}

export function crossedBracketWarningThreshold(previousTimeLeft: number | null, timeLeft: number) {
  return (
    previousTimeLeft !== null &&
    previousTimeLeft > BRACKET_ONE_MINUTE_WARNING_SECONDS &&
    timeLeft <= BRACKET_ONE_MINUTE_WARNING_SECONDS &&
    timeLeft > 0
  );
}
