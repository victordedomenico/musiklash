"use client";

import { useEffect, useRef } from "react";

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
  const hasSentDeparture = useRef(false);

  useEffect(() => {
    const endpoint = `/api/multiplayer-room/leave?kind=${kind}&roomId=${encodeURIComponent(roomId)}`;
    const leaveRoom = () => {
      if (hasSentDeparture.current) return;
      hasSentDeparture.current = true;
      if (navigator.sendBeacon?.(endpoint)) return;
      void fetch(endpoint, { method: "POST", credentials: "same-origin", keepalive: true });
    };

    window.addEventListener("pagehide", leaveRoom);
    window.addEventListener("beforeunload", leaveRoom);
    return () => {
      window.removeEventListener("pagehide", leaveRoom);
      window.removeEventListener("beforeunload", leaveRoom);
    };
  }, [kind, roomId]);

  return null;
}
