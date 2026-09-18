"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Copy, ListOrdered, Users } from "lucide-react";
import type { TierlistRoomSnapshot } from "@/lib/collaborative-room";
import { DEFAULT_TIERS } from "@/lib/tierlist-tiers";
import {
  joinTierlistRoom,
  refreshTierlistRoom,
  startTierlistRoom,
  voteTierlistRoom,
} from "./actions";

export default function TierlistRoomClient({
  initialRoom,
  userId,
}: {
  initialRoom: TierlistRoomSnapshot;
  userId: string;
  username: string;
}) {
  const [room, setRoom] = useState(initialRoom);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const me = room.participants.find((participant) => participant.playerId === userId) ?? null;
  const isHost = room.hostId === userId;
  const hasVoted = room.ballots.some((ballot) => ballot.playerId === userId);
  const currentTrack =
    room.tierlist.tracks.find((track) => track.position === room.currentPosition) ?? null;
  const byTier = useMemo(
    () =>
      Object.fromEntries(
        DEFAULT_TIERS.map((tier) => [
          tier.id,
          room.tierlist.tracks.filter(
            (track) => room.placements[String(track.position)] === tier.id,
          ),
        ]),
      ),
    [room.placements, room.tierlist.tracks],
  );

  useEffect(() => {
    if (room.status === "finished") return;
    const id = window.setInterval(() => {
      void refreshTierlistRoom(room.id).then((result) => {
        if (result.ok) setRoom(result.room);
      });
    }, 1500);
    return () => window.clearInterval(id);
  }, [room.id, room.status]);

  const run = (action: () => Promise<Awaited<ReturnType<typeof refreshTierlistRoom>>>) => {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (result.ok) setRoom(result.room);
      else setError(result.error);
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Impossible de copier le lien automatiquement.");
    }
  };

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold">Room collaborative</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              {room.participants.length} joueur{room.participants.length > 1 ? "s" : ""} · hôte :{" "}
              {room.hostName}
            </p>
          </div>
          <button type="button" onClick={copyLink} className="btn-ghost text-sm">
            <Copy size={15} />
            {copied ? "Lien copié" : "Copier le lien"}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {room.participants.map((participant) => (
            <span
              key={participant.playerId}
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-xs"
            >
              {participant.username}
              {participant.playerId === room.hostId ? " · hôte" : ""}
            </span>
          ))}
        </div>
      </section>

      {room.status === "waiting" ? (
        <section className="card p-6 text-center">
          <Users className="mx-auto text-sky-300" size={30} />
          <h2 className="mt-3 text-xl font-bold">En attente des joueurs</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Partage le lien, puis lance la tierlist à partir de 2 joueurs.
          </p>
          {!me ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => joinTierlistRoom(room.id))}
              className="btn-primary mt-5"
            >
              Rejoindre la room
            </button>
          ) : isHost ? (
            <button
              type="button"
              disabled={pending || room.participants.length < 2}
              onClick={() => run(() => startTierlistRoom(room.id))}
              className="btn-primary mt-5"
            >
              <ListOrdered size={16} />
              Lancer la tierlist
            </button>
          ) : (
            <p className="mt-5 text-sm text-sky-200">En attente du lancement par l’hôte…</p>
          )}
        </section>
      ) : room.status === "playing" && currentTrack ? (
        <section className="card overflow-hidden">
          <div className="border-b border-[color:var(--border)] px-5 py-4 text-sm text-[color:var(--muted)]">
            Morceau {room.currentPosition + 1} / {room.tierlist.tracks.length} · votes reçus :{" "}
            {room.ballots.length} / {room.participants.length}
          </div>
          <div className="p-5 text-center">
            {currentTrack.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentTrack.coverUrl}
                alt=""
                className="mx-auto h-28 w-28 rounded-xl object-cover"
              />
            ) : null}
            <h2 className="mt-3 text-xl font-bold">{currentTrack.title}</h2>
            <p className="text-sm text-[color:var(--muted)]">{currentTrack.artist}</p>
            {me && !hasVoted ? (
              <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7">
                {DEFAULT_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => voteTierlistRoom(room.id, tier.id))}
                    className="rounded-xl border px-2 py-3 font-black text-black transition hover:scale-105 disabled:opacity-50"
                    style={{ background: tier.color, borderColor: tier.color }}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-5 inline-flex items-center gap-1 text-sm text-emerald-200">
                <Check size={15} />
                {me ? "Ton vote est enregistré." : "Tu observes cette room."}
              </p>
            )}
          </div>
        </section>
      ) : null}

      {room.status === "finished" ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Tierlist terminée : tous les placements ont été votés collectivement.
        </p>
      ) : null}
      {room.status !== "waiting" ? (
        <section className="overflow-hidden rounded-xl border border-[color:var(--border)]">
          {DEFAULT_TIERS.map((tier) => (
            <div
              key={tier.id}
              className="flex min-h-16 border-b border-[color:var(--border)] last:border-b-0"
            >
              <div
                className="flex w-16 items-center justify-center font-black text-black"
                style={{ background: tier.color }}
              >
                {tier.label}
              </div>
              <div className="flex flex-1 flex-wrap gap-2 bg-[color:var(--surface-2)] p-2">
                {byTier[tier.id]?.map((track) => (
                  <div
                    key={track.position}
                    className="flex items-center gap-2 rounded-lg bg-black/20 pr-2 text-xs"
                  >
                    {track.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={track.coverUrl}
                        alt=""
                        className="h-11 w-11 rounded-l-lg object-cover"
                      />
                    ) : null}
                    <span>{track.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
