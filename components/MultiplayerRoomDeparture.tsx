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
  isHost = false,
}: {
  roomId: string;
  kind: MultiplayerRoomKind;
  /**
   * Hosts of rooms backed by a heartbeat/grace-period mechanism (bracket) should not
   * be evicted from `participants` just because a refresh or brief navigation fires
   * `pagehide`/`beforeunload` — that mechanism already handles a genuinely absent host.
   * Leave this false for room kinds without such a mechanism (e.g. tierlist), where
   * this beacon is the only way departures are detected.
   */
  isHost?: boolean;
}) {
  const hasSentDeparture = useRef(false);

  useEffect(() => {
    if (isHost) return;
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
  }, [isHost, kind, roomId]);

  return null;
}
