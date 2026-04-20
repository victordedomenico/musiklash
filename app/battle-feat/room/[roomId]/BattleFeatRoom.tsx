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
  Loader2,
  ArrowRight,
  Play,
  Pause,
  Volume2,
} from "lucide-react";
import ArtistSearchInput from "@/components/ArtistSearchInput";
import type {
  ArtistResult,
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

const TURN_SECONDS = 20;

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

  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutClaimRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { volume } = usePreviewVolume();

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  const playPreview = useCallback((title: string | null, previewUrl: string | null) => {
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
      audio.onended = () => { setIsPlaying(false); setNowPlaying(null); };
      audioRef.current = audio;
      setNowPlaying({ title: title ?? "Extrait" });
      void audio.play().catch(() => null);
    }
  }, [volume]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) void audioRef.current.play().catch(() => null);
    else audioRef.current.pause();
  };

  // Stop and dispose audio when leaving the page.
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
  const isGuest = userId === room.guestId;
  const isSpectator = !isHost && !isGuest;
  const isMyTurn = room.currentTurnId === userId;
  const myJokers = isHost ? room.hostJokers : room.guestJokers;
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

  // While waiting, poll DB — broadcast alone is not always delivered to every tab.
  useEffect(() => {
    if (room.status !== "waiting") return;

    const pull = () => {
      void refreshRoomState(initialRoom.id).then((r) => {
        if (!r.ok) return;
        const cur = roomRef.current;
        const next = r.room;
        if (
          next.guestId !== cur.guestId ||
          next.status !== cur.status ||
          next.updatedAt !== cur.updatedAt
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
    if (room.status !== "playing") return;

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

  if (room.status === "waiting") {
    const canJoin = isSpectator && !room.guestId;
    const waitingForGuest = isHost && !room.guestId;
    const readyToStart = isHost && room.guestId;

    return (
      <div className="space-y-6">
        <div className="card p-8 text-center">
          <Users size={48} className="mx-auto mb-4 text-blue-400" />
          <h2 className="text-xl font-bold">Room BattleFeat</h2>

          {waitingForGuest ? (
            <>
              <p className="mt-2 text-[color:var(--muted)]">En attente d&apos;un adversaire…</p>
              <button onClick={copyLink} className="btn-ghost mx-auto mt-4">
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
            </>
          ) : null}

          {canJoin ? (
            <>
              <p className="mt-2 text-[color:var(--muted)]">
                {room.hostUsername} t&apos;invite à jouer !
              </p>
              <button onClick={handleJoin} disabled={submitting} className="btn-primary mx-auto mt-4">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                Rejoindre la partie
              </button>
            </>
          ) : null}

          {readyToStart ? (
            <div className="mt-4 space-y-4">
              <p className="font-semibold text-green-400">
                ✓ {room.guestUsername ?? "Adversaire"} a rejoint !
              </p>
              <p className="text-sm text-[color:var(--muted)]">
                Choisis l&apos;artiste de départ :
              </p>
              <ArtistSearchInput
                onSelect={handleStartGame}
                disabled={submitting}
                placeholder="Artiste de départ…"
                autoFocus
              />
            </div>
          ) : null}

          {isGuest ? (
            <p className="mt-4 text-[color:var(--muted)]">
              En attente que l&apos;hôte lance la partie…
            </p>
          ) : null}
        </div>

        {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}
      </div>
    );
  }

  if (room.status === "finished") {
    const iWon = room.winnerId === userId;

    return (
      <div className="space-y-6">
        <div className="card p-8 text-center">
          <Trophy
            size={48}
            className={`mx-auto mb-4 ${iWon ? "text-yellow-400" : "text-[color:var(--muted)]"}`}
          />
          <h2 className="text-2xl font-black">{iWon ? "Victoire !" : "Défaite"}</h2>
          <div className="mt-4 flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-2xl font-black">{room.hostScore}</p>
              <p className="text-xs text-[color:var(--muted)]">{room.hostUsername}</p>
            </div>
            <span className="text-xl text-[color:var(--muted)]">–</span>
            <div className="text-center">
              <p className="text-2xl font-black">{room.guestScore}</p>
              <p className="text-xs text-[color:var(--muted)]">{room.guestUsername ?? "?"}</p>
            </div>
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

        <div className="flex gap-3">
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
            Revanche
          </button>
          <Link href="/battle-feat" className="btn-ghost flex-1 justify-center">
            <ArrowRight size={16} /> Accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between px-4 py-2 text-sm">
        <span className={`font-semibold ${isHost ? "text-[color:var(--accent)]" : ""}`}>
          {room.hostUsername}: {room.hostScore}
        </span>
        <span className="text-[color:var(--muted)]">vs</span>
        <span className={`font-semibold ${!isHost ? "text-[color:var(--accent)]" : ""}`}>
          {room.guestUsername ?? "?"}: {room.guestScore}
        </span>
      </div>

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
              <button onClick={handleJoker} disabled={submitting} className="btn-ghost w-full text-sm">
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
              En attente de{" "}
              <strong className="text-white">
                {room.currentTurnId === room.hostId ? room.hostUsername : room.guestUsername}
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
