"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Copy,
  Check,
  X,
  AlertTriangle,
  Trophy,
  Loader2,
  Play,
  Pause,
  SkipForward,
  Swords,
  ArrowRight,
  Music,
  Download,
  Share2,
} from "lucide-react";
import Link from "next/link";
import type {
  BlindtestRoomSnapshot,
  BlindtestRoomBroadcastPayload,
  BlindtestParticipant,
} from "@/lib/blindtest-room";
import type { BlindtestAnswer } from "@/components/BlindtestGame";
import { POINTS_TITLE, POINTS_ARTIST } from "@/components/BlindtestGame";
import ChallengeOutcomeFx from "@/components/ChallengeOutcomeFx";
import { downloadNodeAsPng } from "@/lib/download-png";
import {
  joinRoom,
  startGame,
  submitAnswer,
  nextTrack,
  rematch,
  refreshRoomState,
} from "./actions";
import { usePreviewVolume } from "@/lib/audio-volume";
import { isSingleArtistBlindtest } from "@/lib/blindtest-utils";

const TIMER_SECONDS = 30;
const PRESENCE_GRACE_SECONDS = 45;
// Must stay comfortably above the server heartbeat interval (~10s) + poll
// delay (~2.5s) to avoid false "déconnecté" warnings.
const PRESENCE_WARNING_SECONDS = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isOnline(lastSeenAt: string | null, now: number): boolean {
  if (!lastSeenAt) return false;
  const ts = Date.parse(lastSeenAt);
  if (Number.isNaN(ts)) return false;
  return now - ts <= PRESENCE_GRACE_SECONDS * 1000;
}

