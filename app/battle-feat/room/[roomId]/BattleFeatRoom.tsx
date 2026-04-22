"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Copy,
  Check,
  Swords,
  Trophy,
  Clock,
  User,
  Zap,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Play,
  Pause,
  Volume2,
  Download,
  Share2,
} from "lucide-react";
import ArtistSearchInput from "@/components/ArtistSearchInput";
import ChallengeOutcomeFx from "@/components/ChallengeOutcomeFx";
import type {
  ArtistResult,
  BattleFeatParticipant,
  BattleFeatRoomSnapshot,
  RoomBroadcastPayload,
} from "@/lib/battle-feat";
import {
  endGameTimeout,
  joinRoom,
  rematch,
  refreshRoomState,
  startGame,
  submitMove,
  useJoker as playJoker,
} from "./actions";
import { usePreviewVolume } from "@/lib/audio-volume";
import { downloadNodeAsPng } from "@/lib/download-png";

const TURN_SECONDS = 20;
const PRESENCE_GRACE_SECONDS = 45;
// Must stay comfortably above the server heartbeat interval (~10s) + poll
// delay (~2.5s) to avoid false "déconnecté" warnings.
const PRESENCE_WARNING_SECONDS = 20;

function isOnline(lastSeenAt: string | null, now: number): boolean {
  if (!lastSeenAt) return false;
  const ts = Date.parse(lastSeenAt);
  if (Number.isNaN(ts)) return false;
  return now - ts <= PRESENCE_GRACE_SECONDS * 1000;
}

function ArtistBadge({
  name,
  pictureUrl,
  label,
  trackTitle,
  previewUrl,
  onPlayPreview,
}: {
  name: string;
  pictureUrl: string | null;
  label?: string;
  trackTitle?: string | null;
  previewUrl?: string | null;
  onPlayPreview?: (title: string | null, previewUrl: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] px-4 py-2.5 bg-[color:var(--surface)]">
      {pictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pictureUrl} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-2)]">
          <User size={16} className="text-[color:var(--muted)]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{name}</p>
        {trackTitle ? (
          <p className="truncate text-xs text-[color:var(--muted)]">🎵 {trackTitle}</p>
        ) : null}
      </div>
      {trackTitle && previewUrl && onPlayPreview ? (
        <button
          type="button"
          onClick={() => onPlayPreview(trackTitle, previewUrl)}
          className="btn-ghost !px-2.5 !py-1.5 text-xs"
        >
          <Play size={12} />
          Écouter
        </button>
      ) : null}
      {label ? <span className="shrink-0 text-xs text-[color:var(--muted)]">{label}</span> : null}
    </div>
  );
}

function PlayerChip({
  p,
  online,
  isCurrent,
  isMe,
}: {
  p: BattleFeatParticipant;
  online: boolean;
  isCurrent?: boolean;
  isMe?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
        p.eliminated
          ? "opacity-50 line-through border-[color:var(--border)]"
          : isCurrent
            ? "border-[color:var(--accent)] bg-[color:var(--accent-dim)]"
            : "border-[color:var(--border)]"
      }`}
    >
      <span className={`font-medium ${isMe ? "text-[color:var(--accent)]" : ""}`}>
        {p.username}
      </span>
      <span className="text-[color:var(--muted)]">· {p.score}</span>
      {!p.eliminated ? (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            online ? "bg-emerald-400" : "bg-rose-400"
          }`}
        />
      ) : null}
    </div>
  );
}

