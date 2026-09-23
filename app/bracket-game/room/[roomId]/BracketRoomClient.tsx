"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Clock3, Copy, Crown, SkipForward, Swords, UserMinus, Users } from "lucide-react";
import MatchCard from "@/components/MatchCard";
import BracketGame from "@/components/BracketGame";
import type {
  BracketRoomSnapshot,
  BracketRoundResolution,
  CollaborativeTrack,
} from "@/lib/collaborative-room";
import { buildBracketState, totalRounds } from "@/lib/bracket";
import { bracketRoundLabel } from "@/lib/bracket-round-label";
import { BRACKET_DUEL_SECONDS, remainingDuelSeconds } from "@/lib/bracket-room-rules";
import type { Dictionary } from "@/lib/i18n";
import { fetchTrackDetails } from "@/lib/deezer-preview-client";
import { useSoundFx } from "@/lib/use-sound-fx";
import {
  forgetMultiplayerRoom,
  MULTIPLAYER_ROOMS_CHANGED_EVENT,
  rememberMultiplayerRoom,
} from "@/lib/multiplayer-room-resume";
import {
  approveBracketJoinRequest,
  clearBracketVote,
  expireBracketRound,
  finishBracketRound,
  heartbeatBracketHost,
  joinBracketRoom,
  kickBracketPlayer,
  rejectBracketJoinRequest,
  refreshBracketRoom,
  skipBracketVote,
  startBracketRoom,
  voteBracketRoom,
} from "./actions";

