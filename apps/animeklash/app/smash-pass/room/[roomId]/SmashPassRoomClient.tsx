"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Copy,
  Check,
  Loader2,
  Play,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type {
  SmashPassRoomSnapshot,
  SmashPassRoomBroadcastPayload,
} from "@/lib/smash-pass-room";
import {
  allParticipantsVoted,
  computeRoomVoteTotals,
  type SmashPassChoice,
  type SmashPassItemStatsSnapshot,
} from "@/lib/smash-pass";
import SmashPassGameCard from "@/components/smash-pass/SmashPassGameCard";
import SmashPassControls from "@/components/smash-pass/SmashPassControls";
import SmashPassProgress from "@/components/smash-pass/SmashPassProgress";
import SmashPassCommunityStats from "@/components/smash-pass/SmashPassCommunityStats";
import RoomChat from "@/components/RoomChat";
import {
  joinRoom,
  leaveRoom,
  startGame,
  submitVote,
  advancePosition,
  rematch,
  refreshRoomState,
} from "./actions";

const ITEM_LABELS: Record<string, string> = { anime: "Animé", character: "Personnage" };

export default function SmashPassRoomClient({
  initialRoom,
  userId,
  username,
}: {
  initialRoom: SmashPassRoomSnapshot;
  userId: string;
  username: string;
}) {
  const [room, setRoom] = useState(initialRoom);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [lastStats, setLastStats] = useState<SmashPassItemStatsSnapshot | null>(
    null,
  );
  const [revealItem, setRevealItem] = useState<
    (typeof room.smashPass.items)[0] | null
  >(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const roomRef = useRef(room);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const isHost = userId === room.hostId;
  const me = useMemo(
    () => room.participants.find((p) => p.playerId === userId) ?? null,
    [room.participants, userId],
  );
  const isParticipant = me !== null;

  const currentItem =
    room.smashPass.items.find((i) => i.position === room.currentPosition) ??
    null;
  const itemLabel = ITEM_LABELS[room.itemType];

  const hasVoted = me
    ? me.choices[String(room.currentPosition)] === "smash" ||
      me.choices[String(room.currentPosition)] === "pass"
    : false;

  const everyoneVoted = useMemo(
    () => allParticipantsVoted(room.participants, room.currentPosition),
    [room.participants, room.currentPosition],
  );

  const roomTotals = useMemo(
    () => computeRoomVoteTotals(room.participants, room.currentPosition),
    [room.participants, room.currentPosition],
  );

  const broadcastSync = useCallback(
    async (payload: SmashPassRoomBroadcastPayload) => {
      if (!channelRef.current) return;
      await channelRef.current.send({
        type: "broadcast",
        event: "room-sync",
        payload,
      });
    },
    [],
  );

  const runAction = useCallback(
    async <T extends { ok: boolean; room?: SmashPassRoomSnapshot; error?: string }>(
      fn: () => Promise<T>,
    ) => {
      setError("");
      setSubmitting(true);
      const res = await fn();
      setSubmitting(false);
      if (!res.ok) {
        setError(res.error ?? "Erreur");
        return;
      }
      if (res.room) {
        setRoom(res.room);
        await broadcastSync({
          room: res.room,
          event: { type: "vote-submitted", playerId: userId, position: res.room.currentPosition },
        });
      }
    },
    [broadcastSync, userId],
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`smash-pass:room:${initialRoom.id}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "room-sync" }, (msg) => {
        const sync = msg.payload as SmashPassRoomBroadcastPayload;
        setRoom(sync.room);
        if (sync.event?.type === "advanced" || sync.event?.type === "game-start") {
          setRevealItem(null);
          setLastStats(null);
        }
      })
      .subscribe();

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [initialRoom.id]);

  useEffect(() => {
    if (room.status !== "waiting" && room.status !== "playing") return;
    const pull = () => {
      void refreshRoomState(initialRoom.id).then((r) => {
        if (r.ok) setRoom(r.room);
      });
    };
    pull();
    const id = window.setInterval(pull, 2500);
    return () => window.clearInterval(id);
  }, [room.status, initialRoom.id]);

  useEffect(() => {
    void joinRoom(initialRoom.id).then((r) => {
      if (r.ok) {
        setRoom(r.room);
        void broadcastSync({ room: r.room, event: r.event });
      }
    });
  }, [initialRoom.id, broadcastSync]);

  useEffect(() => {
    if (!everyoneVoted || !currentItem) return;
    const prev =
      room.currentPosition > 0
        ? room.smashPass.items.find((i) => i.position === room.currentPosition - 1)
        : currentItem;
    setRevealItem(prev ?? currentItem);
  }, [everyoneVoted, currentItem, room.currentPosition, room.smashPass.items]);

  const handleVote = async (choice: SmashPassChoice) => {
    setSubmitting(true);
    setError("");
    const res = await submitVote(initialRoom.id, choice);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Erreur");
      return;
    }
    setRoom(res.room);
    if (res.stats) setLastStats(res.stats);
    await broadcastSync({ room: res.room, event: res.event });
  };

  const handleAdvance = async () => {
    setSubmitting(true);
    const res = await advancePosition(initialRoom.id);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Erreur");
      return;
    }
    if (res.room) {
      setRoom(res.room);
      setRevealItem(null);
      setLastStats(null);
      await broadcastSync({ room: res.room, event: res.event });
    }
  };

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/smash-pass/room/${room.id}`
      : "";

  return (
    <div className="space-y-8">
      {error ? (
        <p className="text-center text-sm text-red-400">{error}</p>
      ) : null}

      {room.status === "waiting" ? (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 text-[color:var(--muted)]">
            <Users size={18} />
            <span>
              {room.participants.length} joueur
              {room.participants.length > 1 ? "s" : ""}
            </span>
          </div>
          <ul className="space-y-1">
            {room.participants.map((p) => (
              <li key={p.playerId} className="text-sm">
                {p.username}
                {p.playerId === room.hostId ? " (hôte)" : ""}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                void navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              Copier le lien
            </button>
            {!isHost && isParticipant ? (
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={submitting}
                onClick={() => void runAction(() => leaveRoom(initialRoom.id))}
              >
                Quitter
              </button>
            ) : null}
          </div>
          {isHost ? (
            <button
              type="button"
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={submitting || room.participants.length < 1}
              onClick={async () => {
                setSubmitting(true);
                const res = await startGame(initialRoom.id);
                setSubmitting(false);
                if (!res.ok) {
                  setError(res.error ?? "Erreur");
                  return;
                }
                setRoom(res.room);
                await broadcastSync({ room: res.room, event: res.event });
              }}
            >
              <Play size={18} />
              Lancer la partie
            </button>
          ) : (
            <p className="text-sm text-center text-[color:var(--muted)]">
              En attente de l&apos;hôte…
            </p>
          )}
        </div>
      ) : null}

      {room.status === "playing" && currentItem ? (
        <>
          <SmashPassGameCard item={currentItem} itemType={room.itemType} />
          <SmashPassProgress
            current={room.currentPosition + 1}
            total={room.smashPass.items.length}
            itemLabel={itemLabel}
          />
          {!hasVoted && isParticipant ? (
            <SmashPassControls
              smashCount={me?.smashCount ?? 0}
              passCount={me?.passCount ?? 0}
              disabled={submitting}
              onVote={handleVote}
            />
          ) : hasVoted ? (
            <p className="text-center text-sm text-[color:var(--muted)]">
              Vote enregistré — en attente des autres…
            </p>
          ) : null}

          {everyoneVoted ? (
            <>
              <SmashPassCommunityStats
                item={revealItem ?? currentItem}
                stats={lastStats}
                roomSmash={roomTotals.smash}
                roomPass={roomTotals.pass}
              />
              {isHost ? (
                <button
                  type="button"
                  className="btn-primary mx-auto flex items-center gap-2"
                  disabled={submitting}
                  onClick={() => void handleAdvance()}
                >
                  Suivant
                  <ArrowRight size={18} />
                </button>
              ) : (
                <p className="text-center text-sm text-[color:var(--muted)]">
                  L&apos;hôte passe à l&apos;élément suivant…
                </p>
              )}
            </>
          ) : null}
        </>
      ) : null}

      {room.status === "finished" ? (
        <div className="text-center space-y-4 py-8">
          <h2 className="text-2xl font-black">Partie terminée</h2>
          <ul className="space-y-2 text-left max-w-xs mx-auto">
            {room.participants.map((p) => (
              <li key={p.playerId} className="card flex justify-between p-3 text-sm">
                <span>{p.username}</span>
                <span>
                  {p.smashCount} smash / {p.passCount} pass
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn-primary"
            disabled={submitting}
            onClick={async () => {
              const res = await rematch(initialRoom.id);
              if (res.ok) {
                setRoom(res.room);
                await broadcastSync({ room: res.room, event: res.event });
              }
            }}
          >
            Rejouer
          </button>
          <Link href="/explore" className="btn-ghost block">
            Explorer
          </Link>
        </div>
      ) : null}

      {submitting ? (
        <div className="flex justify-center">
          <Loader2 className="animate-spin text-[color:var(--muted)]" size={24} />
        </div>
      ) : null}

      <RoomChat
        channelKey="smash-pass"
        roomId={room.id}
        userId={userId}
        username={username}
      />
    </div>
  );
}
