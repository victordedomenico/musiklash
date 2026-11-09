import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  identity: vi.fn(),
  findRoom: vi.fn(),
  updateRoom: vi.fn(),
  snapshot: vi.fn(),
}));

vi.mock("@/lib/guest", () => ({ resolvePlayerIdentity: mocks.identity }));
vi.mock("@/lib/prisma", () => ({
  default: { tierlistRoom: { findUnique: mocks.findRoom, updateMany: mocks.updateRoom } },
}));
vi.mock("@/lib/bracket-room-rules", () => ({ BRACKET_DUEL_SECONDS: 30 }));
vi.mock("@/lib/room-ballots", () => ({}));
vi.mock("@/lib/bracket", () => ({ MAX_BRACKET_TRACKS: 100 }));
vi.mock("@/lib/tierlist-room-rules", () => ({}));
vi.mock("@/lib/collaborative-room-afk", () => ({}));
vi.mock("@/lib/tierlist-tiers", () => ({ roomTierConfig: () => [] }));
vi.mock("@/lib/collaborative-room", () => ({
  getTierlistRoomSnapshot: mocks.snapshot,
  normalizeParticipants: (participants: unknown) => participants,
  normalizePlacements: (placements: unknown) => placements,
  normalizeTierlistBallots: (ballots: unknown) => ballots,
}));

import { revoteTierlistTrack } from "./actions";

describe("revoteTierlistTrack authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findRoom.mockResolvedValue({
      hostId: "host",
      participants: [
        { playerId: "host", username: "Host" },
        { playerId: "player", username: "Player" },
      ],
      tierlist: { tracks: [{ position: 0 }] },
      placements: { "0": "S" },
      status: "finished",
      currentPosition: 1,
      ballots: [],
      revision: 1,
      timerEnabled: false,
    });
  });

  it("rejects a participant who is not the host", async () => {
    mocks.identity.mockResolvedValue({ playerId: "player" });

    expect(await revoteTierlistTrack("room", 0)).toEqual({
      ok: false,
      error: "Seul l’hôte peut relancer un vote.",
    });
    expect(mocks.updateRoom).not.toHaveBeenCalled();
  });

  it("allows the host to restart a vote", async () => {
    mocks.identity.mockResolvedValue({ playerId: "host" });
    mocks.updateRoom.mockResolvedValue({ count: 1 });
    mocks.snapshot.mockResolvedValue({ id: "room" });

    expect(await revoteTierlistTrack("room", 0)).toEqual({ ok: true, room: { id: "room" } });
    expect(mocks.updateRoom).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ hostId: "host" }) }),
    );
  });
});
