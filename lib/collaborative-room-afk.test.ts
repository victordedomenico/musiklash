import { describe, expect, it } from "vitest";
import { resolveCollaborativeRoomAfkParticipants } from "./collaborative-room-afk";

const players = [
  { playerId: "host", username: "Host" },
  { playerId: "away", username: "Absent" },
];

describe("resolveCollaborativeRoomAfkParticipants", () => {
  it("keeps a player for their first two consecutive missed votes", () => {
    expect(
      resolveCollaborativeRoomAfkParticipants(players, [{ playerId: "host" }], { away: 1 }),
    ).toEqual({
      participants: players,
      missedVoteCounts: { away: 2 },
      removedPlayerIds: [],
    });
  });

  it("moves a player to spectator after a third consecutive missed vote", () => {
    expect(
      resolveCollaborativeRoomAfkParticipants(players, [{ playerId: "host" }], { away: 2 }),
    ).toEqual({
      participants: [players[0]],
      missedVoteCounts: {},
      removedPlayerIds: ["away"],
    });
  });

  it("resets the absence streak when the player votes, including a skip", () => {
    expect(
      resolveCollaborativeRoomAfkParticipants(
        players,
        [{ playerId: "host" }, { playerId: "away" }],
        { away: 2 },
      ),
    ).toEqual({ participants: players, missedVoteCounts: {}, removedPlayerIds: [] });
  });
});
