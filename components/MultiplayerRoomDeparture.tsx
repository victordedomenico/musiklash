"use client";

import { useEffect } from "react";

type MultiplayerRoomKind = "bracket" | "tierlist";

/**
 * Keeps a persisted multiplayer room in sync when the browser unloads this
 * page. `sendBeacon` is designed for this short, fire-and-forget request.
 */
export default function MultiplayerRoomDeparture({
  roomId,
  kind,
}: {
  roomId: string;
  kind: MultiplayerRoomKind;
}) {
  useEffect(() => {
    const endpoint = `/api/multiplayer-room/leave?kind=${kind}&roomId=${encodeURIComponent(roomId)}`;
    const leaveRoom = () => {
      if (navigator.sendBeacon?.(endpoint)) return;
      void fetch(endpoint, { method: "POST", credentials: "same-origin", keepalive: true });
    };

    window.addEventListener("pagehide", leaveRoom);
    return () => window.removeEventListener("pagehide", leaveRoom);
  }, [kind, roomId]);

  return null;
}