function answeredOn(p: BlindtestParticipant, position: number): boolean {
  return p.answers.some((a) => a.position === position);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AnswerRow({
  label,
  truth,
  guess,
  correct,
  points,
}: {
  label: string;
  truth: string;
  guess: string;
  correct: boolean;
  points: number;
}) {
  return (
    <div className="rounded-lg border border-[color:var(--border)] p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          {label}
        </span>
        <span
          className={`flex items-center gap-1 text-xs font-bold ${
            correct ? "text-green-400" : "text-red-400"
          }`}
        >
          {correct ? <Check size={12} /> : <X size={12} />}
          {correct ? `+${points} pt${points > 1 ? "s" : ""}` : "0 pt"}
        </span>
      </div>
      <p className="font-semibold">{truth}</p>
      {!correct && guess && (
        <p className="text-sm text-[color:var(--muted)] line-through mt-0.5">{guess}</p>
      )}
    </div>
  );
}

function ParticipantStatus({
  p,
  answered,
  online,
  isHost,
}: {
  p: BlindtestParticipant;
  answered: boolean;
  online: boolean;
  isHost: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {answered ? (
        <Check size={14} className="text-green-400 shrink-0" />
      ) : (
        <Loader2 size={14} className="animate-spin text-[color:var(--muted)] shrink-0" />
      )}
      <span className={`font-medium ${online ? "" : "opacity-60"}`}>
        {p.username}
        {isHost ? (
          <span className="ml-1 text-[10px] uppercase tracking-wider text-[color:var(--muted)]">
            (hôte)
          </span>
        ) : null}
      </span>
      <span className="text-[color:var(--muted)] text-xs ml-auto">
        {answered ? "a répondu" : online ? "en cours…" : "déconnecté"}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BlindtestRoomClient({
  initialRoom,
  userId,
}: {
  initialRoom: BlindtestRoomSnapshot;
  userId: string;
}) {
  const [room, setRoom] = useState(initialRoom);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Per-track local state
  type Phase = "loading" | "playing" | "revealed";
  const [phase, setPhase] = useState<Phase>("loading");
  const [guessTitle, setGuessTitle] = useState("");
  const [guessArtist, setGuessArtist] = useState("");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const freshUrlRef = useRef("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const { volume } = usePreviewVolume();

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  // Refs to avoid stale closures
  const guessRef = useRef({ title: "", artist: "" });
  const phaseRef = useRef<Phase>("loading");
  const roomRef = useRef(room);

  useEffect(() => {
    guessRef.current = { title: guessTitle, artist: guessArtist };
  }, [guessTitle, guessArtist]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

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

  const others = useMemo(
    () => room.participants.filter((p) => p.playerId !== userId),
    [room.participants, userId],
  );

  const myAnswers: BlindtestAnswer[] = me?.answers ?? [];
  const myScore = me?.score ?? 0;

  const hasSubmittedThisTrack = myAnswers.some((a) => a.position === room.currentTrack);
  const allOthersAnswered =
    others.length > 0 && others.every((o) => answeredOn(o, room.currentTrack));
  const everyoneAnsweredThisTrack = hasSubmittedThisTrack && allOthersAnswered;
  const myLastAnswer = myAnswers.find((a) => a.position === room.currentTrack) ?? null;

  // Count at-risk (disconnected) participants to show a single warning.
  const disconnectedParticipants = useMemo(() => {
    if (room.status !== "playing" && room.status !== "waiting") return [];
    return room.participants.filter((p) => {
      if (p.playerId === userId) return false;
      if (!p.lastSeenAt) return true;
      const ts = Date.parse(p.lastSeenAt);
      if (Number.isNaN(ts)) return true;
      const elapsed = Math.floor((now - ts) / 1000);
      return elapsed >= PRESENCE_WARNING_SECONDS;
    });
  }, [now, room.participants, room.status, userId]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  const timeLeft = useMemo(() => {
    if (room.status !== "playing") return TIMER_SECONDS;
    const anchor = room.trackStartedAt ?? room.updatedAt;
    const elapsed = Math.floor((now - Date.parse(anchor)) / 1000);
    return Math.max(0, TIMER_SECONDS - elapsed);
  }, [now, room.status, room.trackStartedAt, room.updatedAt]);

  // ── Supabase realtime ──────────────────────────────────────────────────────
  const broadcastSync = useCallback(async (payload: BlindtestRoomBroadcastPayload) => {
    if (!channelRef.current) return;
    await channelRef.current.send({
      type: "broadcast",
      event: "room-sync",
      payload,
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`blindtest:room:${initialRoom.id}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "room-sync" }, (msg) => {
        const sync = msg.payload as BlindtestRoomBroadcastPayload;
        setRoom(sync.room);
        setNow(Date.now());

        const prevTrack = roomRef.current.currentTrack;
        const ev = sync.event;
        if (
          sync.room.currentTrack !== prevTrack ||
          ev?.type === "game-start" ||
          ev?.type === "rematch"
        ) {
          setPhase("loading");
          setGuessTitle("");
          setGuessArtist("");
          audioRef.current?.pause();
          freshUrlRef.current = "";
        }
      })
      .subscribe();

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [initialRoom.id]);

  // Poll DB as a safety net — broadcast alone is not always delivered to every tab.
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
              c.answers.length === p.answers.length &&
              c.lastSeenAt === p.lastSeenAt
            );
          });
        if (
          next.status !== cur.status ||
          next.updatedAt !== cur.updatedAt ||
          next.currentTrack !== cur.currentTrack ||
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

  // ── Fetch fresh preview URL ────────────────────────────────────────────────
  useEffect(() => {
    if (room.status !== "playing") return;
    const track = room.blindtest.tracks[room.currentTrack];
    if (!track) return;

    freshUrlRef.current = "";
    audioRef.current?.pause();

    fetch(`/api/deezer/track/${track.deezerTrackId}`)
      .then((r) => r.json())
      .then((d: { preview?: string }) => {
        freshUrlRef.current = d.preview ?? "";
        setPhase("playing");
      })
      .catch(() => setPhase("playing"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.status, room.currentTrack]);

  // ── Auto-play when phase becomes "playing" ─────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    const url = freshUrlRef.current;
    if (!url) return;

    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    a.onended = () => setAudioPlaying(false);
    a.onpause = () => setAudioPlaying(false);
    a.pause();
    a.volume = volume;
    a.src = url;
    a.load();
    setAudioPlaying(true);
    a.play().catch(() => setAudioPlaying(false));

    return () => {
      a.pause();
    };
  }, [phase, volume]);

  // ── Timer tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (room.status !== "waiting" && room.status !== "playing") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [room.status, room.currentTrack]);

  // ── Server submit ──────────────────────────────────────────────────────────
  const doSubmit = useCallback(
    async (title: string, artist: string) => {
      if (phaseRef.current === "revealed") return;
      if (isSpectator) return;
      audioRef.current?.pause();
      setAudioPlaying(false);
      setPhase("revealed");

      const r = roomRef.current;
      const result = await submitAnswer(r.id, r.currentTrack, title, artist);
      if (!result.ok) return;
      setRoom(result.room);
      await broadcastSync({ room: result.room, event: result.event });
    },
    [isSpectator, broadcastSync],
  );

  // ── Auto-submit when timer hits 0 ─────────────────────────────────────────
  const autoSubmittedRef = useRef<number>(-1);
  useEffect(() => {
    if (
      phase !== "playing" ||
      timeLeft > 0 ||
      hasSubmittedThisTrack ||
      autoSubmittedRef.current === room.currentTrack
    ) {
      return;
    }
    autoSubmittedRef.current = room.currentTrack;
    void doSubmit(guessRef.current.title, guessRef.current.artist);
  }, [timeLeft, phase, hasSubmittedThisTrack, room.currentTrack, doSubmit]);

  // ── Manual submit ──────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (phase !== "playing" || hasSubmittedThisTrack) return;
    void doSubmit(guessTitle, guessArtist);
  };

  const handleNextTrack = async () => {
    if (!isHost || submitting) return;
    setSubmitting(true);
    setError("");
    const result = await nextTrack(room.id);
    if (!result.ok) {
      setError(result.error ?? "Erreur");
      setSubmitting(false);
      return;
    }
    setRoom(result.room);
    setNow(Date.now());
    if (result.event.type !== "game-end") {
      setPhase("loading");
      setGuessTitle("");
      setGuessArtist("");
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
      await broadcastSync({ room: result.room, event: result.event });
    }
    setSubmitting(false);
  };

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
        filename: `blindtest-room-${room.id}-resultat.png`,
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

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setAudioPlaying(true);
    }
  };

  const timerProgress = ((TIMER_SECONDS - timeLeft) / TIMER_SECONDS) * 100;
  const track = room.blindtest.tracks[room.currentTrack];

  const singleArtistBlindtest = useMemo(
    () => isSingleArtistBlindtest(room.blindtest.tracks),
    [room.blindtest.tracks],
  );

  const sortedForScoreboard = useMemo(
    () =>
      [...room.participants].sort((a, b) =>
        a.playerId === room.hostId ? -1 : b.playerId === room.hostId ? 1 : 0,
      ),
    [room.participants, room.hostId],
  );

  // ── WAITING ────────────────────────────────────────────────────────────────
  if (room.status === "waiting") {
    const canJoin = !isParticipant;
    const enoughPlayers = room.participants.length >= 2;

    return (
      <div className="space-y-6">
        <div className="card p-8 text-center">
          <Users size={48} className="mx-auto mb-4 text-[color:var(--accent)]" />
          <h2 className="text-xl font-bold">Blindtest multijoueur</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {room.blindtest.tracks.length} morceaux · 30 secondes par morceau
            {singleArtistBlindtest ? (
              <>
                {" "}
                · un seul artiste : tu ne saisis que le <strong>titre</strong>
              </>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            Visibilité:{" "}
            {room.visibility === "public"
              ? "publique (Explorer + lien)"
              : "privée (lien uniquement)"}
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            {room.participants.length} joueur{room.participants.length > 1 ? "s" : ""} connecté
            {room.participants.length > 1 ? "s" : ""}
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button onClick={copyLink} className="btn-ghost">
              {copied ? (
                <>
                  <Check size={14} className="text-green-400" /> Lien copié !
                </>
              ) : (
                <>
                  <Copy size={14} /> Copier le lien d&apos;invitation
                </>
              )}
            </button>

            {canJoin && (
              <button
                onClick={handleJoin}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Swords size={14} />
                )}
                Rejoindre la partie
              </button>
            )}

            {isHost && (
              <button
                onClick={handleStart}
                disabled={submitting || !enoughPlayers}
                className="btn-primary"
                title={!enoughPlayers ? "Au moins 2 joueurs requis" : undefined}
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                Lancer la partie
              </button>
            )}
          </div>

          {!isHost && isParticipant && (
            <p className="mt-4 text-[color:var(--muted)]">
              En attente que <strong>{room.hostName}</strong> lance la partie…
            </p>
          )}
          {!isHost && !isParticipant && (
            <p className="mt-4 text-sm text-[color:var(--muted)]">
              Tu peux rejoindre ou rester spectateur.
            </p>
          )}

          {disconnectedParticipants.length > 0 ? (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-amber-300">
              <AlertTriangle size={14} />
              {disconnectedParticipants.length} joueur
              {disconnectedParticipants.length > 1 ? "s" : ""} déconnecté
              {disconnectedParticipants.length > 1 ? "s" : ""}.
            </p>
          ) : null}
        </div>

        {/* Players */}
        <div className="card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[color:var(--muted)]">
            Joueurs ({room.participants.length})
          </p>
          <div className="space-y-2">
            {sortedForScoreboard.map((p) => {
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
            {room.participants.length === 1 ? (
              <div className="flex items-center gap-3 opacity-50">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--surface-2)" }}
                >
                  ?
                </div>
                <span className="text-[color:var(--muted)]">
                  En attente d&apos;autres joueurs…
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  // ── FINISHED ───────────────────────────────────────────────────────────────
  if (room.status === "finished") {
    const iWon = room.winnerId === userId;
    const isDraw = !room.winnerId;
    const outcome = isDraw ? "draw" : iWon ? "victory" : "defeat";

    const ranked = [...room.participants].sort((a, b) => b.score - a.score);
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
              className={`mx-auto mb-4 ${iWon ? "text-yellow-400" : isDraw ? "text-blue-400" : "text-[color:var(--muted)]"}`}
            />
            <h2 className="text-2xl font-black">
              {isDraw
                ? "Égalité !"
                : iWon
                  ? "Victoire ! 🔥"
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
                  }}
                >
                  <p className="text-3xl font-black">{p.score}</p>
                  <p className="mt-1 text-xs text-[color:var(--muted)] truncate">
                    {p.username}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-[color:var(--muted)]">
                    #{idx + 1}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Track-by-track recap */}
          <div className="card p-6 space-y-4">
            <h3 className="font-bold">Morceau par morceau</h3>
            {room.blindtest.tracks.map((t) => (
              <div
                key={t.position}
                className="rounded-xl p-3 space-y-2"
                style={{ background: "var(--surface-2)" }}
              >
                <div className="flex items-center gap-3">
                  {t.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.coverUrl}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl"
                      style={{ background: "var(--surface)" }}
                    >
                      🎵
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-sm">{t.title}</p>
                    <p className="text-xs text-[color:var(--muted)]">{t.artist}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  {room.participants.map((p) => {
                    const a = p.answers.find((x) => x.position === t.position);
                    return (
                      <div key={p.playerId}>
                        <p className="font-semibold mb-1 truncate">{p.username}</p>
                        {a ? (
                          <>
                            <span
                              className={`inline-flex items-center gap-1 ${a.correctTitle ? "text-green-400" : "text-red-400"}`}
                            >
                              {a.correctTitle ? <Check size={10} /> : <X size={10} />} Titre
                            </span>
                            <span className="mx-1 text-[color:var(--muted)]">·</span>
                            <span
                              className={`inline-flex items-center gap-1 ${a.correctArtist ? "text-green-400" : "text-red-400"}`}
                            >
                              {a.correctArtist ? <Check size={10} /> : <X size={10} />} Artiste
                            </span>
                            <span className="ml-1 font-bold">+{a.points} pts</span>
                          </>
                        ) : (
                          <span className="text-[color:var(--muted)]">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
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
          {isParticipant && (
            <button
              onClick={handleRematch}
              disabled={submitting}
              className="btn-primary flex-1 justify-center"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Swords size={16} />}
              Rejouer
            </button>
          )}
          <Link
            href={`/blindtest/${room.blindtestId}`}
            className="btn-ghost flex-1 justify-center"
          >
            <ArrowRight size={16} /> Mode solo
          </Link>
        </div>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────────────────
  if (!track) return null;

  const trackCount = room.blindtest.tracks.length;
  const isLastTrack = room.currentTrack + 1 >= trackCount;

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      <div className="card px-4 py-2 text-sm">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-[color:var(--muted)]">
            Scores
          </span>
          <span className="text-xs text-[color:var(--muted)]">
            Morceau {room.currentTrack + 1}/{trackCount}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {sortedForScoreboard.map((p) => {
            const isMe = p.playerId === userId;
            return (
              <span
                key={p.playerId}
                className={`font-semibold ${isMe ? "text-[color:var(--accent)]" : ""}`}
              >
                {p.username}: {p.score}
              </span>
            );
          })}
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 w-full rounded-full bg-[color:var(--surface-2)] overflow-hidden">
        {phase === "playing" ? (
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              timeLeft > 15 ? "bg-green-400" : timeLeft > 7 ? "bg-yellow-400" : "bg-red-400"
            }`}
            style={{ width: `${100 - timerProgress}%` }}
          />
        ) : (
          <div className="h-full w-full bg-[color:var(--surface-2)]" />
        )}
      </div>

      {/* Main card */}
      <div className="card p-6 md:p-8">
        {phase === "loading" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <div className="h-44 w-44 rounded-xl bg-[color:var(--surface-2)] animate-pulse" />
            <p className="text-sm text-[color:var(--muted)]">Chargement…</p>
          </div>
        )}

        {phase === "playing" && !hasSubmittedThisTrack && !isSpectator && (
          <div className="flex flex-col md:flex-row gap-8 items-center">
            {/* Hidden cover */}
            <div className="relative h-44 w-44 shrink-0 rounded-xl overflow-hidden bg-[color:var(--surface-2)]">
              {track.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={track.coverUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ filter: "blur(28px) brightness(0.3)", transform: "scale(1.15)" }}
                />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Music size={32} className="text-white/60" />
                <span
                  className={`text-2xl font-black tabular-nums ${
                    timeLeft <= 7 ? "text-red-400 animate-pulse" : "text-white"
                  }`}
                >
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Inputs */}
            <div className="flex-1 w-full space-y-4">
              {singleArtistBlindtest ? (
                <p
                  className="rounded-xl border px-3 py-2 text-sm text-[color:var(--muted)]"
                  style={{ borderColor: "#2a3242", background: "#131822" }}
                >
                  Un seul artiste sur tout le blindtest : indique uniquement le{" "}
                  <strong className="text-[color:var(--foreground)]">titre</strong>. Les{" "}
                  <strong className="text-[color:var(--foreground)]">+{POINTS_ARTIST} pt</strong> artiste sont
                  ajoutés automatiquement.
                </p>
              ) : null}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                  Titre du morceau (+{POINTS_TITLE} pts)
                </label>
                <input
                  ref={titleInputRef}
                  className="input mt-1"
                  placeholder="Tape le titre…"
                  value={guessTitle}
                  onChange={(e) => setGuessTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              {!singleArtistBlindtest ? (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                    Artiste (+{POINTS_ARTIST} pt)
                  </label>
                  <input
                    className="input mt-1"
                    placeholder="Tape l'artiste…"
                    value={guessArtist}
                    onChange={(e) => setGuessArtist(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    autoComplete="off"
                  />
                </div>
              ) : null}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={toggleAudio}
                  className="btn-ghost"
                  aria-label={audioPlaying ? "Pause" : "Lire"}
                >
                  {audioPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button type="button" onClick={handleSubmit} className="btn-primary flex-1">
                  Valider
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="btn-ghost"
                  title="Passer"
                >
                  <SkipForward size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* After submitting but waiting for opponents / host to advance */}
        {(phase === "revealed" || hasSubmittedThisTrack) && myLastAnswer && (
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Revealed cover */}
            <div className="h-44 w-44 shrink-0 rounded-xl overflow-hidden bg-[color:var(--surface-2)]">
              {track.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={track.coverUrl}
                  alt=""
                  className="h-full w-full object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl">🎵</div>
              )}
            </div>

            <div className="flex-1 w-full space-y-3">
              <AnswerRow
                label={`Titre (+${POINTS_TITLE} pts)`}
                truth={track.title}
                guess={myLastAnswer.guessTitle}
                correct={myLastAnswer.correctTitle}
                points={POINTS_TITLE}
              />
              <AnswerRow
                label={
                  singleArtistBlindtest
                    ? `Artiste (+${POINTS_ARTIST} pt) · commun à tous les titres`
                    : `Artiste (+${POINTS_ARTIST} pt)`
                }
                truth={track.artist}
                guess={myLastAnswer.guessArtist}
                correct={myLastAnswer.correctArtist}
                points={POINTS_ARTIST}
              />

              <div className="flex items-center justify-between pt-1">
                <p className="font-bold text-lg">
                  +{myLastAnswer.points} pt{myLastAnswer.points !== 1 ? "s" : ""}
                  <span className="ml-2 text-sm font-normal text-[color:var(--muted)]">
                    Score: {myScore}
                  </span>
                </p>
                {isHost && (
                  <button
                    type="button"
                    onClick={handleNextTrack}
                    disabled={submitting || (!everyoneAnsweredThisTrack && timeLeft > 0)}
                    className="btn-primary"
                    title={
                      !everyoneAnsweredThisTrack && timeLeft > 0
                        ? `Encore ${timeLeft}s…`
                        : ""
                    }
                  >
                    {submitting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : isLastTrack ? (
                      "Voir les résultats →"
                    ) : (
                      "Suivant →"
                    )}
                  </button>
                )}
                {!isHost && isParticipant && (
                  <p className="text-sm text-[color:var(--muted)]">
                    En attente de <strong>{room.hostName}</strong>…
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Spectator / waiting state */}
        {phase === "playing" && isSpectator && (
          <div className="flex flex-col items-center gap-4 py-10">
            <Music size={40} className="text-[color:var(--accent)]" />
            <p className="text-sm text-[color:var(--muted)]">Mode spectateur</p>
            <span className="text-2xl font-black tabular-nums">{timeLeft}s</span>
          </div>
        )}
      </div>

      {/* Participants status */}
      {others.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {others.map((p) => (
            <ParticipantStatus
              key={p.playerId}
              p={p}
              answered={answeredOn(p, room.currentTrack)}
              online={isOnline(p.lastSeenAt, now)}
              isHost={p.playerId === room.hostId}
            />
          ))}
        </div>
      )}

      {disconnectedParticipants.length > 0 ? (
        <p className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <AlertTriangle size={14} />
          {disconnectedParticipants.length} joueur
          {disconnectedParticipants.length > 1 ? "s" : ""} déconnecté
          {disconnectedParticipants.length > 1 ? "s" : ""}.
        </p>
      ) : null}

      {/* Host: timer + next track hint */}
      {isHost && phase === "revealed" && !everyoneAnsweredThisTrack && timeLeft > 0 && (
        <p className="text-center text-sm text-[color:var(--muted)]">
          Le bouton &quot;Suivant&quot; sera disponible dans {timeLeft}s…
        </p>
      )}

      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}
