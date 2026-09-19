import { DEFAULT_TIERS } from "./tierlist-tiers";

type Ballot = { tierId: string | null };

export function resolveTierlistBallots(ballots: Ballot[], random: () => number = Math.random) {
  const votesByTier = Object.fromEntries(DEFAULT_TIERS.map((tier) => [tier.id, 0]));
  let skippedCount = 0;

  for (const ballot of ballots) {
    if (ballot.tierId === null) {
      skippedCount += 1;
      continue;
    }
    if (ballot.tierId in votesByTier) votesByTier[ballot.tierId]! += 1;
  }

  const topVotes = Math.max(...Object.values(votesByTier));
  const tiedTierIds = Object.entries(votesByTier)
    .filter(([, votes]) => votes === topVotes)
    .map(([tierId]) => tierId);

  if (tiedTierIds.length === 1) {
    return {
      tierId: tiedTierIds[0]!,
      votesByTier,
      skippedCount,
      tie: false,
      coinSide: null,
      pileTierId: null,
      faceTierId: null,
    };
  }

  const pileIndex = Math.floor(random() * tiedTierIds.length);
  const pileTierId = tiedTierIds[pileIndex]!;
  const faceCandidates = tiedTierIds.filter((tierId) => tierId !== pileTierId);
  const faceTierId = faceCandidates[Math.floor(random() * faceCandidates.length)]!;
  const coinSide = random() < 0.5 ? ("pile" as const) : ("face" as const);

  return {
    tierId: coinSide === "pile" ? pileTierId : faceTierId,
    votesByTier,
    skippedCount,
    tie: true,
    coinSide,
    pileTierId,
    faceTierId,
  };
}
