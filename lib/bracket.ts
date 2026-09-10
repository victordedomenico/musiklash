export type BracketSize = number;

// `size` and each track seed are stored as PostgreSQL SMALLINT values.
export const MAX_BRACKET_TRACKS = 32_767;
const LEGACY_BRACKET_SIZES = [4, 8, 16, 32, 64, 128, 256, 512, 1024] as const;

export type Pairing = {
  matchIndex: number;
  seedA: number;
  seedB: number;
};

export type Vote = {
  round: number;
  matchIndex: number;
  winnerSeed: number;
};

export function isValidSize(size: number): size is BracketSize {
  return Number.isInteger(size) && size >= 3 && size <= MAX_BRACKET_TRACKS;
}

export function totalRounds(size: BracketSize): number {
  return Math.ceil(Math.log2(size));
}

/**
 * Returns a new randomized ordering without changing the source array.
 * The resulting order is stored as the bracket's seeds, so one tournament
 * keeps the same draw while later rounds still follow their bracket paths.
 */
export function shuffle<T>(values: readonly T[], random: () => number = Math.random): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Standard tournament seeding for a round of N seeds.
 * generateSeedOrder(4)  -> [1, 4, 2, 3]
 * generateSeedOrder(8)  -> [1, 8, 4, 5, 2, 7, 3, 6]
 * generateSeedOrder(16) -> classic NCAA-style bracket ordering
 * Used by legacy brackets created before dynamic draws.
 */
export function generateSeedOrder(size: BracketSize): number[] {
  if (!(LEGACY_BRACKET_SIZES as readonly number[]).includes(size)) {
    throw new Error("Legacy brackets must use a supported power-of-two size");
  }
  let order: number[] = [1, 2];
  let step = 2;
  while (step < size) {
    step *= 2;
    const next: number[] = [];
    for (const s of order) {
      next.push(s, step + 1 - s);
    }
    order = next;
  }
  return order;
}

export function firstRoundPairings(size: BracketSize): Pairing[] {
  const order = generateSeedOrder(size);
  const pairings: Pairing[] = [];
  for (let i = 0; i < order.length; i += 2) {
    pairings.push({
      matchIndex: i / 2,
      seedA: order[i],
      seedB: order[i + 1],
    });
  }
  return pairings;
}

/**
 * Given the winners of round N (ordered by match index), produce the pairings of round N+1.
 */
export function nextRoundPairings(winnerSeeds: number[]): Pairing[] {
  if (winnerSeeds.length % 2 !== 0) {
    throw new Error("Round must have an even number of winners");
  }
  const pairings: Pairing[] = [];
  for (let i = 0; i < winnerSeeds.length; i += 2) {
    pairings.push({
      matchIndex: i / 2,
      seedA: winnerSeeds[i],
      seedB: winnerSeeds[i + 1],
    });
  }
  return pairings;
}

function dynamicRoundPairings(seeds: number[], byeSeed: number): Pairing[] {
  const pairings: Pairing[] = [];
  for (let i = 0; i + 1 < seeds.length; i += 2) {
    pairings.push({
      matchIndex: pairings.length,
      seedA: seeds[i]!,
      seedB: seeds[i + 1]!,
    });
  }
  if (seeds.length % 2 === 1) {
    pairings.push({
      matchIndex: pairings.length,
      seedA: seeds.at(-1)!,
      seedB: byeSeed,
    });
  }
  return pairings;
}

function buildDynamicBracketState(
  trackCount: number,
  votes: Vote[],
): { rounds: Pairing[][]; winner: number | null } {
  const byeSeed = trackCount + 1;
  const rounds: Pairing[][] = [
    dynamicRoundPairings(
      Array.from({ length: trackCount }, (_, index) => index + 1),
      byeSeed,
    ),
  ];

  for (let round = 1; ; round += 1) {
    const winners: number[] = [];
    for (const pairing of rounds.at(-1)!) {
      if (pairing.seedB === byeSeed) {
        winners.push(pairing.seedA);
        continue;
      }
      const vote = votes.find(
        (candidate) => candidate.round === round && candidate.matchIndex === pairing.matchIndex,
      );
      if (!vote) return { rounds, winner: null };
      winners.push(vote.winnerSeed);
    }
    if (winners.length === 1) return { rounds, winner: winners[0]! };
    rounds.push(dynamicRoundPairings(winners, byeSeed));
  }
}

/**
 * Returns the full list of pairings for every round given a vote history.
 * Useful to render progress so far or resume a game.
 *
 * @param size        - The bracket size (must be a BracketSize).
 * @param votes       - All votes cast so far.
 * @param trackCount  - Actual number of tracks (defaults to `size`).
 *                      When trackCount < size, seeds > trackCount are "byes":
 *                      their opponent auto-advances without needing a vote.
 * @param drawVersion - 1 is the historic fixed power-of-two tree; 2 uses a
 *                      dynamic tree and gives one randomized bye whenever a
 *                      round has an odd number of remaining tracks.
 */
export function buildBracketState(
  size: BracketSize,
  votes: Vote[],
  trackCount: number = size,
  drawVersion = 1,
): {
  rounds: Pairing[][];
  winner: number | null;
} {
  if (drawVersion === 2) return buildDynamicBracketState(trackCount, votes);

  const total = totalRounds(size);
  const rounds: Pairing[][] = [firstRoundPairings(size)];

  for (let r = 1; r <= total; r++) {
    const pairings = rounds[r - 1];
    const winners: number[] = [];
    for (const p of pairings) {
      // Bye: seedB doesn't exist → seedA advances automatically.
      // In standard seeding seedA < seedB, so only seedB can ever be a bye slot.
      if (p.seedB > trackCount) {
        winners.push(p.seedA);
        continue;
      }
      const v = votes.find((x) => x.round === r && x.matchIndex === p.matchIndex);
      if (!v) {
        return { rounds, winner: null };
      }
      winners.push(v.winnerSeed);
    }
    if (winners.length === 1) {
      return { rounds, winner: winners[0] };
    }
    rounds.push(nextRoundPairings(winners));
  }
  return { rounds, winner: null };
}
