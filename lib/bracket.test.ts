import { describe, it, expect } from "vitest";
import {
  buildBracketState,
  firstRoundPairings,
  generateSeedOrder,
  nextRoundPairings,
  shuffle,
  totalRounds,
} from "./bracket";

describe("shuffle", () => {
  it("randomizes a copy without changing the supplied order", () => {
    const source = [1, 2, 3, 4];

    expect(shuffle(source, () => 0)).toEqual([2, 3, 4, 1]);
    expect(source).toEqual([1, 2, 3, 4]);
  });
});

describe("generateSeedOrder", () => {
  it("returns [1,4,2,3] for size 4", () => {
    expect(generateSeedOrder(4)).toEqual([1, 4, 2, 3]);
  });

  it("returns classic ordering for size 8", () => {
    expect(generateSeedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it("returns 16 unique seeds for size 16", () => {
    const order = generateSeedOrder(16);
    expect(order).toHaveLength(16);
    expect(new Set(order).size).toBe(16);
    expect(Math.min(...order)).toBe(1);
    expect(Math.max(...order)).toBe(16);
    expect(order[0]).toBe(1);
    expect(order[1]).toBe(16);
  });

  it("returns 64 unique seeds for size 64", () => {
    const order = generateSeedOrder(64);
    expect(order).toHaveLength(64);
    expect(new Set(order).size).toBe(64);
    expect(order[0]).toBe(1);
    expect(order[1]).toBe(64);
  });

  it("returns 128 unique seeds for size 128", () => {
    const order = generateSeedOrder(128);
    expect(order).toHaveLength(128);
    expect(new Set(order).size).toBe(128);
    expect(order[0]).toBe(1);
    expect(order[1]).toBe(128);
  });

  it.each([256, 512, 1024] as const)("returns %i unique seeds", (size) => {
    const order = generateSeedOrder(size);
    expect(order).toHaveLength(size);
    expect(new Set(order).size).toBe(size);
    expect(order[0]).toBe(1);
    expect(order[1]).toBe(size);
  });
});

describe("firstRoundPairings", () => {
  it("produces size/2 pairings for size 8", () => {
    const p = firstRoundPairings(8);
    expect(p).toHaveLength(4);
    expect(p[0]).toEqual({ matchIndex: 0, seedA: 1, seedB: 8 });
  });
});

describe("nextRoundPairings", () => {
  it("pairs consecutive winners", () => {
    const p = nextRoundPairings([1, 4, 2, 3]);
    expect(p).toEqual([
      { matchIndex: 0, seedA: 1, seedB: 4 },
      { matchIndex: 1, seedA: 2, seedB: 3 },
    ]);
  });

  it("throws on odd count", () => {
    expect(() => nextRoundPairings([1, 2, 3])).toThrow();
  });
});

describe("totalRounds", () => {
  it.each([
    [4, 2],
    [8, 3],
    [16, 4],
    [32, 5],
    [64, 6],
    [128, 7],
    [256, 8],
    [512, 9],
    [1024, 10],
  ] as const)("size %i -> %i rounds", (size, expected) => {
    expect(totalRounds(size)).toBe(expected);
  });
});

describe("buildBracketState", () => {
  it("returns only round 1 when no votes", () => {
    const state = buildBracketState(8, []);
    expect(state.rounds).toHaveLength(1);
    expect(state.winner).toBeNull();
  });

  it("fully resolves a size-4 tournament with all votes", () => {
    const state = buildBracketState(4, [
      { round: 1, matchIndex: 0, winnerSeed: 1 },
      { round: 1, matchIndex: 1, winnerSeed: 2 },
      { round: 2, matchIndex: 0, winnerSeed: 1 },
    ]);
    expect(state.rounds).toHaveLength(2);
    expect(state.winner).toBe(1);
  });

  it("size-8 full resolution produces 3 rounds and a winner", () => {
    const votes = [
      { round: 1, matchIndex: 0, winnerSeed: 1 },
      { round: 1, matchIndex: 1, winnerSeed: 4 },
      { round: 1, matchIndex: 2, winnerSeed: 2 },
      { round: 1, matchIndex: 3, winnerSeed: 3 },
      { round: 2, matchIndex: 0, winnerSeed: 1 },
      { round: 2, matchIndex: 1, winnerSeed: 2 },
      { round: 3, matchIndex: 0, winnerSeed: 2 },
    ];
    const state = buildBracketState(8, votes);
    expect(state.rounds).toHaveLength(3);
    expect(state.winner).toBe(2);
  });

  describe("byes (trackCount < size)", () => {
    it("size-8 with 6 tracks: byes auto-advance seeds 1 and 2 in round 1", () => {
      // seeding [1,8,4,5,2,7,3,6] → pairs (1,8),(4,5),(2,7),(3,6)
      // seeds 7 and 8 don't exist → seed 1 and seed 2 get byes
      // Only real matches: (4,5) at matchIndex 1 and (3,6) at matchIndex 3
      const votes = [
        { round: 1, matchIndex: 1, winnerSeed: 4 }, // 4 beats 5
        { round: 1, matchIndex: 3, winnerSeed: 3 }, // 3 beats 6
      ];
      const state = buildBracketState(8, votes, 6);
      // Round 1 complete: winners = [1(bye), 4, 2(bye), 3]
      // Round 2: (1 vs 4) and (2 vs 3)
      expect(state.rounds).toHaveLength(2);
      expect(state.rounds[1]).toEqual([
        { matchIndex: 0, seedA: 1, seedB: 4 },
        { matchIndex: 1, seedA: 2, seedB: 3 },
      ]);
    });

    it("size-8 with 6 tracks: full tournament resolves correctly", () => {
      const votes = [
        { round: 1, matchIndex: 1, winnerSeed: 4 },
        { round: 1, matchIndex: 3, winnerSeed: 3 },
        { round: 2, matchIndex: 0, winnerSeed: 1 },
        { round: 2, matchIndex: 1, winnerSeed: 2 },
        { round: 3, matchIndex: 0, winnerSeed: 1 },
      ];
      const state = buildBracketState(8, votes, 6);
      expect(state.rounds).toHaveLength(3);
      expect(state.winner).toBe(1);
    });

    it("size-4 with 3 tracks: seed 1 gets a bye, 1 real match in round 1", () => {
      // seeding [1,4,2,3] → pairs (1,4),(2,3). Seed 4 doesn't exist → bye for 1.
      const votes = [
        { round: 1, matchIndex: 1, winnerSeed: 2 }, // 2 beats 3
      ];
      const state = buildBracketState(4, votes, 3);
      // Round 2: (1 vs 2)
      expect(state.rounds).toHaveLength(2);
      expect(state.rounds[1]).toEqual([{ matchIndex: 0, seedA: 1, seedB: 2 }]);
    });

    it("size-4 with 3 tracks: resolves to winner", () => {
      const votes = [
        { round: 1, matchIndex: 1, winnerSeed: 2 },
        { round: 2, matchIndex: 0, winnerSeed: 2 },
      ];
      const state = buildBracketState(4, votes, 3);
      expect(state.winner).toBe(2);
    });
  });

  describe("dynamic draws", () => {
    it("creates 34 duels and one automatic qualification for 69 tracks", () => {
      const state = buildBracketState(69, [], 69, 2);
      const firstRound = state.rounds[0]!;

      expect(firstRound).toHaveLength(35);
      expect(firstRound.filter((pairing) => pairing.seedB > 69)).toHaveLength(1);
      expect(firstRound.filter((pairing) => pairing.seedB <= 69)).toHaveLength(34);
    });

    it("gives exactly one automatic qualification when an odd round starts", () => {
      const state = buildBracketState(
        5,
        [
          { round: 1, matchIndex: 0, winnerSeed: 1 },
          { round: 1, matchIndex: 1, winnerSeed: 3 },
        ],
        5,
        2,
      );

      expect(state.rounds[0]).toEqual([
        { matchIndex: 0, seedA: 1, seedB: 2 },
        { matchIndex: 1, seedA: 3, seedB: 4 },
        { matchIndex: 2, seedA: 5, seedB: 6 },
      ]);
      expect(state.rounds[1]).toEqual([
        { matchIndex: 0, seedA: 1, seedB: 3 },
        { matchIndex: 1, seedA: 5, seedB: 6 },
      ]);
    });
  });

  describe("balanced dynamic draws (drawVersion 3)", () => {
    it("splits round 1 into two even halves for 9 tracks", () => {
      const state = buildBracketState(9, [], 9, 3);

      // left half = seeds 1-5 (3 pairings: 2 real + 1 bye), right half = seeds 6-9 (2 real pairings)
      expect(state.rounds[0]).toEqual([
        { matchIndex: 0, seedA: 1, seedB: 2 },
        { matchIndex: 1, seedA: 3, seedB: 4 },
        { matchIndex: 2, seedA: 5, seedB: 10 },
        { matchIndex: 3, seedA: 6, seedB: 7 },
        { matchIndex: 4, seedA: 8, seedB: 9 },
      ]);
    });

    it("never lets a match pair winners from both halves", () => {
      // 9 tracks: left half (seeds 1-5) needs one more round than right half (seeds 6-9),
      // so the resolved right side should keep waiting on its own bye instead of
      // being paired against a left-side winner.
      const votes = [
        { round: 1, matchIndex: 0, winnerSeed: 1 },
        { round: 1, matchIndex: 1, winnerSeed: 3 },
        { round: 1, matchIndex: 3, winnerSeed: 6 },
        { round: 1, matchIndex: 4, winnerSeed: 8 },
      ];
      const state = buildBracketState(9, votes, 9, 3);

      expect(state.rounds[1]).toEqual([
        { matchIndex: 0, seedA: 1, seedB: 3 },
        { matchIndex: 1, seedA: 5, seedB: 10 },
        { matchIndex: 2, seedA: 6, seedB: 8 },
      ]);
    });

    it("resolves a 9-track tournament in exactly 4 rounds, matching totalRounds", () => {
      const votes = [
        { round: 1, matchIndex: 0, winnerSeed: 1 },
        { round: 1, matchIndex: 1, winnerSeed: 3 },
        { round: 1, matchIndex: 3, winnerSeed: 6 },
        { round: 1, matchIndex: 4, winnerSeed: 8 },
        { round: 2, matchIndex: 0, winnerSeed: 1 },
        { round: 2, matchIndex: 2, winnerSeed: 6 },
        { round: 3, matchIndex: 0, winnerSeed: 1 },
        { round: 4, matchIndex: 0, winnerSeed: 1 },
      ];
      const state = buildBracketState(9, votes, 9, 3);

      expect(state.rounds).toHaveLength(totalRounds(9));
      expect(state.winner).toBe(1);
    });

    it("keeps each round's two halves within one match of each other, for a range of track counts", () => {
      for (let trackCount = 3; trackCount <= 40; trackCount += 1) {
        const votes: { round: number; matchIndex: number; winnerSeed: number }[] = [];
        let state = buildBracketState(trackCount, votes, trackCount, 3);

        while (state.winner === null) {
          const roundNumber = state.rounds.length;
          const round = state.rounds.at(-1)!;
          const half = round.length / 2;
          const leftCount = round.filter((p) => p.matchIndex < half).length;
          const rightCount = round.length - leftCount;
          expect(Math.abs(leftCount - rightCount)).toBeLessThanOrEqual(1);

          for (const pairing of round) {
            if (pairing.seedB > trackCount) continue;
            votes.push({ round: roundNumber, matchIndex: pairing.matchIndex, winnerSeed: pairing.seedA });
          }
          state = buildBracketState(trackCount, votes, trackCount, 3);
        }

        expect(state.rounds).toHaveLength(totalRounds(trackCount));
      }
    });
  });
});
