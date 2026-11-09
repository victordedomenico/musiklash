import { describe, expect, it } from "vitest";
import { resolveTierlistBallots, planTierlistRoomTrackEdit } from "./tierlist-room-rules";

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

describe("planTierlistRoomTrackEdit", () => {
  it("retains existing rankings, removes deleted tracks and starts at the first new track", () => {
    expect(
      planTierlistRoomTrackEdit("finished", { "0": "S", "1": "A", "2": "B" }, [0, 2, 3, 4], 3, 2),
    ).toMatchObject({ placements: { "0": "S", "2": "B" }, status: "playing", currentPosition: 3 });
  });
  it("keeps a finished room finished if nothing is added", () => {
    expect(
      planTierlistRoomTrackEdit("finished", { "0": "S", "1": "A" }, [0], undefined, 1),
    ).toMatchObject({ placements: { "0": "S" }, status: "finished", currentPosition: 1 });
  });
  it("keeps a waiting room waiting after an addition", () => {
    expect(planTierlistRoomTrackEdit("waiting", {}, [0, 1, 2], 2, 0)).toMatchObject({
      placements: {},
      status: "waiting",
      currentPosition: 0,
    });
  });
});

describe("editing while voting", () => {
  it("keeps the active vote and timer when the current track remains", () => {
    expect(planTierlistRoomTrackEdit("playing", { "0": "S" }, [0, 1, 2, 3], 3, 1)).toMatchObject({
      status: "playing",
      currentPosition: 1,
      resetVote: false,
      placements: { "0": "S" },
    });
  });
  it("advances and clears the vote when the current track is removed", () => {
    expect(planTierlistRoomTrackEdit("playing", { "0": "S" }, [0, 2, 3], 3, 1)).toMatchObject({
      status: "playing",
      currentPosition: 2,
      resetVote: true,
    });
    expect(planTierlistRoomTrackEdit("playing", { "0": "S" }, [0, 1], undefined, 2)).toMatchObject({
      status: "finished",
      resetVote: true,
    });
  });
  it("preserves or adjusts the return point during a revote", () => {
    expect(
      planTierlistRoomTrackEdit("playing", {}, [0, 2, 4], 4, 0, { position: 1, finished: false }),
    ).toMatchObject({
      currentPosition: 0,
      resetVote: false,
      resume: { position: 2, finished: false },
    });
    expect(
      planTierlistRoomTrackEdit("playing", {}, [2, 4], 4, 0, { position: 2, finished: false }),
    ).toMatchObject({ currentPosition: 2, resetVote: true, resume: undefined });
    expect(
      planTierlistRoomTrackEdit("playing", {}, [0, 2, 4], 4, 0, { position: 2, finished: true }),
    ).toMatchObject({ resume: { position: 4, finished: false } });
  });
});
