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
  UserMinus,
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
import {
  forgetMultiplayerRoom,
  MULTIPLAYER_ROOMS_CHANGED_EVENT,
  rememberMultiplayerRoom,
} from "@/lib/multiplayer-room-resume";
import { fetchTrackPreview } from "@/lib/deezer-preview-client";
import { DEFAULT_TIERS } from "@/lib/tierlist-tiers";
import type { Dictionary } from "@/lib/i18n";
import {
  approveTierlistJoinRequest,
  clearTierlistVote,
  expireTierlistRound,
  finishTierlistRound,
  joinTierlistRoom,
  kickTierlistPlayer,
  rejectTierlistJoinRequest,
  refreshTierlistRoom,
  skipTierlistVote,
  startTierlistRoom,
  voteTierlistRoom,
} from "./actions";

function TrackPreview({
  track,
  texts,
}: {
  track: CollaborativeTrack;
  texts: Dictionary["multiplayerRoom"];
}) {
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
        aria-label={playing ? texts.pausePreview : texts.listenPreview}
      >
        {playing ? <Pause size={15} /> : <Play size={15} />}
        {url ? (playing ? texts.pause : texts.listenPreview) : texts.previewUnavailable}
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
        aria-label={texts.previewPosition}
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
  texts,
}: {
  resolution: TierlistRoundResolution;
  winner: CollaborativeTrack | null;
  onDone: () => void;
  texts: Dictionary["multiplayerRoom"];
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
              {texts.tie} · {winningVotes} {winningVotes === 1 ? texts.vote : texts.votes}
            </motion.p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">{texts.coinFlip}</h2>
            <p className="mt-2 text-sm text-white/60">
              {pileTier?.label ?? "?"} vs {faceTier?.label ?? "?"}
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
                  {texts.heads}
                </div>
                <div className="absolute inset-0 grid place-items-center rounded-full border-[5px] border-orange-200 bg-[radial-gradient(circle_at_35%_28%,#fed7aa,#ea580c_52%,#7c2d12)] text-xl font-black text-orange-950 shadow-[0_0_50px_rgba(234,88,12,0.42)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  {texts.tails}
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
                  {resolution.coinSide === "face" ? texts.tails : texts.heads}!
                </motion.p>
              ) : (
                <motion.p
                  key="spinning"
                  className="text-sm uppercase tracking-[0.22em] text-white/55"
                  exit={{ opacity: 0 }}
                >
                  {texts.coinDecides}
                </motion.p>
              )}
            </AnimatePresence>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Crown className="mx-auto text-amber-300" size={34} />
            <p className="mt-3 text-xs font-black uppercase tracking-[0.3em] text-amber-300">
              {texts.majority} · {winningVotes} {winningVotes === 1 ? texts.vote : texts.votes}
            </p>
          </motion.div>
        )}
        {resolution.skippedCount > 0 ? (
          <p className="mt-3 text-xs text-white/45">
            {resolution.skippedCount}{" "}
            {resolution.skippedCount === 1 ? texts.skippedOne : texts.skippedMany}
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
                {texts.winningTrack}
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
                  {texts.rank} {winnerTier.label}
                </span>
              ) : null}
              <button type="button" onClick={onDone} className="btn-primary mt-6">
                {texts.nextTrack}
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
  texts,
}: {
  initialRoom: TierlistRoomSnapshot;
  userId: string;
  username: string;
  texts: Dictionary["multiplayerRoom"];
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
  const isPending = room.pendingParticipants.some((participant) => participant.playerId === userId);
  const isRejected = room.rejectedPlayerIds.includes(userId);
  const isExcluded = room.excludedPlayerIds.includes(userId);
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
  useEffect(() => {
    if (room.status === "finished") {
      forgetMultiplayerRoom(window.localStorage, { id: room.id, kind: "tierlist" });
      window.dispatchEvent(new Event(MULTIPLAYER_ROOMS_CHANGED_EVENT));
      return;
    }
    rememberMultiplayerRoom(window.localStorage, {
      id: room.id,
      kind: "tierlist",
      title: room.tierlist.title,
    });
    window.dispatchEvent(new Event(MULTIPLAYER_ROOMS_CHANGED_EVENT));
  }, [room.id, room.status, room.tierlist.title]);
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
    if (me || room.previousHostId !== userId) return;
    void joinTierlistRoom(room.id).then((result) => {
      if (result.ok) acceptRoom(result.room);
    });
  }, [acceptRoom, me, room.id, room.previousHostId, userId]);

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
      else setError(texts.errors[result.error] ?? result.error);
    });
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(texts.cannotCopyLink);
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
          texts={texts}
        />
      ) : null}
    </AnimatePresence>
  );

  if (!me && isExcluded) {
    return (
      <section className="card border-red-400/30 p-6 text-center">
        <UserMinus className="mx-auto text-red-300" size={30} />
        <h2 className="mt-3 text-xl font-bold">{texts.excludedTitle}</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{texts.excludedHint}</p>
      </section>
    );
  }

  if (!me && isRejected) {
    return (
      <section className="card border-red-400/30 p-6 text-center">
        <UserMinus className="mx-auto text-red-300" size={30} />
        <h2 className="mt-3 text-xl font-bold">{texts.joinRequestRejectedTitle}</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{texts.joinRequestRejectedHint}</p>
      </section>
    );
  }

  if (!me && isPending) {
    return (
      <section className="card p-6 text-center">
        <Users className="mx-auto text-sky-300" size={30} />
        <h2 className="mt-3 text-xl font-bold">{texts.joinRequestPendingTitle}</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{texts.joinRequestPendingHint}</p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {resolutionOverlay}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold">{texts.roomTitle}</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              {room.participants.length}{" "}
              {room.participants.length === 1 ? texts.player : texts.players} · {texts.host}:{" "}
              {room.hostName}
            </p>
          </div>
          <button type="button" onClick={copyLink} className="btn-ghost text-sm">
            <Copy size={15} />
            {copied ? texts.copiedLink : texts.copyLink}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {room.participants.map((participant) => (
            <div
              key={participant.playerId}
              className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] py-1 pl-3 pr-1 text-xs"
            >
              <span>
                {participant.username}
                {participant.playerId === room.hostId ? ` · ${texts.hostSuffix}` : ""}
              </span>
              {isHost && participant.playerId !== userId ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => kickTierlistPlayer(room.id, participant.playerId))}
                  className="rounded-full p-1 text-[color:var(--muted)] transition hover:bg-red-400/15 hover:text-red-200 disabled:opacity-40"
                  aria-label={texts.removePlayer.replace("{name}", participant.username)}
                  title={texts.removePlayer.replace("{name}", participant.username)}
                >
                  <UserMinus size={13} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
      {isHost && room.pendingParticipants.length > 0 ? (
        <section className="card p-5">
          <p className="font-bold">{texts.pendingRequests}</p>
          <div className="mt-3 space-y-2">
            {room.pendingParticipants.map((participant) => (
              <div
                key={participant.playerId}
                className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
              >
                <span className="truncate">{participant.username}</span>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() => approveTierlistJoinRequest(room.id, participant.playerId))
                    }
                    className="btn-ghost border-emerald-400/30 text-xs text-emerald-100 hover:bg-emerald-400/10"
                  >
                    <Check size={14} />
                    {texts.approvePlayer}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() => rejectTierlistJoinRequest(room.id, participant.playerId))
                    }
                    className="btn-ghost border-red-400/30 text-xs text-red-100 hover:bg-red-400/10"
                  >
                    <UserMinus size={14} />
                    {texts.rejectPlayer}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {room.status === "waiting" ? (
        <section className="card p-6 text-center">
          <Users className="mx-auto text-sky-300" size={30} />
          <h2 className="mt-3 text-xl font-bold">{texts.waitingPlayers}</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">{texts.tierlistWaitingCopy}</p>
          {!me ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => joinTierlistRoom(room.id))}
              className="btn-primary mt-5"
            >
              {texts.requestToJoin}
            </button>
          ) : isHost ? (
            <button
              type="button"
              disabled={pending || room.participants.length < 2}
              onClick={() => run(() => startTierlistRoom(room.id))}
              className="btn-primary mt-5"
            >
              <ListOrdered size={16} />
              {texts.tierlistStart}
            </button>
          ) : (
            <p className="mt-5 text-sm text-sky-200">{texts.waitingHost}</p>
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
                  {texts.track} {currentTrackIndex + 1} / {room.tierlist.tracks.length} ·{" "}
                  {texts.responses}: {room.ballots.length} / {room.participants.length}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasVoted ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-emerald-200">
                      <Check size={15} />
                      {myBallot?.tierId === null ? texts.votePassed : texts.voteRecorded}
                    </span>
                    <button
                      type="button"
                      disabled={pending || timeLeft === 0}
                      onClick={() => run(() => clearTierlistVote(room.id))}
                      className="btn-ghost text-xs"
                    >
                      {texts.cancelVote}
                    </button>
                  </>
                ) : me ? (
                  <button
                    type="button"
                    disabled={pending || timeLeft === 0}
                    onClick={() => run(() => skipTierlistVote(room.id))}
                    className="btn-ghost text-xs"
                  >
                    <SkipForward size={15} />
                    {texts.skipVote}
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
                    {texts.finishRound}
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
            <TrackPreview key={currentTrack.deezerTrackId} track={currentTrack} texts={texts} />
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
                    {voteCounts[tier.id]} {voteCounts[tier.id] === 1 ? texts.vote : texts.votes}
                  </motion.span>
                </button>
              ))}
            </div>
            {!me ? <p className="mt-4 text-sm text-sky-200">{texts.spectator}</p> : null}
            {hasVoted && me ? (
              <p className="mt-4 text-xs text-[color:var(--muted)]">{texts.changeRankHint}</p>
            ) : null}
          </section>
          <section className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
            <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3">
              <p className="text-sm font-bold">{texts.votesTitle}</p>
              <p className="text-xs text-[color:var(--muted)]">{texts.votesEditable}</p>
            </div>
            <div className="divide-y divide-[color:var(--border)]">
              {room.participants.map((participant) => {
                const ballot = room.ballots.find(
                  (candidate) => candidate.playerId === participant.playerId,
                );
                const tier = DEFAULT_TIERS.find((candidate) => candidate.id === ballot?.tierId);
                return (
                  <div
                    key={participant.playerId}
                    className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium">
                      {participant.username}
                      {participant.playerId === userId ? ` · ${texts.youSuffix}` : ""}
                    </span>
                    <span
                      className={`max-w-[58%] truncate text-right text-xs font-semibold ${
                        tier
                          ? "text-sky-200"
                          : ballot?.tierId === null
                            ? "text-amber-200"
                            : "text-[color:var(--muted)]"
                      }`}
                    >
                      {tier ? `${texts.rank} ${tier.label}` : ballot ? texts.passed : texts.waiting}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </section>
      ) : null}
      {room.status === "finished" ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {texts.tierlistFinished}
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
