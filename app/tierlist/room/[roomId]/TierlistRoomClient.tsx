"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  Clock3,
  Copy,
  Crown,
  ListOrdered,
  Pause,
  Play,
  SkipForward,
  Swords,
  Users,
} from "lucide-react";
import DeezerAttribution from "@/components/DeezerAttribution";
import type {
  CollaborativeTrack,
  TierlistRoomSnapshot,
  TierlistRoundResolution,
} from "@/lib/collaborative-room";
import { usePreviewVolume } from "@/lib/audio-volume";
import { BRACKET_DUEL_SECONDS, remainingDuelSeconds } from "@/lib/bracket-room-rules";
import { fetchTrackPreview } from "@/lib/deezer-preview-client";
import { DEFAULT_TIERS } from "@/lib/tierlist-tiers";
import {
  expireTierlistRound,
  finishTierlistRound,
  joinTierlistRoom,
  refreshTierlistRoom,
  skipTierlistVote,
  startTierlistRoom,
  voteTierlistRoom,
} from "./actions";

function TrackPreview({ track }: { track: CollaborativeTrack }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { volume } = usePreviewVolume();
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    let cancelled = false;
    void fetchTrackPreview(track.deezerTrackId)
      .then((preview) => {
        if (!cancelled) setUrl(preview);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [track.deezerTrackId]);
  useEffect(
    () => () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
        audio.load();
      }
    },
    [],
  );
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const toggle = () => {
    if (!url) return;
    if (!audioRef.current) {
      const audio = new Audio();
      audio.onended = () => {
        setPlaying(false);
        setCurrentTime(0);
      };
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onloadedmetadata = () =>
        setDuration(Number.isFinite(audio.duration) ? audio.duration : 30);
      audio.volume = volume;
      audioRef.current = audio;
    }
    const audio = audioRef.current;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (audio.src !== url) {
      audio.src = url;
      audio.load();
      setCurrentTime(0);
    }
    audio.volume = volume;
    void audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  };
  const labelTime = (value: number) =>
    `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
  return (
    <div className="mx-auto mt-5 flex max-w-xs items-center gap-2">
      <button
        type="button"
        disabled={!url}
        onClick={toggle}
        className="btn-ghost shrink-0 text-xs disabled:cursor-not-allowed"
        aria-label={playing ? "Mettre l’extrait en pause" : "Écouter l’extrait"}
      >
        {playing ? <Pause size={15} /> : <Play size={15} />}
        {url ? (playing ? "Pause" : "Écouter") : "Extrait indisponible"}
      </button>
      <DeezerAttribution compact variant="icon" className="shrink-0" />
      <input
        type="range"
        min={0}
        max={Math.max(duration, 1)}
        value={Math.min(currentTime, duration)}
        disabled={!url}
        onChange={(event) => {
          const value = Number(event.target.value);
          if (audioRef.current) audioRef.current.currentTime = value;
          setCurrentTime(value);
        }}
        className="h-1 flex-1 accent-sky-300 disabled:opacity-40"
        aria-label="Position dans l’extrait"
      />
      <span className="w-9 text-right text-[11px] tabular-nums text-[color:var(--muted)]">
        {labelTime(playing ? currentTime : 0)}
      </span>
    </div>
  );
}

function ResolutionReveal({
  resolution,
  winner,
  onDone,
}: {
  resolution: TierlistRoundResolution;
  winner: CollaborativeTrack | null;
  onDone: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [coinLanded, setCoinLanded] = useState(!resolution.tie);
  const pileTier = DEFAULT_TIERS.find((tier) => tier.id === resolution.pileTierId);
  const faceTier = DEFAULT_TIERS.find((tier) => tier.id === resolution.faceTierId);
  const winnerTier = DEFAULT_TIERS.find((tier) => tier.id === resolution.tierId);
  const winningVotes = resolution.votesByTier[resolution.tierId] ?? 0;
  const rotation = resolution.coinSide === "face" ? 1620 : 1440;
  return (
    <motion.div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[80] grid place-items-center overflow-hidden bg-[#05070c]/95 px-4 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.1 : 0.28 }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.22),rgba(14,165,233,0.08)_42%,transparent_70%)]"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0.1 : 0.7 }}
      />
      <div className="relative w-full max-w-md text-center">
        {resolution.tie ? (
          <>
            <motion.p
              className="text-xs font-black uppercase tracking-[0.3em] text-amber-300"
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              Égalité · {winningVotes} vote{winningVotes > 1 ? "s" : ""}
            </motion.p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">Pile ou face</h2>
            <p className="mt-2 text-sm text-white/60">
              {pileTier?.label ?? "?"} contre {faceTier?.label ?? "?"}
            </p>
            <div className="mx-auto my-8 h-36 w-36 [perspective:900px]">
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                initial={{ rotateY: 0, y: -36 }}
                animate={{ rotateY: rotation, y: [0, -62, 0] }}
                transition={{
                  rotateY: { duration: reducedMotion ? 0.2 : 2.25, ease: [0.12, 0.72, 0.18, 1] },
                  y: {
                    duration: reducedMotion ? 0.2 : 2.25,
                    times: [0, 0.45, 1],
                    ease: "easeInOut",
                  },
                }}
                onAnimationComplete={() => setCoinLanded(true)}
              >
                <div className="absolute inset-0 grid place-items-center rounded-full border-[5px] border-amber-200 bg-[radial-gradient(circle_at_35%_28%,#fff2a8,#f59e0b_52%,#92400e)] text-xl font-black text-amber-950 shadow-[0_0_50px_rgba(245,158,11,0.42)] [backface-visibility:hidden]">
                  PILE
                </div>
                <div className="absolute inset-0 grid place-items-center rounded-full border-[5px] border-orange-200 bg-[radial-gradient(circle_at_35%_28%,#fed7aa,#ea580c_52%,#7c2d12)] text-xl font-black text-orange-950 shadow-[0_0_50px_rgba(234,88,12,0.42)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  FACE
                </div>
              </motion.div>
            </div>
            <AnimatePresence mode="wait">
              {coinLanded ? (
                <motion.p
                  key="landed"
                  className="text-sm font-black uppercase tracking-[0.28em] text-amber-200"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  {resolution.coinSide} !
                </motion.p>
              ) : (
                <motion.p
                  key="spinning"
                  className="text-sm uppercase tracking-[0.22em] text-white/55"
                  exit={{ opacity: 0 }}
                >
                  La pièce décide…
                </motion.p>
              )}
            </AnimatePresence>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Crown className="mx-auto text-amber-300" size={34} />
            <p className="mt-3 text-xs font-black uppercase tracking-[0.3em] text-amber-300">
              Majorité · {winningVotes} voix
            </p>
          </motion.div>
        )}
        {resolution.skippedCount > 0 ? (
          <p className="mt-3 text-xs text-white/45">
            {resolution.skippedCount} joueur{resolution.skippedCount > 1 ? "s ont" : " a"} passé
          </p>
        ) : null}
        <AnimatePresence>
          {coinLanded && winner ? (
            <motion.div
              className="mt-6"
              initial={{ opacity: 0, y: 24, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/55">
                Morceau vainqueur du vote
              </p>
              <div className="mx-auto w-44 overflow-hidden rounded-[26px] border border-white/15 bg-white/5 p-2 shadow-2xl">
                {winner.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={winner.coverUrl}
                    alt=""
                    className="aspect-square w-full rounded-[20px] object-cover"
                  />
                ) : null}
              </div>
              <h3 className="mx-auto mt-4 max-w-sm truncate text-2xl font-black text-white">
                {winner.title}
              </h3>
              <p className="mt-1 truncate text-sm text-white/60">{winner.artist}</p>
              {winnerTier ? (
                <span
                  className="mt-3 inline-flex rounded-full px-3 py-1 text-sm font-black text-black"
                  style={{ background: winnerTier.color }}
                >
                  Rang {winnerTier.label}
                </span>
              ) : null}
              <button type="button" onClick={onDone} className="btn-primary mt-6">
                Morceau suivant
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

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
  const [activeResolution, setActiveResolution] = useState<TierlistRoundResolution | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const seenResolutionRef = useRef(initialRoom.lastResolution?.id ?? null);
  const expiryAttemptRef = useRef<string | null>(null);
  const me = room.participants.find((participant) => participant.playerId === userId) ?? null;
  const isHost = room.hostId === userId;
  const hasVoted = room.ballots.some((ballot) => ballot.playerId === userId);
  const myBallot = room.ballots.find((ballot) => ballot.playerId === userId) ?? null;
  const currentTrack =
    room.tierlist.tracks.find((track) => track.position === room.currentPosition) ?? null;
  const currentTrackIndex = room.tierlist.tracks.findIndex(
    (track) => track.position === room.currentPosition,
  );
  const tracksByPosition = useMemo(
    () => new Map(room.tierlist.tracks.map((track) => [track.position, track])),
    [room.tierlist.tracks],
  );
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
  const voteCounts = room.ballots.reduce<Record<string, number>>(
    (counts, ballot) => {
      if (ballot.tierId !== null) counts[ballot.tierId] = (counts[ballot.tierId] ?? 0) + 1;
      return counts;
    },
    Object.fromEntries(DEFAULT_TIERS.map((tier) => [tier.id, 0])),
  );
  const acceptRoom = useCallback((nextRoom: TierlistRoomSnapshot) => {
    const resolution = nextRoom.lastResolution;
    if (resolution && resolution.id !== seenResolutionRef.current) {
      seenResolutionRef.current = resolution.id;
      setActiveResolution(resolution);
    }
    setRoom(nextRoom);
  }, []);

  useEffect(() => {
    if (room.status === "finished") return;
    const id = window.setInterval(() => {
      void refreshTierlistRoom(room.id).then((result) => {
        if (result.ok) acceptRoom(result.room);
      });
    }, 1500);
    return () => window.clearInterval(id);
  }, [acceptRoom, room.id, room.status]);
  useEffect(() => {
    if (room.status !== "playing") return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [room.positionStartedAt, room.status]);
  const timeLeft = remainingDuelSeconds(room.positionStartedAt, now);
  const timeLabel = `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(timeLeft % 60).padStart(2, "0")}`;
  const roundKey = currentTrack
    ? `${currentTrack.position}:${room.positionStartedAt ?? "pending"}`
    : null;
  useEffect(() => {
    if (
      room.status !== "playing" ||
      !me ||
      !currentTrack ||
      !room.positionStartedAt ||
      timeLeft > 0 ||
      !roundKey ||
      expiryAttemptRef.current === roundKey
    )
      return;
    expiryAttemptRef.current = roundKey;
    void expireTierlistRound(room.id).then((result) => {
      if (result.ok) {
        acceptRoom(result.room);
        return;
      }
      window.setTimeout(() => {
        if (expiryAttemptRef.current === roundKey) expiryAttemptRef.current = null;
        setNow(Date.now());
      }, 1000);
    });
  }, [
    acceptRoom,
    currentTrack,
    me,
    room.id,
    room.positionStartedAt,
    room.status,
    roundKey,
    timeLeft,
  ]);
  const run = (action: () => Promise<Awaited<ReturnType<typeof refreshTierlistRoom>>>) => {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (result.ok) acceptRoom(result.room);
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
  const revealedWinner = activeResolution
    ? (tracksByPosition.get(activeResolution.position) ?? null)
    : null;
  const resolutionOverlay = (
    <AnimatePresence>
      {activeResolution ? (
        <ResolutionReveal
          key={activeResolution.id}
          resolution={activeResolution}
          winner={revealedWinner}
          onDone={() => setActiveResolution(null)}
        />
      ) : null}
    </AnimatePresence>
  );

  return (
    <div className="space-y-5">
      {resolutionOverlay}
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
      ) : null}
      {room.status === "playing" && currentTrack ? (
        <section className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-sky-400/25 bg-sky-400/10">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex min-w-20 items-center gap-2 rounded-full px-3 py-1 font-black tabular-nums ${timeLeft <= 5 ? "bg-red-400/20 text-red-200" : timeLeft <= 10 ? "bg-amber-400/20 text-amber-200" : "bg-sky-400/15 text-sky-100"}`}
                >
                  <Clock3 size={15} />
                  {timeLabel}
                </span>
                <span>
                  Morceau {currentTrackIndex + 1} / {room.tierlist.tracks.length} · réponses :{" "}
                  {room.ballots.length} / {room.participants.length}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasVoted ? (
                  <span className="inline-flex items-center gap-1 text-emerald-200">
                    <Check size={15} />
                    {myBallot?.tierId === null ? "Tu as passé" : "Ton vote est enregistré"}
                  </span>
                ) : me ? (
                  <button
                    type="button"
                    disabled={pending || timeLeft === 0}
                    onClick={() => run(() => skipTierlistVote(room.id))}
                    className="btn-ghost text-xs"
                  >
                    <SkipForward size={15} />
                    Passer mon vote
                  </button>
                ) : null}
                {isHost && room.ballots.length < room.participants.length ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => finishTierlistRound(room.id))}
                    className="btn-ghost border-amber-400/35 bg-amber-400/10 text-xs text-amber-100 hover:bg-amber-400/20"
                  >
                    <Swords size={15} />
                    Finir le tour
                  </button>
                ) : null}
              </div>
            </div>
            <motion.div
              className={`h-1 origin-left ${timeLeft <= 5 ? "bg-red-400" : "bg-sky-400"}`}
              animate={{ scaleX: timeLeft / BRACKET_DUEL_SECONDS }}
              transition={{ duration: 0.2, ease: "linear" }}
            />
          </div>
          <section className="card p-5 text-center">
            {currentTrack.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentTrack.coverUrl}
                alt=""
                className="mx-auto h-32 w-32 rounded-2xl object-cover shadow-lg"
              />
            ) : null}
            <h2 className="mt-4 text-xl font-bold">{currentTrack.title}</h2>
            <p className="text-sm text-[color:var(--muted)]">{currentTrack.artist}</p>
            <TrackPreview key={currentTrack.deezerTrackId} track={currentTrack} />
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {DEFAULT_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  disabled={!me || hasVoted || pending || timeLeft === 0}
                  onClick={() => run(() => voteTierlistRoom(room.id, tier.id))}
                  className="rounded-xl border px-2 py-3 font-black text-black transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: tier.color, borderColor: tier.color }}
                >
                  <span className="block text-lg">{tier.label}</span>
                  <motion.span
                    key={voteCounts[tier.id]}
                    initial={{ scale: 0.72, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mt-1 block text-[11px] font-bold"
                  >
                    {voteCounts[tier.id]} vote{voteCounts[tier.id] > 1 ? "s" : ""}
                  </motion.span>
                </button>
              ))}
            </div>
            {!me ? <p className="mt-4 text-sm text-sky-200">Tu observes cette room.</p> : null}
          </section>
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
