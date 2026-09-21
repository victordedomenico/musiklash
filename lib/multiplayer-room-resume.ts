export type MultiplayerRoomKind = "bracket" | "tierlist";

export type MultiplayerRoomResume = {
  id: string;
  kind: MultiplayerRoomKind;
  title: string;
  savedAt: number;
};

const RESUME_VERSION = 1;
export const MULTIPLAYER_ROOMS_STORAGE_KEY = `musiklash:multiplayer-rooms:v${RESUME_VERSION}`;
export const MULTIPLAYER_ROOMS_CHANGED_EVENT = "musiklash:multiplayer-rooms-changed";
const MAX_SAVED_ROOMS = 6;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

function isResume(value: unknown): value is MultiplayerRoomResume {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    UUID_PATTERN.test(record.id) &&
    (record.kind === "bracket" || record.kind === "tierlist") &&
    typeof record.title === "string" &&
    typeof record.savedAt === "number" &&
    Number.isFinite(record.savedAt)
  );
}

export function roomResumeHref(room: Pick<MultiplayerRoomResume, "id" | "kind">) {
  return room.kind === "bracket" ? `/bracket-game/room/${room.id}` : `/tierlist/room/${room.id}`;
}

export function parseMultiplayerRooms(raw: string | null): MultiplayerRoomResume[] {
  try {
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    return parsed
      .filter(isResume)
      .sort((a, b) => b.savedAt - a.savedAt)
      .filter((room) => {
        const key = `${room.kind}:${room.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, MAX_SAVED_ROOMS);
  } catch {
    return [];
  }
}

export function readMultiplayerRooms(storage: StorageReader): MultiplayerRoomResume[] {
  try {
    return parseMultiplayerRooms(storage.getItem(MULTIPLAYER_ROOMS_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function rememberMultiplayerRoom(
  storage: StorageReader & StorageWriter,
  room: Omit<MultiplayerRoomResume, "savedAt">,
  now = Date.now(),
) {
  if (!isResume({ ...room, savedAt: now })) return;
  const next = [{ ...room, title: room.title.trim().slice(0, 120), savedAt: now }];
  for (const saved of readMultiplayerRooms(storage)) {
    if (saved.id !== room.id || saved.kind !== room.kind) next.push(saved);
  }
  try {
    storage.setItem(MULTIPLAYER_ROOMS_STORAGE_KEY, JSON.stringify(next.slice(0, MAX_SAVED_ROOMS)));
  } catch {
    // Private browsing or a full storage quota must not interrupt the room itself.
  }
}

export function forgetMultiplayerRoom(
  storage: StorageReader & StorageWriter,
  room: Pick<MultiplayerRoomResume, "id" | "kind">,
) {
  try {
    storage.setItem(
      MULTIPLAYER_ROOMS_STORAGE_KEY,
      JSON.stringify(
        readMultiplayerRooms(storage).filter(
          (saved) => saved.id !== room.id || saved.kind !== room.kind,
        ),
      ),
    );
  } catch {
    // The room remains playable even when browser storage is unavailable.
  }
}