function ResolutionReveal({
  resolution,
  winner,
  trackA,
  trackB,
  onDone,
  texts,
}: {
  resolution: BracketRoundResolution;
  winner: CollaborativeTrack | null;
  trackA: CollaborativeTrack | null;
  trackB: CollaborativeTrack | null;
  onDone: () => void;
  texts: Dictionary["multiplayerRoom"];
}) {
  const reducedMotion = useReducedMotion();
  const [coinLanded, setCoinLanded] = useState(!resolution.tie);
  const coinRotation = resolution.coinSide === "face" ? 1620 : 1440;

  return (
    <motion.div
      key={resolution.id}
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
        className="pointer-events-none absolute h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.22),rgba(239,68,68,0.08)_42%,transparent_70%)]"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0.1 : 0.7 }}
      />

      <div className="relative w-full max-w-md text-center">
        {resolution.tie ? (
          <>
            <motion.p
              className="text-xs font-black uppercase tracking-[0.34em] text-amber-300"
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              {texts.tie} · {resolution.votesA}–{resolution.votesB}
            </motion.p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">{texts.coinFlip}</h2>
            <p className="mt-2 text-sm text-white/60">
              {texts.heads} · {trackA?.title ?? "?"}
              <span className="mx-2 text-white/30">—</span>
              {texts.tails} · {trackB?.title ?? "?"}
            </p>

            <div className="mx-auto my-8 h-36 w-36 [perspective:900px]">
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                initial={{ rotateY: 0, y: -36 }}
                animate={{ rotateY: coinRotation, y: [0, -62, 0] }}
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
                  {resolution.coinSide === "face" ? texts.tails : texts.heads} !
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
              {texts.majority} · {Math.max(resolution.votesA, resolution.votesB)} {texts.votes}
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
              <div className="mx-auto w-48 overflow-hidden rounded-[28px] border border-white/15 bg-white/5 p-2 shadow-2xl">
                {winner.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={winner.coverUrl}
                    alt=""
                    className="aspect-square w-full rounded-[22px] object-cover"
                  />
                ) : null}
              </div>
              <h3 className="mx-auto mt-4 max-w-sm truncate text-2xl font-black text-white">
                {winner.title}
              </h3>
              <p className="mt-1 truncate text-sm text-white/70">{winner.artist}</p>
              {winner.album ? (
                <p className="mt-0.5 truncate text-xs text-white/50">{winner.album}</p>
              ) : null}
              <button type="button" onClick={onDone} className="btn-primary mt-6">
                {texts.nextDuel}
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function BracketRoomClient({
  initialRoom,
  userId,
  locale,
  texts,
}: {
  initialRoom: BracketRoomSnapshot;
  userId: string;
  username: string;
  locale: "fr" | "en";
  texts: Dictionary["multiplayerRoom"];
}) {
  const [room, setRoom] = useState(initialRoom);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeResolution, setActiveResolution] = useState<BracketRoundResolution | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const [kicked, setKicked] = useState(false);
  const seenResolutionRef = useRef(initialRoom.lastResolution?.id ?? null);
  const wasParticipantRef = useRef(
    initialRoom.participants.some((participant) => participant.playerId === userId),
  );
  const expiryAttemptRef = useRef<string | null>(null);
  const warningAttemptRef = useRef<string | null>(null);
  const { play: playSound, unlock } = useSoundFx();
  const me = room.participants.find((participant) => participant.playerId === userId) ?? null;
  const isPending = room.pendingParticipants.some((participant) => participant.playerId === userId);
  const isRejected = room.rejectedPlayerIds.includes(userId);
  const isExcluded = room.excludedPlayerIds.includes(userId);
  const removedForAfk = room.lastResolution?.afkPlayerIds.includes(userId) ?? false;
  const isHost = room.hostId === userId;
  const hasVoted = room.ballots.some((ballot) => ballot.playerId === userId);
  const myBallot = room.ballots.find((ballot) => ballot.playerId === userId) ?? null;
  const tracksBySeed = useMemo(
    () => new Map(room.bracket.tracks.map((track) => [track.seed, track])),
    [room.bracket.tracks],
  );
  const [creditsByDeezerId, setCreditsByDeezerId] = useState<
    Map<number, { artist: string | null; album: string | null }>
  >(() => new Map());
  const creditFor = useCallback(
    (track: CollaborativeTrack) => {
      const extra = creditsByDeezerId.get(track.deezerTrackId);
      return {
        artist: track.artist?.trim() || extra?.artist?.trim() || "",
        album: track.album?.trim() || extra?.album?.trim() || "",
      };
    },
    [creditsByDeezerId],
  );

  useEffect(() => {
    if (!room.currentPair) return;
    const pair = [
      tracksBySeed.get(room.currentPair.seedA),
      tracksBySeed.get(room.currentPair.seedB),
    ].filter((track): track is CollaborativeTrack => Boolean(track));
    const missing = pair.filter((track) => !track.album?.trim() || !track.artist?.trim());
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map(async (track) => {
        try {
          const details = await fetchTrackDetails(track.deezerTrackId);
          return details ? ([track.deezerTrackId, details] as const) : null;
        } catch {
          return null;
        }
      }),
    ).then((rows) => {
      if (cancelled) return;
      setCreditsByDeezerId((prev) => {
        const next = new Map(prev);
        for (const row of rows) {
          if (!row) continue;
          next.set(row[0], { artist: row[1].artist, album: row[1].album });
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [room.currentPair, tracksBySeed]);
  const bracketState = useMemo(
    () =>
      buildBracketState(
        room.bracket.size,
        room.votes,
        room.bracket.tracks.length,
        room.bracket.drawVersion,
      ),
    [room.bracket.drawVersion, room.bracket.size, room.bracket.tracks.length, room.votes],
  );
  const currentRound = bracketState.rounds.length;
  const realPairings = (bracketState.rounds.at(-1) ?? []).filter(
    (pairing) => pairing.seedB <= room.bracket.tracks.length,
  );
  const currentDuelIndex = room.currentPair
    ? Math.max(
        0,
        realPairings.findIndex((pairing) => pairing.matchIndex === room.currentPair?.matchIndex),
      )
    : 0;
  const roundProgressLabel = `${bracketRoundLabel(currentRound, totalRounds(room.bracket.size), locale)} — Duel ${currentDuelIndex + 1} / ${realPairings.length}`;
  const timeLeft = room.timerEnabled ? remainingDuelSeconds(room.duelStartedAt, now) : null;
  const timerExpired = timeLeft === 0;
  const timeLabel =
    timeLeft === null
      ? null
      : `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(timeLeft % 60).padStart(2, "0")}`;
  const roundKey = room.currentPair
    ? `${currentRound}:${room.currentPair.matchIndex}:${room.duelStartedAt ?? "pending"}`
    : null;

  useEffect(() => {
    if (room.status === "finished") {
      forgetMultiplayerRoom(window.localStorage, { id: room.id, kind: "bracket" });
      window.dispatchEvent(new Event(MULTIPLAYER_ROOMS_CHANGED_EVENT));
      return;
    }
    rememberMultiplayerRoom(window.localStorage, {
      id: room.id,
      kind: "bracket",
      title: room.bracket.title,
    });
    window.dispatchEvent(new Event(MULTIPLAYER_ROOMS_CHANGED_EVENT));
  }, [room.bracket.title, room.id, room.status]);

  const acceptRoom = useCallback((nextRoom: BracketRoomSnapshot) => {
    const resolution = nextRoom.lastResolution;
    if (resolution && resolution.id !== seenResolutionRef.current) {
      seenResolutionRef.current = resolution.id;
      setActiveResolution(resolution);
    }
    setRoom(nextRoom);
  }, []);

  useEffect(() => {
    if (me || room.previousHostId !== userId) return;
    void joinBracketRoom(room.id).then((result) => {
      if (result.ok) acceptRoom(result.room);
    });
  }, [acceptRoom, me, room.id, room.previousHostId, userId]);

  useEffect(() => {
    if (me) {
      wasParticipantRef.current = true;
      return;
    }
    if (!wasParticipantRef.current || isHost || removedForAfk) return;
    wasParticipantRef.current = false;
    setKicked(true);
    const id = window.setTimeout(() => setKicked(false), 6000);
    return () => window.clearTimeout(id);
  }, [isHost, me, removedForAfk]);

  useEffect(() => {
    const activateAudio = () => unlock();
    window.addEventListener("pointerdown", activateAudio, { once: true });
    return () => window.removeEventListener("pointerdown", activateAudio);
  }, [unlock]);

  useEffect(() => {
    if (room.status === "finished") return;
    const id = window.setInterval(() => {
      void refreshBracketRoom(room.id).then((result) => {
        if (result.ok) acceptRoom(result.room);
      });
    }, 1500);
    return () => window.clearInterval(id);
  }, [acceptRoom, room.id, room.status]);

  useEffect(() => {
    if (room.status !== "playing" || !room.timerEnabled) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [room.duelStartedAt, room.status, room.timerEnabled]);

  useEffect(() => {
    if (
      room.status !== "playing" ||
      !room.timerEnabled ||
      !me ||
      !room.currentPair ||
      !room.duelStartedAt ||
      !timerExpired ||
      !roundKey ||
      expiryAttemptRef.current === roundKey
    )
      return;
    expiryAttemptRef.current = roundKey;
    void expireBracketRound(room.id).then((result) => {
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
    me,
    room.currentPair,
    room.duelStartedAt,
    room.id,
    room.status,
    room.timerEnabled,
    roundKey,
    timerExpired,
  ]);

  useEffect(() => {
    if (
      room.status !== "playing" ||
      !room.timerEnabled ||
      !roundKey ||
      timeLeft === null ||
      timeLeft > 60 ||
      timeLeft < 56 ||
      warningAttemptRef.current === roundKey
    )
      return;
    warningAttemptRef.current = roundKey;
    playSound("timer_warning");
  }, [playSound, room.status, room.timerEnabled, roundKey, timeLeft]);

  useEffect(() => {
    if (!isHost || room.status === "finished") return;
    let cancelled = false;
    const heartbeat = () => {
      void heartbeatBracketHost(room.id).then((result) => {
        if (!cancelled && result.ok) acceptRoom(result.room);
      });
    };

    heartbeat();
    const id = window.setInterval(heartbeat, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [acceptRoom, isHost, room.id, room.status]);

  const run = (action: () => Promise<Awaited<ReturnType<typeof refreshBracketRoom>>>) => {
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
    ? (tracksBySeed.get(activeResolution.winnerSeed) ?? null)
    : null;
  const revealedWinnerWithCredits = revealedWinner
    ? { ...revealedWinner, ...creditFor(revealedWinner) }
    : null;
  const resolutionOverlay = (
    <AnimatePresence>
      {activeResolution ? (
        <ResolutionReveal
          resolution={activeResolution}
          winner={revealedWinnerWithCredits}
          trackA={tracksBySeed.get(activeResolution.seedA) ?? null}
          trackB={tracksBySeed.get(activeResolution.seedB) ?? null}
          onDone={() => setActiveResolution(null)}
          texts={texts}
        />
      ) : null}
    </AnimatePresence>
  );

  if (room.status === "finished") {
    return (
      <>
        {resolutionOverlay}
        <div className="space-y-5">
          <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100">
            {texts.bracketFinished}
          </p>
          <BracketGame
            bracketId={room.bracket.id}
            size={room.bracket.size}
            drawVersion={room.bracket.drawVersion}
            tracks={room.bracket.tracks.map((track) => {
              const credits = creditFor(track);
              return {
                seed: track.seed!,
                deezerTrackId: track.deezerTrackId,
                title: track.title,
                artist: credits.artist || track.artist,
                album: credits.album || null,
                cover_url: track.coverUrl,
              };
            })}
            initialVotes={room.votes}
            readOnly
          />
        </div>
      </>
    );
  }

  if (!me) {
    if (isExcluded) {
      return (
        <section className="card border-red-400/30 p-6 text-center">
          <UserMinus className="mx-auto text-red-300" size={30} />
          <h2 className="mt-3 text-xl font-bold">{texts.excludedTitle}</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">{texts.excludedHint}</p>
        </section>
      );
    }
    if (isRejected) {
      return (
        <section className="card border-red-400/30 p-6 text-center">
          <UserMinus className="mx-auto text-red-300" size={30} />
          <h2 className="mt-3 text-xl font-bold">{texts.joinRequestRejectedTitle}</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">{texts.joinRequestRejectedHint}</p>
        </section>
      );
    }
  }

  if (room.status === "paused") {
    return (
      <section className="card p-6 text-center">
        <Crown className="mx-auto text-amber-300" size={30} />
        <h2 className="mt-3 text-xl font-bold">{texts.hostAwayTitle}</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{texts.hostAwayHint}</p>
      </section>
    );
  }

  const trackA = room.currentPair ? tracksBySeed.get(room.currentPair.seedA) : null;
  const trackB = room.currentPair ? tracksBySeed.get(room.currentPair.seedB) : null;
  const liveVoteCounts = room.ballots.reduce<Record<number, number>>(
    (counts, ballot) => {
      if (ballot.winnerSeed !== null) {
        counts[ballot.winnerSeed] = (counts[ballot.winnerSeed] ?? 0) + 1;
      }
      return counts;
    },
    {
      ...(trackA?.seed !== undefined ? { [trackA.seed]: 0 } : {}),
      ...(trackB?.seed !== undefined ? { [trackB.seed]: 0 } : {}),
    },
  );
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
                  onClick={() => run(() => kickBracketPlayer(room.id, participant.playerId))}
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

      {kicked ? (
        <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-100">
          {texts.kickedNotice}
        </p>
      ) : null}

      {isPending ? (
        <p className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-950 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-100">
          <strong>{texts.joinRequestPendingTitle}.</strong> {texts.joinRequestPendingHint}
        </p>
      ) : null}

      {room.status === "playing" && !me && !isPending && !isHost ? (
        <section className="card p-5 text-center">
          <p className="text-sm text-[color:var(--muted)]">{texts.spectator}</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => joinBracketRoom(room.id))}
            className="btn-primary mt-3"
          >
            {texts.requestToJoin}
          </button>
        </section>
      ) : null}

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
                      run(() => approveBracketJoinRequest(room.id, participant.playerId))
                    }
                    className="btn-ghost border-emerald-500/30 text-xs text-emerald-800 hover:bg-emerald-500/10 dark:border-emerald-400/30 dark:text-emerald-100 dark:hover:bg-emerald-400/10"
                  >
                    <Check size={14} />
                    {texts.approvePlayer}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() => rejectBracketJoinRequest(room.id, participant.playerId))
                    }
                    className="btn-ghost border-red-500/30 text-xs text-red-800 hover:bg-red-500/10 dark:border-red-400/30 dark:text-red-100 dark:hover:bg-red-400/10"
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
          <Users className="mx-auto text-sky-600 dark:text-sky-300" size={30} />
          <h2 className="mt-3 text-xl font-bold">{texts.waitingPlayers}</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">{texts.bracketWaitingCopy}</p>
          {isPending ? (
            <p className="mt-5 text-sm text-sky-800 dark:text-sky-200">
              {texts.joinRequestPendingHint}
            </p>
          ) : isHost ? (
            <button
              type="button"
              disabled={pending || !me || room.participants.length < 2}
              onClick={() => run(() => startBracketRoom(room.id))}
              className="btn-primary mt-5"
            >
              <Swords size={16} />
              {texts.bracketStart}
            </button>
          ) : !me ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => joinBracketRoom(room.id))}
              className="btn-primary mt-5"
            >
              {texts.requestToJoin}
            </button>
          ) : (
            <p className="mt-5 text-sm text-sky-800 dark:text-sky-200">{texts.waitingHost}</p>
          )}
        </section>
      ) : trackA && trackB ? (
        <section className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-sky-500/25 bg-sky-500/10 dark:border-sky-400/25 dark:bg-sky-400/10">
            <div className="border-b border-sky-500/15 px-4 py-4 text-center dark:border-sky-300/15">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-800 dark:text-sky-200/80">
                {texts.currentRound}
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-sky-950 dark:text-sky-50 sm:text-2xl">
                {roundProgressLabel}
              </h2>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                {texts.responses}: {room.ballots.length} / {room.participants.length}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {hasVoted ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-200">
                      <Check size={15} />
                      {myBallot?.winnerSeed === null ? texts.votePassed : texts.voteRecorded}
                    </span>
                    <button
                      type="button"
                      disabled={pending || timerExpired}
                      onClick={() => run(() => clearBracketVote(room.id))}
                      className="btn-ghost text-xs"
                    >
                      {texts.cancelVote}
                    </button>
                  </>
                ) : me ? (
                  <button
                    type="button"
                    disabled={pending || timerExpired}
                    onClick={() => run(() => skipBracketVote(room.id))}
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
                    onClick={() => run(() => finishBracketRound(room.id))}
                    className="btn-ghost border-amber-500/35 bg-amber-500/10 text-xs text-amber-900 hover:bg-amber-500/20 dark:border-amber-400/35 dark:bg-amber-400/10 dark:text-amber-100 dark:hover:bg-amber-400/20"
                  >
                    <Swords size={15} />
                    {texts.finishRound}
                  </button>
                ) : null}
              </div>
            </div>
            {room.timerEnabled && timeLeft !== null && timeLabel ? (
              <>
                <div className="flex items-center justify-center px-4 pb-3">
                  <span
                    className={`inline-flex min-w-20 items-center gap-2 rounded-full px-3 py-1 text-sm font-black tabular-nums ${timeLeft <= 5 ? "bg-red-500/15 text-red-900 dark:bg-red-400/20 dark:text-red-200" : timeLeft <= 10 ? "bg-amber-500/15 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200" : "bg-sky-500/15 text-sky-900 dark:bg-sky-400/15 dark:text-sky-100"}`}
                  >
                    <Clock3 size={15} />
                    {timeLabel}
                  </span>
                </div>
                <motion.div
                  className={`h-1 origin-left ${timeLeft <= 5 ? "bg-red-500 dark:bg-red-400" : "bg-sky-500 dark:bg-sky-400"}`}
                  animate={{ scaleX: timeLeft / BRACKET_DUEL_SECONDS }}
                  transition={{ duration: 0.2, ease: "linear" }}
                />
              </>
            ) : null}
          </div>
          <MatchCard
            a={{
              seed: trackA.seed!,
              deezerTrackId: trackA.deezerTrackId,
              title: trackA.title,
              artist: creditFor(trackA).artist || trackA.artist,
              album: creditFor(trackA).album || null,
              cover_url: trackA.coverUrl,
            }}
            b={{
              seed: trackB.seed!,
              deezerTrackId: trackB.deezerTrackId,
              title: trackB.title,
              artist: creditFor(trackB).artist || trackB.artist,
              album: creditFor(trackB).album || null,
              cover_url: trackB.coverUrl,
            }}
            onPick={(seed) => run(() => voteBracketRoom(room.id, seed))}
            roundLabel={texts.collectiveVote}
            voteCounts={liveVoteCounts}
            labels={{
              listen: texts.listenPreview,
              pause: texts.pause,
              vote: texts.vote,
              voteSingular: texts.vote,
              votePlural: texts.votes,
            }}
            canVote={Boolean(me && !hasVoted && !pending && !timerExpired)}
            disabledVoteLabel={
              !me
                ? texts.spectator
                : timerExpired
                  ? texts.timeElapsed
                  : myBallot?.winnerSeed === null
                    ? texts.votePassed
                    : texts.voteRecorded
            }
          />
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
                const selectedTrack =
                  ballot?.winnerSeed === trackA.seed
                    ? trackA
                    : ballot?.winnerSeed === trackB.seed
                      ? trackB
                      : null;
                const selectedCredits = selectedTrack ? creditFor(selectedTrack) : null;
                return (
                  <div
                    key={participant.playerId}
                    className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium">
                      {participant.username}
                      {participant.playerId === userId ? ` · ${texts.youSuffix}` : ""}
                    </span>
                    <div className="flex flex-col items-end min-w-0 max-w-[58%] text-right">
                      <span
                        className={`truncate text-xs font-semibold ${
                          selectedTrack
                            ? "text-sky-800 dark:text-sky-200"
                            : ballot?.winnerSeed === null
                              ? "text-amber-800 dark:text-amber-200"
                              : "text-[color:var(--muted)]"
                        }`}
                      >
                        {selectedTrack?.title ?? (ballot ? texts.passed : texts.waiting)}
                      </span>
                      {selectedCredits?.artist ? (
                        <span className="truncate text-[10px] text-[color:var(--muted)]">
                          {selectedCredits.artist}
                        </span>
                      ) : null}
                      {selectedCredits?.album ? (
                        <span className="truncate text-[10px] text-[color:var(--muted)]/80">
                          {selectedCredits.album}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </section>
      ) : (
        <div className="card p-6 text-center text-sm text-[color:var(--muted)]">
          {texts.preparingDuel}
        </div>
      )}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
