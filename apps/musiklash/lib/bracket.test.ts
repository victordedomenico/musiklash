import { describe, it, expect } from "vitest";
import {
  buildBracketState,
  effectiveBracketSize,
  firstRoundPairings,
  generateSeedOrder,
  nextRoundPairings,
  totalRounds,
} from "./bracket";

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
  ] as const)("size %i -> %i rounds", (size, expected) => {
    expect(totalRounds(size)).toBe(expected);
  });
});

describe("effectiveBracketSize", () => {
  it.each([
    [3, 4],
    [4, 4],
    [5, 8],
    [6, 8],
    [7, 8],
    [8, 8],
    [9, 16],
    [16, 16],
    [33, 64],
    [64, 64],
    [65, 128],
    [128, 128],
  ])("trackCount %i -> size %i", (count, expected) => {
    expect(effectiveBracketSize(count)).toBe(expected);
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
      expect(state.rounds[1]).toEqual([
        { matchIndex: 0, seedA: 1, seedB: 2 },
      ]);
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
});
