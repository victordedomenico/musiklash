import { describe, expect, it } from "vitest";
import { resolveTierlistBallots } from "./tierlist-room-rules";

const vote = (tierId: string | null) => ({ tierId });

describe("resolveTierlistBallots", () => {
  it("averages all votes even when one rank has a majority", () => {
    expect(resolveTierlistBallots([vote("A"), vote(null), vote("A"), vote("F")])).toMatchObject({
      tierId: "B",
      skippedCount: 1,
      tie: false,
      votesByTier: { A: 2, F: 1 },
    });
  });
  it("uses the middle rank for tied votes, even if nobody voted for that rank", () => {
    expect(resolveTierlistBallots([vote("S+"), vote("F")])).toMatchObject({
      tierId: "B",
      tie: true,
    });
    expect(resolveTierlistBallots([vote("S"), vote("B")])).toMatchObject({
      tierId: "A",
      tie: true,
    });
    expect(resolveTierlistBallots([vote("S+"), vote("A"), vote("C")])).toMatchObject({
      tierId: "A",
      tie: true,
    });
  });
  it("rounds between two ranks towards the higher rank", () => {
    expect(resolveTierlistBallots([vote("S+"), vote("S")]).tierId).toBe("S+");
    expect(resolveTierlistBallots([vote("S+"), vote("B")]).tierId).toBe("S");
  });
  it("weights every vote and ignores skipped votes", () => {
    expect(
      resolveTierlistBallots([vote("S+"), vote("S+"), vote("C"), vote("C"), vote("F"), vote(null)]),
    ).toMatchObject({ tierId: "B", skippedCount: 1, tie: true });
  });
  it("leaves the track unranked if nobody votes", () => {
    expect(resolveTierlistBallots([vote(null), vote(null)])).toMatchObject({
      tierId: null,
      skippedCount: 2,
      tie: false,
    });
    expect(resolveTierlistBallots([]).tierId).toBeNull();
  });
  it("uses the current order of custom rows", () => {
    const tiers = [
      { id: "x", label: "X", color: "#123456" },
      { id: "y", label: "Y", color: "#123456" },
      { id: "z", label: "Z", color: "#abcdef" },
    ];
    expect(resolveTierlistBallots([vote("x"), vote("z")], tiers)).toMatchObject({
      tierId: "y",
      tie: true,
    });
  });
});
