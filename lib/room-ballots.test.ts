import { describe, expect, it } from "vitest";
import { removePlayerBallot, replacePlayerBallot } from "./room-ballots";

describe("room ballots", () => {
  it("replaces a player's ballot without changing the other players' votes", () => {
    expect(
      replacePlayerBallot(
        [
          { playerId: "a", winnerSeed: 1 },
          { playerId: "b", winnerSeed: 2 },
        ],
        { playerId: "a", winnerSeed: 2 },
      ),
    ).toEqual([
      { playerId: "a", winnerSeed: 2 },
      { playerId: "b", winnerSeed: 2 },
    ]);
  });

  it("adds a first ballot and removes only the requested player's ballot", () => {
    const ballots = replacePlayerBallot([], { playerId: "a", tierId: "S" });
    expect(removePlayerBallot([...ballots, { playerId: "b", tierId: "A" }], "a")).toEqual([
      { playerId: "b", tierId: "A" },
    ]);
  });
});
