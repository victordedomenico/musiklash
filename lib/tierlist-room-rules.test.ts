import { describe, expect, it } from "vitest";
import { resolveTierlistBallots } from "./tierlist-room-rules";

describe("resolveTierlistBallots", () => {
  it("selects the most-voted tier and ignores skipped ballots", () => {
    expect(
      resolveTierlistBallots([{ tierId: "A" }, { tierId: null }, { tierId: "A" }, { tierId: "B" }]),
    ).toMatchObject({ tierId: "A", skippedCount: 1, tie: false, votesByTier: { A: 2, B: 1 } });
  });

  it("uses the coin to resolve a two-tier tie", () => {
    const randomValues = [0, 0, 0.8];
    expect(
      resolveTierlistBallots([{ tierId: "S+" }, { tierId: "S" }], () => randomValues.shift() ?? 0),
    ).toMatchObject({
      tierId: "S",
      tie: true,
      coinSide: "face",
      pileTierId: "S+",
      faceTierId: "S",
    });
  });

  it("draws fairly from every tier when all players skip", () => {
    expect(resolveTierlistBallots([{ tierId: null }, { tierId: null }], () => 0.8)).toMatchObject({
      skippedCount: 2,
      tie: true,
      votesByTier: { "S+": 0, S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 },
    });
  });
});
