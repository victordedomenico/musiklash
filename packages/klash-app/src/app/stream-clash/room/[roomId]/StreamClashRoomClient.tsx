"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@klash/klash-app/lib/supabase/client";
import {
  Users,
  Copy,
  Check,
  X,
  AlertTriangle,
  Trophy,
  Loader2,
  Play,
  Swords,
  ArrowRight,
  Zap,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import type {
  StreamClashRoomSnapshot,
  StreamClashRoomBroadcastPayload,
  StreamClashParticipant,
} from "@klash/klash-app/lib/stream-clash-room";
import { checkAnswer, POINTS_PER_CORRECT } from "@klash/klash-app/lib/stream-clash";
import ChallengeOutcomeFx from "@klash/klash-app/components/ChallengeOutcomeFx";
import StreamClashTrackCard from "@klash/klash-app/components/StreamClashTrackCard";
import TrackPreviewBar from "@klash/klash-app/components/TrackPreviewBar";
import RoomChat from "@klash/klash-app/components/RoomChat";
import { useTrackPreview } from "@klash/klash-app/lib/use-track-preview";
import {
  joinRoom,
  leaveRoom,
  startGame,
  submitAnswer,
  nextRound,
  rematch,
  refreshRoomState,
} from "./actions";

const TIMER_SECONDS = 15;
const PRESENCE_GRACE_SECONDS = 45;
const PRESENCE_WARNING_SECONDS = 20;

function isOnline(lastSeenAt: string | null, now: number): boolean {
  if (!lastSeenAt) return false;
  const ts = Date.parse(lastSeenAt);
  if (Number.isNaN(ts)) return false;
  return now - ts <= PRESENCE_GRACE_SECONDS * 1000;
}

function hasAnsweredRound(p: StreamClashParticipant, round: number): boolean {
  return p.rounds.length > round;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StreamClashRoomClient({
  initialRoom,
  userId,
  username,
}: {
  initialRoom: StreamClashRoomSnapshot;
  userId: string;
  username: string;
}) {
  const [room, setRoom] = useState(initialRoom);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [waitingRematch, setWaitingRematch] = useState(false);

  type Phase = "picking" | "revealed";
  const [phase, setPhase] = useState<Phase>("picking");
  const [chosenPosition, setChosenPosition] = useState<number | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const roomRef = useRef(room);
  const phaseRef = useRef<Phase>("picking");
  const { nowPlaying, isPlaying, playTrack, toggle, stop, isPlayingKey } = useTrackPreview();

  useEffect(() => { roomRef.current = room; }, [room]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const isHost = userId === room.hostId;
  const me = useMemo(
    () => room.participants.find((p) => p.playerId === userId) ?? null,
    [room.participants, userId],
  );
  const isParticipant = me !== null;
  const isSpectator = !isParticipant;

  const hasAnsweredThisRound = me ? hasAnsweredRound(me, room.currentRound) : false;

  const allAnswered = useMemo(
    () =>
      room.participants.length > 0 &&
      room.participants.every((p) => hasAnsweredRound(p, room.currentRound)),
    [room.participants, room.currentRound],
  );

  const disconnectedParticipants = useMemo(() => {
    if (room.status !== "playing" && room.status !== "waiting") return [];
    return room.participants.filter((p) => {
      if (p.playerId === userId) return false;
      if (!p.lastSeenAt) return true;
      const ts = Date.parse(p.lastSeenAt);
      if (Number.isNaN(ts)) return true;
      return Math.floor((now - ts) / 1000) >= PRESENCE_WARNING_SECONDS;
    });
  }, [now, room.participants, room.status, userId]);

  const timeLeft = useMemo(() => {
    if (room.status !== "playing") return TIMER_SECONDS;
    const anchor = room.pairStartedAt ?? room.updatedAt;
    const elapsed = Math.floor((now - Date.parse(anchor)) / 1000);
    return Math.max(0, TIMER_SECONDS - elapsed);
  }, [now, room.status, room.pairStartedAt, room.updatedAt]);

  // ── Supabase Realtime ──────────────────────────────────────────────────────

  const broadcastSync = useCallback(async (payload: StreamClashRoomBroadcastPayload) => {
    if (!channelRef.current) return;
    await channelRef.current.send({ type: "broadcast", event: "room-sync", payload });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`stream-clash:room:${initialRoom.id}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "room-sync" }, (msg) => {
        const sync = msg.payload as StreamClashRoomBroadcastPayload;
        const prev = roomRef.current;
        setRoom(sync.room);
        setNow(Date.now());

        const ev = sync.event;
        if (
          sync.room.currentRound !== prev.currentRound ||
          ev?.type === "game-start" ||
          ev?.type === "rematch"
        ) {
          setPhase("picking");
          setChosenPosition(null);
        }
      })
      .subscribe();

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [initialRoom.id]);

  // ── Poll as safety net ─────────────────────────────────────────────────────
  useEffect(() => {
    if (room.status !== "waiting" && room.status !== "playing") return;

    const pull = () => {
      void refreshRoomState(initialRoom.id).then((r) => {
        if (!r.ok) return;
        const cur = roomRef.current;
        const next = r.room;
        const sameParticipants =
          next.participants.length === cur.participants.length &&
          next.participants.every((p, i) => {
            const c = cur.participants[i];
            return (
              c &&
              c.playerId === p.playerId &&
              c.score === p.score &&
              c.rounds.length === p.rounds.length &&
              c.lastSeenAt === p.lastSeenAt
            );
          });
        if (
          next.status !== cur.status ||
          next.updatedAt !== cur.updatedAt ||
          next.currentRound !== cur.currentRound ||
          !sameParticipants
        ) {
          setRoom(next);
          setNow(Date.now());
        }
      });
    };

    pull();
    const id = window.setInterval(pull, 2500);
    return () => window.clearInterval(id);
  }, [room.status, initialRoom.id]);

  // ── Timer tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (room.status !== "playing") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [room.status, room.currentRound]);

  useEffect(() => {
    stop();
  }, [room.currentRound, stop]);

  // ── Auto-submit when timer hits 0 ─────────────────────────────────────────
  const autoSubmittedRef = useRef(-1);
  useEffect(() => {
    if (
      phase !== "picking" ||
      timeLeft > 0 ||
      hasAnsweredThisRound ||
      autoSubmittedRef.current === room.currentRound ||
      isSpectator
    )
      return;
    autoSubmittedRef.current = room.currentRound;
    void handlePick(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, hasAnsweredThisRound, room.currentRound]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handlePick = useCallback(
    async (position: number) => {
      if (phaseRef.current === "revealed" || isSpectator) return;
      setChosenPosition(position);
      setPhase("revealed");

      const r = roomRef.current;
      const result = await submitAnswer(r.id, position);
      if (!result.ok) return;
      setRoom(result.room);
      await broadcastSync({ room: result.room, event: result.event });
    },
    [isSpectator, broadcastSync],
  );

  const handleNextRound = async () => {
    if (!isHost || submitting) return;
    setSubmitting(true);
    setError("");
    const result = await nextRound(room.id);
    if (!result.ok) {
      setError(result.error ?? "Erreur");
      setSubmitting(false);
      return;
    }
    setRoom(result.room);
    setNow(Date.now());
    if (result.event.type !== "game-end") {
      setPhase("picking");
      setChosenPosition(null);
    }
    await broadcastSync({ room: result.room, event: result.event });
    setSubmitting(false);
  };

  const handleJoin = async () => {
    setSubmitting(true);
    setError("");
    const result = await joinRoom(room.id);
    if (!result.ok) {
      setError(result.error ?? "Erreur");
    } else {
      setRoom(result.room);
      setNow(Date.now());
      await broadcastSync({ room: result.room, event: result.event });
    }
    setSubmitting(false);
  };

  const handleStart = async () => {
    if (!isHost || submitting) return;
    setSubmitting(true);
    setError("");
    const result = await startGame(room.id);
    if (!result.ok) {
      setError(result.error ?? "Erreur");
    } else {
      setRoom(result.room);
      setNow(Date.now());
      await broadcastSync({ room: result.room, event: result.event });
    }
    setSubmitting(false);
  };

  const handleRematch = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    const result = await rematch(room.id);
    if (!result.ok) {
      setError(result.error ?? "Erreur");
    } else {
      setRoom(result.room);
      setNow(Date.now());
      setPhase("picking");
      setChosenPosition(null);
      await broadcastSync({ room: result.room, event: result.event });
    }
    setSubmitting(false);
  };

  useEffect(() => {
    if (!waitingRematch || room.status !== "waiting" || isParticipant) return;
    let cancelled = false;
    (async () => {
      const result = await joinRoom(room.id);
      if (cancelled) return;
      if (result.ok) {
        setRoom(result.room);
        setNow(Date.now());
        await broadcastSync({ room: result.room, event: result.event });
        setWaitingRematch(false);
      }
    })();
    return () => { cancelled = true; };
  }, [waitingRematch, room.status, room.id, isParticipant, broadcastSync]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const sortedByScore = useMemo(
    () => [...room.participants].sort((a, b) => b.score - a.score),
    [room.participants],
  );

  // ── WAITING ────────────────────────────────────────────────────────────────
  if (room.status === "waiting") {
    return (
      <div className="space-y-6">
        <div className="card p-8 text-center">
          <Users size={48} className="mx-auto mb-4 text-[color:var(--accent)]" />
          <h2 className="text-xl font-bold">Stream Clash multijoueur</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {room.streamClash.tracks.length} morceaux ·{" "}
            {room.difficulty === "easy" ? "Facile" : room.difficulty === "normal" ? "Normal" : "Difficile"}{" "}
            · {room.totalRounds} manches
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button onClick={copyLink} className="btn-ghost">
              {copied ? (
                <><Check size={14} className="text-green-400" /> Lien copié !</>
              ) : (
                <><Copy size={14} /> Copier le lien d&apos;invitation</>
              )}
            </button>

            {!isParticipant && (
              <button onClick={handleJoin} disabled={submitting} className="btn-primary">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Swords size={14} />}
                Rejoindre
              </button>
            )}

            {isHost && (
              <button
                onClick={handleStart}
                disabled={submitting || room.participants.length < 2}
                className="btn-primary"
                title={room.participants.length < 2 ? "Au moins 2 joueurs requis" : undefined}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Lancer la partie
              </button>
            )}
          </div>

          {!isHost && isParticipant && (
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              En attente que <strong>{room.hostName}</strong> lance la partie…
            </p>
          )}

          {disconnectedParticipants.length > 0 && (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-amber-300">
              <AlertTriangle size={14} />
              {disconnectedParticipants.length} joueur
              {disconnectedParticipants.length > 1 ? "s" : ""} déconnecté
              {disconnectedParticipants.length > 1 ? "s" : ""}.
            </p>
          )}
        </div>

        <div className="card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[color:var(--muted)]">
            Joueurs ({room.participants.length})
          </p>
          <div className="space-y-2">
            {room.participants.map((p) => (
              <div key={p.playerId} className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    background: p.playerId === room.hostId ? "var(--accent-dim)" : "var(--surface-2)",
                    color: p.playerId === room.hostId ? "var(--accent)" : "var(--muted-strong)",
                  }}
                >
                  {p.username[0]?.toUpperCase() ?? "?"}
                </div>
                <span className="font-medium">{p.username}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    isOnline(p.lastSeenAt, now)
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-rose-500/15 text-rose-300"
                  }`}
                >
                  {isOnline(p.lastSeenAt, now) ? "Connecté" : "Déconnecté"}
                </span>
                {p.playerId === room.hostId && (
                  <span className="ml-auto text-xs text-[color:var(--muted)]">Hôte</span>
                )}
              </div>
            ))}
            {room.participants.length === 1 && (
              <div className="flex items-center gap-3 opacity-50">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--surface-2)" }}
                >
                  ?
                </div>
                <span className="text-[color:var(--muted)]">En attente d&apos;autres joueurs…</span>
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <RoomChat channelKey="stream-clash" roomId={room.id} userId={userId} username={username} />
      </div>
    );
  }

  // ── FINISHED ───────────────────────────────────────────────────────────────
  if (room.status === "finished") {
    const iWon = room.winnerId === userId;
    const isDraw = !room.winnerId;
    const outcome = isDraw ? "draw" : iWon ? "victory" : "defeat";
    const winnerName = room.winnerId
      ? room.participants.find((p) => p.playerId === room.winnerId)?.username ?? "—"
      : null;

    return (
      <div className="space-y-6">
        <ChallengeOutcomeFx outcome={outcome} />
        <div className="card p-8 text-center">
          <Trophy
            size={48}
            className={`mx-auto mb-4 ${iWon ? "text-yellow-400" : isDraw ? "text-blue-400" : "text-[color:var(--muted)]"}`}
          />
          <h2 className="text-2xl font-black">
            {isDraw ? "Égalité !" : iWon ? "Victoire !" : `${winnerName} l'emporte`}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {sortedByScore.map((p, idx) => (
              <div
                key={p.playerId}
                className="rounded-xl p-4 text-center"
                style={{
                  background: idx === 0 && !isDraw ? "var(--accent-dim)" : "var(--surface-2)",
                  border: `1px solid ${idx === 0 && !isDraw ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                <p className="text-3xl font-black">{p.score}</p>
                <p className="mt-1 text-xs text-[color:var(--muted)] truncate">{p.username}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-[color:var(--muted)]">
                  #{idx + 1}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {isParticipant && (
            <button onClick={handleRematch} disabled={submitting} className="btn-primary flex-1 justify-center">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Swords size={16} />}
              Rejouer
            </button>
          )}
          {isSpectator && (
            <button
              type="button"
              onClick={() => setWaitingRematch((v) => !v)}
              className={waitingRematch ? "btn-primary flex-1 justify-center" : "btn-ghost flex-1 justify-center"}
            >
              {waitingRematch ? (
                <><Loader2 size={16} className="animate-spin" /> En attente de la revanche…</>
              ) : (
                <><Swords size={16} /> Attendre la revanche</>
              )}
            </button>
          )}
          <Link
            href={`/stream-clash/${room.streamClashId}`}
            className="btn-ghost flex-1 justify-center"
          >
            <ArrowRight size={16} /> Mode solo
          </Link>
        </div>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}
        <RoomChat channelKey="stream-clash" roomId={room.id} userId={userId} username={username} />
      </div>
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────────────────
  const pair = room.currentPair;
  if (!pair) return null;

  const timerProgress = ((TIMER_SECONDS - timeLeft) / TIMER_SECONDS) * 100;
  const myLastRound = me?.rounds[room.currentRound] ?? null;
  const isLastRound = room.currentRound + 1 >= room.totalRounds;

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      <div className="card px-4 py-2 text-sm">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-[color:var(--muted)]">
            Scores
          </span>
          <span className="text-xs text-[color:var(--muted)]">
            Manche {room.currentRound + 1}/{room.totalRounds}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {sortedByScore.map((p) => (
            <span
              key={p.playerId}
              className={`font-semibold ${p.playerId === userId ? "text-[color:var(--accent)]" : ""}`}
            >
              {p.username}: {p.score}
            </span>
          ))}
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]">
        {phase === "picking" ? (
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              timeLeft > 8 ? "bg-[color:var(--accent)]" : timeLeft > 4 ? "bg-yellow-400" : "bg-red-400"
            }`}
            style={{ width: `${100 - timerProgress}%` }}
          />
        ) : (
          <div className="h-full w-full bg-[color:var(--surface-2)]" />
        )}
      </div>

      {/* Question */}
      <div className="card p-4 text-center">
        <p className="font-semibold text-sm text-[color:var(--muted)]">
          Lequel a le meilleur score de popularité ?
        </p>
        {phase === "picking" && (
          <p
            className={`mt-1 text-2xl font-black tabular-nums ${
              timeLeft <= 4 ? "text-red-400 animate-pulse" : ""
            }`}
          >
            {timeLeft}s
          </p>
        )}
        {phase === "revealed" && myLastRound && (
          <div className="mt-2 flex items-center justify-center gap-2">
            {myLastRound.correct ? (
              <><Check size={18} className="text-green-400" /><span className="font-bold text-green-400">+{POINTS_PER_CORRECT} pts !</span></>
            ) : (
              <><X size={18} className="text-red-400" /><span className="font-bold text-red-400">Raté !</span></>
            )}
          </div>
        )}
      </div>

      {nowPlaying && (
        <TrackPreviewBar
          title={nowPlaying.title}
          isPlaying={isPlaying}
          onToggle={toggle}
        />
      )}

      {/* Tracks */}
      {!isSpectator && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StreamClashTrackCard
            track={pair.trackA}
            chosen={chosenPosition === pair.trackA.position}
            revealed={phase === "revealed"}
            isWinner={pair.trackA.rank >= pair.trackB.rank}
            onPick={() => handlePick(pair.trackA.position)}
            disabled={hasAnsweredThisRound || submitting}
            onPlayPreview={() =>
              void playTrack(
                String(pair.trackA.position),
                pair.trackA.title,
                pair.trackA.previewUrl,
                pair.trackA.externalId,
              )
            }
            isPlayingPreview={isPlayingKey(String(pair.trackA.position))}
            coverClassName="h-28 w-28"
          />
          <StreamClashTrackCard
            track={pair.trackB}
            chosen={chosenPosition === pair.trackB.position}
            revealed={phase === "revealed"}
            isWinner={pair.trackB.rank > pair.trackA.rank}
            onPick={() => handlePick(pair.trackB.position)}
            disabled={hasAnsweredThisRound || submitting}
            onPlayPreview={() =>
              void playTrack(
                String(pair.trackB.position),
                pair.trackB.title,
                pair.trackB.previewUrl,
                pair.trackB.externalId,
              )
            }
            isPlayingPreview={isPlayingKey(String(pair.trackB.position))}
            coverClassName="h-28 w-28"
          />
        </div>
      )}

      {isSpectator && (
        <div className="card p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--accent)]">
            Mode spectateur
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Tu observes la partie. Rejoins lors de la prochaine revanche.
          </p>
          <button
            type="button"
            onClick={() => setWaitingRematch((v) => !v)}
            className={`mt-3 ${waitingRematch ? "btn-primary" : "btn-ghost"}`}
          >
            {waitingRematch ? (
              <><Check size={14} className="text-green-400" /> Prêt pour la revanche</>
            ) : (
              <><Swords size={14} /> Prêt pour la revanche ?</>
            )}
          </button>
        </div>
      )}

      {/* Participants status */}
      {room.participants.length > 1 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {room.participants
            .filter((p) => p.playerId !== userId)
            .map((p) => (
              <div
                key={p.playerId}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                {hasAnsweredRound(p, room.currentRound) ? (
                  <Check size={14} className="text-green-400 shrink-0" />
                ) : (
                  <Loader2 size={14} className="animate-spin text-[color:var(--muted)] shrink-0" />
                )}
                <span className={`font-medium ${isOnline(p.lastSeenAt, now) ? "" : "opacity-60"}`}>
                  {p.username}
                </span>
                <span className="ml-auto text-xs text-[color:var(--muted)]">
                  {hasAnsweredRound(p, room.currentRound) ? "a répondu" : isOnline(p.lastSeenAt, now) ? "en cours…" : "déconnecté"}
                </span>
              </div>
            ))}
        </div>
      )}

      {disconnectedParticipants.length > 0 && (
        <p className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <AlertTriangle size={14} />
          {disconnectedParticipants.length} joueur{disconnectedParticipants.length > 1 ? "s" : ""} déconnecté
          {disconnectedParticipants.length > 1 ? "s" : ""}.
        </p>
      )}

      {/* Host: next round */}
      {isHost && phase === "revealed" && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleNextRound}
            disabled={submitting || (!allAnswered && timeLeft > 0)}
            className="btn-primary"
            title={!allAnswered && timeLeft > 0 ? `Encore ${timeLeft}s…` : undefined}
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isLastRound ? (
              <>Voir les résultats <Trophy size={14} /></>
            ) : (
              <>Suivant <ChevronRight size={14} /></>
            )}
          </button>
        </div>
      )}

      {!isHost && isParticipant && phase === "revealed" && (
        <p className="text-center text-sm text-[color:var(--muted)]">
          En attente de <strong>{room.hostName}</strong>…
        </p>
      )}

      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      <RoomChat channelKey="stream-clash" roomId={room.id} userId={userId} username={username} />
    </div>
  );
}
