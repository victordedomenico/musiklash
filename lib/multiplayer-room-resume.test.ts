import { describe, expect, it } from "vitest";
import {
  forgetMultiplayerRoom,
  MULTIPLAYER_ROOMS_STORAGE_KEY,
  readMultiplayerRooms,
  rememberMultiplayerRoom,
  roomResumeHref,
} from "./multiplayer-room-resume";

const BRACKET_ID = "1b8b8e20-4a8e-4ea1-a353-6865fa0f8c22";
const TIERLIST_ID = "2a4ea4bf-c950-4cf9-9c5a-cfe55b4d746c";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("multiplayer room resume", () => {
  it("restores the most recently opened rooms with their canonical URLs", () => {
    const local = storage();
    rememberMultiplayerRoom(local, { id: BRACKET_ID, kind: "bracket", title: "Rap FR" }, 10);
    rememberMultiplayerRoom(local, { id: TIERLIST_ID, kind: "tierlist", title: "Albums" }, 20);

    expect(readMultiplayerRooms(local)).toEqual([
      { id: TIERLIST_ID, kind: "tierlist", title: "Albums", savedAt: 20 },
      { id: BRACKET_ID, kind: "bracket", title: "Rap FR", savedAt: 10 },
    ]);
    expect(roomResumeHref({ id: TIERLIST_ID, kind: "tierlist" })).toBe(
      `/tierlist/room/${TIERLIST_ID}`,
    );
  });

  it("updates a room without duplicating it and can forget completed rooms", () => {
    const local = storage();
    rememberMultiplayerRoom(local, { id: BRACKET_ID, kind: "bracket", title: "Avant" }, 10);
    rememberMultiplayerRoom(local, { id: BRACKET_ID, kind: "bracket", title: "Après" }, 20);
    forgetMultiplayerRoom(local, { id: BRACKET_ID, kind: "bracket" });

    expect(readMultiplayerRooms(local)).toEqual([]);
  });

  it("ignores malformed browser data", () => {
    const local = storage();
    local.setItem(MULTIPLAYER_ROOMS_STORAGE_KEY, JSON.stringify([{ id: "nope" }]));

    expect(readMultiplayerRooms(local)).toEqual([]);
  });

  it("fails closed when browser storage is unavailable", () => {
    expect(
      readMultiplayerRooms({
        getItem: () => {
          throw new Error("Storage disabled");
        },
      }),
    ).toEqual([]);
  });
});
