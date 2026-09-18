import { describe, expect, it } from "vitest";
import {
  BRACKET_DUEL_SECONDS,
  remainingDuelSeconds,
  resolveBracketBallots,
} from "./bracket-room-rules";

describe("resolveBracketBallots", () => {
  it("selects the majority winner and ignores skipped ballots", () => {
    expect(
      resolveBracketBallots(
        [{ winnerSeed: 2 }, { winnerSeed: null }, { winnerSeed: 2 }, { winnerSeed: 7 }],
        2,
        7,
      ),
    ).toMatchObject({ winnerSeed: 2, votesA: 2, votesB: 1, skippedCount: 1, tie: false });
  });

  it("uses pile for an equal score when the random value is below one half", () => {
    expect(
      resolveBracketBallots([{ winnerSeed: 2 }, { winnerSeed: 7 }], 2, 7, () => 0.2),
    ).toMatchObject({ winnerSeed: 2, tie: true, coinSide: "pile" });
  });

  it("uses face when everybody skips", () => {
    expect(
      resolveBracketBallots([{ winnerSeed: null }, { winnerSeed: null }], 2, 7, () => 0.8),
    ).toMatchObject({
      winnerSeed: 7,
      votesA: 0,
      votesB: 0,
      skippedCount: 2,
      tie: true,
      coinSide: "face",
    });
  });
});

describe("remainingDuelSeconds", () => {
  it("counts down from the authoritative start time and clamps at zero", () => {
    const startedAt = new Date("2026-09-19T10:00:00.000Z");
    expect(remainingDuelSeconds(startedAt, startedAt.getTime())).toBe(BRACKET_DUEL_SECONDS);
    expect(remainingDuelSeconds(startedAt, startedAt.getTime() + 10_100)).toBe(350);
    expect(
      remainingDuelSeconds(startedAt, startedAt.getTime() + (BRACKET_DUEL_SECONDS + 10) * 1000),
    ).toBe(0);
  });
});