export default function BattleFeatRoom({
  initialRoom,
  userId,
}: {
  initialRoom: BattleFeatRoomSnapshot;
  userId: string;
}) {
  const [room, setRoom] = useState(initialRoom);
  const roomRef = useRef(room);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [nowPlaying, setNowPlaying] = useState<{ title: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutClaimRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const { volume } = usePreviewVolume();

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  const playPreview = useCallback(
    (title: string | null, previewUrl: string | null) => {
      if (!previewUrl) return;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = previewUrl;
        audioRef.current.volume = volume;
        setNowPlaying({ title: title ?? "Extrait" });
        void audioRef.current.play().catch(() => null);
      } else {
        const audio = new Audio(previewUrl);
        audio.volume = volume;
        audio.onplay = () => setIsPlaying(true);
        audio.onpause = () => setIsPlaying(false);
        audio.onended = () => {
          setIsPlaying(false);
          setNowPlaying(null);
        };
        audioRef.current = audio;
        setNowPlaying({ title: title ?? "Extrait" });
        void audio.play().catch(() => null);
      }
    },
    [volume],
  );

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) void audioRef.current.play().catch(() => null);
    else audioRef.current.pause();
  };

  useEffect(() => {
    return () => {
      if (!audioRef.current) return;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    };
  }, []);

  const isHost = userId === room.hostId;
  const me = useMemo(
    () => room.participants.find((p) => p.playerId === userId) ?? null,
    [room.participants, userId],
  );
  const isParticipant = me !== null;
  const isSpectator = !isParticipant;
  const isMyTurn = room.currentTurnId === userId;
  const myJokers = me?.jokers ?? 0;

  const currentTurnParticipant = useMemo(
    () => room.participants.find((p) => p.playerId === room.currentTurnId) ?? null,
    [room.participants, room.currentTurnId],
  );

  const disconnectedParticipants = useMemo(() => {
    if (room.status !== "playing" && room.status !== "waiting") return [];
    return room.participants.filter((p) => {
      if (p.eliminated) return false;
      if (p.playerId === userId) return false;
      if (!p.lastSeenAt) return true;
      const ts = Date.parse(p.lastSeenAt);
      if (Number.isNaN(ts)) return true;
      const elapsed = Math.floor((now - ts) / 1000);
      return elapsed >= PRESENCE_WARNING_SECONDS;
    });
  }, [now, room.participants, room.status, userId]);

  const turnKey = `${room.status}:${room.currentTurnId ?? "none"}:${room.updatedAt}`;

  const timeLeft = useMemo(() => {
    if (room.status !== "playing") return TURN_SECONDS;
    const startedAt = Date.parse(room.updatedAt);
    const elapsedSeconds = Math.floor((now - startedAt) / 1000);
    return Math.max(0, TURN_SECONDS - elapsedSeconds);
  }, [now, room.status, room.updatedAt]);

  const broadcastSync = useCallback(async (payload: RoomBroadcastPayload) => {
    if (!channelRef.current) return;
    await channelRef.current.send({
      type: "broadcast",
      event: "room-sync",
      payload,
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`battle-feat:room:${initialRoom.id}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "room-sync" }, (payload) => {
        const sync = payload.payload as RoomBroadcastPayload;
        setRoom(sync.room);
        setNow(Date.now());
      })
      .subscribe();

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [initialRoom.id]);

  // Poll DB as a safety net.
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
              c.jokers === p.jokers &&
              c.eliminated === p.eliminated &&
              c.lastSeenAt === p.lastSeenAt
            );
          });
        if (
          next.status !== cur.status ||
          next.currentTurnId !== cur.currentTurnId ||
          next.moves.length !== cur.moves.length ||
          next.updatedAt !== cur.updatedAt ||
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

  useEffect(() => {
    timeoutClaimRef.current = null;
  }, [turnKey]);

  useEffect(() => {
    if (room.status !== "waiting" && room.status !== "playing") return;

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [turnKey, room.status]);

  useEffect(() => {
    if (room.status !== "playing" || !isMyTurn || timeLeft > 0) return;
    if (timeoutClaimRef.current === turnKey) return;

    timeoutClaimRef.current = turnKey;

    void (async () => {
      setSubmitting(true);
      const result = await endGameTimeout(room.id);
      if (!result.ok) {
        setError(result.error ?? "Erreur room");
        timeoutClaimRef.current = null;
        setSubmitting(false);
        return;
      }
      setRoom(result.room);
      setNow(Date.now());
      await broadcastSync({ room: result.room, event: result.event });
      setSubmitting(false);
    })();
  }, [broadcastSync, isMyTurn, room.id, room.status, timeLeft, turnKey]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    if (!exportRef.current) return;
    setIsDownloading(true);
    try {
      await downloadNodeAsPng(exportRef.current, {
        filename: `battle-feat-room-${room.id}-resultat.png`,
        backgroundColor: "var(--surface)",
      });
    } catch {
      alert(
        "Impossible de générer le PNG pour le moment. Réessaie dans quelques secondes.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveAndShare = async () => {
    setSharing(true);
    try {
      const url = window.location.href;
      try {
        await navigator.clipboard.writeText(url);
        alert("Lien copié dans le presse-papiers !");
      } catch {
        window.prompt("Copie le lien :", url);
      }
    } finally {
      setSharing(false);
    }
  };

  const handleJoin = async () => {
    setSubmitting(true);
    setError("");
    const result = await joinRoom(room.id);
    if (!result.ok) {
      setError(result.error ?? "Erreur room");
    } else {
      setRoom(result.room);
      setNow(Date.now());
      await broadcastSync({ room: result.room, event: result.event });
    }
    setSubmitting(false);
  };

  const handleStartGame = async (artist: ArtistResult) => {
    setSubmitting(true);
    setError("");
    const result = await startGame(room.id, artist.id, artist.name, artist.pictureUrl);
    if (!result.ok) {
      setError(result.error ?? "Erreur room");
    } else {
      setRoom(result.room);
      setNow(Date.now());
      await broadcastSync({ room: result.room, event: result.event });
    }
    setSubmitting(false);
  };

  const handleMove = async (artist: ArtistResult) => {
    if (!isMyTurn || submitting) return;

    setSubmitting(true);
    setError("");

    const result = await submitMove(room.id, {
      id: artist.id,
      name: artist.name,
      pictureUrl: artist.pictureUrl,
    });

    if (!result.ok) {
      setError(result.error ?? "Erreur room");
    } else {
      if (!result.valid) {
        setError(result.error ?? "Coup invalide");
      }
      setRoom(result.room);
      setNow(Date.now());
      await broadcastSync({ room: result.room, event: result.event });
    }

    setSubmitting(false);
  };

  const handleJoker = async () => {
    if (!isMyTurn || myJokers < 1 || submitting) return;

    setSubmitting(true);
    setError("");

    const result = await playJoker(room.id);
    if (!result.ok) {
      setError(result.error ?? "Erreur room");
    } else {
      setRoom(result.room);
      setNow(Date.now());
      await broadcastSync({ room: result.room, event: result.event });
    }

    setSubmitting(false);
  };

  const timerProgress = ((TURN_SECONDS - timeLeft) / TURN_SECONDS) * 100;

  const sortedByPosition = useMemo(
    () => [...room.participants].sort((a, b) => a.position - b.position),
    [room.participants],
  );

  // ── WAITING ────────────────────────────────────────────────────────────────
  if (room.status === "waiting") {
    const canJoin = !isParticipant;
    const enoughPlayers = room.participants.length >= 2;
    const readyToStart = isHost && enoughPlayers;

    return (
      <div className="space-y-6">
        <div className="card p-8 text-center">
          <Users size={48} className="mx-auto mb-4 text-blue-400" />
          <h2 className="text-xl font-bold">Room BattleFeat</h2>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            {room.participants.length} joueur{room.participants.length > 1 ? "s" : ""} connecté
            {room.participants.length > 1 ? "s" : ""}
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button onClick={copyLink} className="btn-ghost">
              {copied ? (
                <>
                  <Check size={14} className="text-green-400" /> Copié !
                </>
              ) : (
                <>
                  <Copy size={14} /> Copier le lien
                </>
              )}
            </button>

            {canJoin ? (
              <button
                onClick={handleJoin}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                Rejoindre la partie
              </button>
            ) : null}
          </div>

          {readyToStart ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-[color:var(--muted)]">
                Choisis l&apos;artiste de départ pour lancer la partie :
              </p>
              <ArtistSearchInput
                onSelect={handleStartGame}
                disabled={submitting}
                placeholder="Artiste de départ…"
                autoFocus
              />
            </div>
          ) : null}

          {isHost && !enoughPlayers ? (
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              En attente d&apos;autres joueurs (au moins 2 requis)…
            </p>
          ) : null}

          {!isHost && isParticipant ? (
            <p className="mt-4 text-[color:var(--muted)]">
              En attente que <strong>{room.hostUsername}</strong> lance la partie…
            </p>
          ) : null}

          {disconnectedParticipants.length > 0 ? (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-amber-300">
              <AlertTriangle size={14} />
              {disconnectedParticipants.length} joueur
              {disconnectedParticipants.length > 1 ? "s" : ""} déconnecté
              {disconnectedParticipants.length > 1 ? "s" : ""}.
            </p>
          ) : null}
        </div>

        <div className="card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[color:var(--muted)]">
            Joueurs ({room.participants.length})
          </p>
          <div className="space-y-2">
            {sortedByPosition.map((p) => {
              const online = isOnline(p.lastSeenAt, now);
              const isThisHost = p.playerId === room.hostId;
              return (
                <div key={p.playerId} className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      background: isThisHost ? "var(--accent-dim)" : "var(--surface-2)",
                      color: isThisHost ? "var(--accent)" : "var(--muted-strong)",
                    }}
                  >
                    {p.username[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span className="font-medium">{p.username}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      online
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {online ? "Connecté" : "Déconnecté"}
                  </span>
                  {isThisHost ? (
                    <span className="ml-auto text-xs text-[color:var(--muted)]">Hôte</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}
      </div>
    );
  }

  // ── FINISHED ───────────────────────────────────────────────────────────────
  if (room.status === "finished") {
    const iWon = room.winnerId === userId;
    const isDraw = !room.winnerId;
    const outcome = isDraw ? "draw" : iWon ? "victory" : "defeat";

    const ranked = [...room.participants].sort((a, b) => {
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
      return b.score - a.score;
    });
    const winnerName = room.winnerId
      ? room.participants.find((p) => p.playerId === room.winnerId)?.username ?? "—"
      : null;

    return (
      <div className="space-y-6">
        <ChallengeOutcomeFx outcome={outcome} />
        <div ref={exportRef} className="space-y-6">
          <div className="card p-8 text-center">
            <Trophy
              size={48}
              className={`mx-auto mb-4 ${
                isDraw
                  ? "text-sky-400"
                  : iWon
                    ? "text-yellow-400"
                    : "text-[color:var(--muted)]"
              }`}
            />
            <h2 className="text-2xl font-black">
              {isDraw
                ? "Égalité !"
                : iWon
                  ? "Victoire !"
                  : `${winnerName} l'emporte`}
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {ranked.map((p, idx) => (
                <div
                  key={p.playerId}
                  className="rounded-xl p-4 text-center"
                  style={{
                    background:
                      idx === 0 && !isDraw ? "var(--accent-dim)" : "var(--surface-2)",
                    border:
                      idx === 0 && !isDraw
                        ? "1px solid var(--accent)"
                        : "1px solid var(--border)",
                    opacity: p.eliminated ? 0.7 : 1,
                  }}
                >
                  <p className="text-3xl font-black">{p.score}</p>
                  <p className="mt-1 text-xs text-[color:var(--muted)] truncate">
                    {p.username}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-[color:var(--muted)]">
                    {p.eliminated ? "Éliminé" : `#${idx + 1}`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="mb-3 font-bold">Historique</h3>
            <div className="space-y-2">
              {room.startingArtistName ? (
                <ArtistBadge
                  name={room.startingArtistName}
                  pictureUrl={room.startingArtistPic}
                  label="Départ"
                />
              ) : null}
              {room.moves.map((move, index) => (
                <ArtistBadge
                  key={`${move.artistId}-${index}`}
                  name={move.artistName}
                  pictureUrl={move.pictureUrl}
                  trackTitle={move.trackTitle}
                  previewUrl={move.previewUrl}
                  onPlayPreview={playPreview}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="no-export flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="btn-ghost flex-1 justify-center disabled:opacity-50"
          >
            <Download size={16} />
            {isDownloading ? "Génération…" : "Enregistrer en PNG"}
          </button>
          <button
            type="button"
            onClick={handleSaveAndShare}
            disabled={sharing}
            className="btn-primary flex-1 justify-center disabled:opacity-50"
          >
            <Share2 size={16} />
            {sharing ? "…" : "Sauvegarder et partager"}
          </button>
          {isParticipant ? (
            <button
              onClick={async () => {
                setSubmitting(true);
                setError("");
                const result = await rematch(room.id);
                if (!result.ok) {
                  setError(result.error ?? "Erreur");
                } else {
                  setRoom(result.room);
                  setNow(Date.now());
                  await broadcastSync({ room: result.room, event: result.event });
                }
                setSubmitting(false);
              }}
              disabled={submitting}
              className="btn-primary flex-1 justify-center"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Swords size={16} />}
              Rejouer
            </button>
          ) : null}
          <Link href="/battle-feat" className="btn-ghost flex-1 justify-center">
            <ArrowRight size={16} /> Accueil
          </Link>
        </div>
      </div>
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      <div className="card px-4 py-2 text-sm">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-[color:var(--muted)]">
            Scores
          </span>
          {currentTurnParticipant ? (
            <span className="text-xs text-[color:var(--muted)]">
              Tour de <strong>{currentTurnParticipant.username}</strong>
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {sortedByPosition.map((p) => (
            <PlayerChip
              key={p.playerId}
              p={p}
              online={isOnline(p.lastSeenAt, now)}
              isCurrent={p.playerId === room.currentTurnId}
              isMe={p.playerId === userId}
            />
          ))}
        </div>
      </div>

      {disconnectedParticipants.length > 0 ? (
        <p className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <AlertTriangle size={14} />
          {disconnectedParticipants.length} joueur
          {disconnectedParticipants.length > 1 ? "s" : ""} déconnecté
          {disconnectedParticipants.length > 1 ? "s" : ""}.
        </p>
      ) : null}

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            timeLeft > 15 ? "bg-green-400" : timeLeft > 7 ? "bg-yellow-400" : "bg-red-400"
          }`}
          style={{ width: `${100 - timerProgress}%` }}
        />
      </div>

      {nowPlaying && (
        <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5">
          <Volume2 size={14} className="shrink-0 text-[color:var(--accent)]" />
          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="text-[color:var(--muted)]">En écoute : </span>
            <span className="font-medium">{nowPlaying.title}</span>
          </p>
          <button
            onClick={togglePlayPause}
            className="shrink-0 rounded-full p-1 hover:bg-[color:var(--surface-2)] transition"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </div>
      )}

      <div className="card space-y-3 p-6">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
          Chaîne
        </h3>
        {room.startingArtistName && room.moves.length === 0 ? (
          <ArtistBadge
            name={room.startingArtistName}
            pictureUrl={room.startingArtistPic}
            label="Départ"
          />
        ) : null}
        {room.moves.slice(-4).map((move, index) => (
          <ArtistBadge
            key={`${move.artistId}-${index}`}
            name={move.artistName}
            pictureUrl={move.pictureUrl}
            trackTitle={move.trackTitle}
            previewUrl={move.previewUrl}
            onPlayPreview={playPreview}
          />
        ))}
      </div>

      <div className="card p-6">
        {isMyTurn ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-bold">
                <User size={16} className="text-[color:var(--accent)]" />
                À ton tour !
              </h3>
              <span
                className={`text-xl font-black tabular-nums ${
                  timeLeft <= 7 ? "animate-pulse text-red-400" : ""
                }`}
              >
                {timeLeft}s
              </span>
            </div>

            {room.currentArtistName ? (
              <div className="space-y-2">
                <p className="text-sm text-[color:var(--muted)]">
                  Trouve un artiste qui a feat avec{" "}
                  <strong className="text-white">{room.currentArtistName}</strong>
                </p>
                <ArtistBadge
                  name={room.currentArtistName}
                  pictureUrl={room.currentArtistPic}
                  label="Courant"
                />
              </div>
            ) : null}

            <ArtistSearchInput
              onSelect={handleMove}
              excludeIds={room.usedArtistIds}
              disabled={submitting}
              placeholder="Cherche un artiste avec un feat…"
              autoFocus
            />

            {myJokers > 0 ? (
              <button
                onClick={handleJoker}
                disabled={submitting}
                className="btn-ghost w-full text-sm"
              >
                <Zap size={14} className="text-yellow-400" />
                Joker ({myJokers})
              </button>
            ) : null}

            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6">
            <Clock size={32} className="animate-pulse text-[color:var(--muted)]" />
            <p className="text-sm text-[color:var(--muted)]">
              {isSpectator
                ? "Mode spectateur · "
                : null}
              En attente de{" "}
              <strong className="text-white">
                {currentTurnParticipant?.username ?? "…"}
              </strong>
              …
            </p>
            {room.currentArtistName ? (
              <ArtistBadge
                name={room.currentArtistName}
                pictureUrl={room.currentArtistPic}
                label="Courant"
              />
            ) : null}
            <span className="text-2xl font-black tabular-nums">{timeLeft}s</span>
          </div>
        )}
      </div>
    </div>
  );
}
