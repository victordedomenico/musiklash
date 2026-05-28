export type BracketSize = 4 | 8 | 16 | 32 | 64 | 128;

export const VALID_BRACKET_SIZES = [4, 8, 16, 32, 64, 128] as const;

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
  return (VALID_BRACKET_SIZES as readonly number[]).includes(size);
}

export function totalRounds(size: BracketSize): number {
  return Math.log2(size);
}

/**
 * Returns the smallest valid BracketSize that can hold `trackCount` participants.
 * e.g. effectiveBracketSize(6) → 8, effectiveBracketSize(9) → 16
 */
export function effectiveBracketSize(trackCount: number): BracketSize {
  return VALID_BRACKET_SIZES.find((s) => s >= trackCount) ?? 128;
}

/**
 * Standard tournament seeding for a round of N seeds.
 * generateSeedOrder(4)  -> [1, 4, 2, 3]
 * generateSeedOrder(8)  -> [1, 8, 4, 5, 2, 7, 3, 6]
 * generateSeedOrder(16) -> classic NCAA-style bracket ordering
 * Works for any power of 2 (4, 8, 16, 32, 64, 128).
 */
export function generateSeedOrder(size: BracketSize): number[] {
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

/**
 * Returns the full list of pairings for every round given a vote history.
 * Useful to render progress so far or resume a game.
 *
 * @param size        - The bracket size (must be a BracketSize).
 * @param votes       - All votes cast so far.
 * @param trackCount  - Actual number of tracks (defaults to `size`).
 *                      When trackCount < size, seeds > trackCount are "byes":
 *                      their opponent auto-advances without needing a vote.
 */
export function buildBracketState(
  size: BracketSize,
  votes: Vote[],
  trackCount: number = size,
): {
  rounds: Pairing[][];
  winner: number | null;
} {
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
      const v = votes.find(
        (x) => x.round === r && x.matchIndex === p.matchIndex,
      );
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
