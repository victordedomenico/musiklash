type PlayerBallot = { playerId: string };

export function replacePlayerBallot<T extends PlayerBallot>(ballots: T[], nextBallot: T): T[] {
  const index = ballots.findIndex((ballot) => ballot.playerId === nextBallot.playerId);
  if (index === -1) return [...ballots, nextBallot];
  return ballots.map((ballot, ballotIndex) => (ballotIndex === index ? nextBallot : ballot));
}

export function removePlayerBallot<T extends PlayerBallot>(ballots: T[], playerId: string): T[] {
  return ballots.filter((ballot) => ballot.playerId !== playerId);
}
