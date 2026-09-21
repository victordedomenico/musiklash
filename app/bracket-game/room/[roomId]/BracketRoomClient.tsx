"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Clock3, Copy, Crown, SkipForward, Swords, Users } from "lucide-react";
import MatchCard from "@/components/MatchCard";
import BracketGame from "@/components/BracketGame";
import type {
  BracketRoomSnapshot,
  BracketRoundResolution,
  CollaborativeTrack,
} from "@/lib/collaborative-room";
import { BRACKET_DUEL_SECONDS, remainingDuelSeconds } from "@/lib/bracket-room-rules";
import { buildBracketState, totalRounds } from "@/lib/bracket";
import { bracketRoundLabel } from "@/lib/bracket-round-label";
import {
  forgetMultiplayerRoom,
  MULTIPLAYER_ROOMS_CHANGED_EVENT,
  rememberMultiplayerRoom,
} from "@/lib/multiplayer-room-resume";
import {
  clearBracketVote,
  expireBracketDuel,
  finishBracketRound,
  joinBracketRoom,
  refreshBracketRoom,
  skipBracketVote,
  startBracketRoom,
  voteBracketRoom,
} from "./actions";

function ResolutionReveal({
  resolution,
  winner,
  onDone,
}: {
  resolution: BracketRoundResolution;
  winner: CollaborativeTrack | null;
  onDone: () => void;
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
              Égalité parfaite · {resolution.votesA}–{resolution.votesB}
            </motion.p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">Pile ou face</h2>

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
              Majorité · {Math.max(resolution.votesA, resolution.votesB)} voix
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
                Morceau vainqueur
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
              <p className="mt-1 truncate text-sm text-white/60">{winner.artist}</p>
              <button type="button" onClick={onDone} className="btn-primary mt-6">
                Duel suivant
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
}: {
  initialRoom: BracketRoomSnapshot;
  userId: string;
  username: string;
}) {
  const [room, setRoom] = useState(initialRoom);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeResolution, setActiveResolution] = useState<BracketRoundResolution | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const seenResolutionRef = useRef(initialRoom.lastResolution?.id ?? null);
  const expiryAttemptRef = useRef<string | null>(null);
  const me = room.participants.find((participant) => participant.playerId === userId) ?? null;
  const isHost = room.hostId === userId;
  const hasVoted = room.ballots.some((ballot) => ballot.playerId === userId);
  const myBallot = room.ballots.find((ballot) => ballot.playerId === userId) ?? null;
  const tracksBySeed = useMemo(
    () => new Map(room.bracket.tracks.map((track) => [track.seed, track])),
    [room.bracket.tracks],
  );
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
  const roundProgressLabel = `${bracketRoundLabel(currentRound, totalRounds(room.bracket.size))} — Duel ${currentDuelIndex + 1} / ${realPairings.length}`;

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
    if (room.status === "finished") return;
    const id = window.setInterval(() => {
      void refreshBracketRoom(room.id).then((result) => {
        if (result.ok) acceptRoom(result.room);
      });
    }, 1500);
    return () => window.clearInterval(id);
  }, [acceptRoom, room.id, room.status]);

  useEffect(() => {
    if (room.status !== "playing") return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [room.status, room.duelStartedAt]);

  const timeLeft = remainingDuelSeconds(room.duelStartedAt, now);
  const timeLabel = `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(
    timeLeft % 60,
  ).padStart(2, "0")}`;
  const duelKey = room.currentPair
    ? `${room.votes.length}:${room.currentPair.matchIndex}:${room.duelStartedAt ?? "pending"}`
    : null;

  useEffect(() => {
    if (
      room.status !== "playing" ||
      !me ||
      !room.currentPair ||
      !room.duelStartedAt ||
      timeLeft > 0 ||
      !duelKey ||
      expiryAttemptRef.current === duelKey
    ) {
      return;
    }

    expiryAttemptRef.current = duelKey;
    void expireBracketDuel(room.id).then((result) => {
      if (result.ok) {
        acceptRoom(result.room);
        return;
      }
      window.setTimeout(() => {
        if (expiryAttemptRef.current === duelKey) expiryAttemptRef.current = null;
        setNow(Date.now());
      }, 1000);
    });
  }, [
    acceptRoom,
    duelKey,
    me,
    room.currentPair,
    room.duelStartedAt,
    room.id,
    room.status,
    timeLeft,
  ]);

  const run = (action: () => Promise<Awaited<ReturnType<typeof refreshBracketRoom>>>) => {
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
    ? (tracksBySeed.get(activeResolution.winnerSeed) ?? null)
    : null;
  const resolutionOverlay = (
    <AnimatePresence>
      {activeResolution ? (
        <ResolutionReveal
          resolution={activeResolution}
          winner={revealedWinner}
          onDone={() => setActiveResolution(null)}
        />
      ) : null}
    </AnimatePresence>
  );

  if (room.status === "finished") {
    return (
      <>
        {resolutionOverlay}
        <div className="space-y-5">
          <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            Tournoi terminé : voici le vote collectif final.
          </p>
          <BracketGame
            bracketId={room.bracket.id}
            size={room.bracket.size}
            drawVersion={room.bracket.drawVersion}
            tracks={room.bracket.tracks.map((track) => ({
              seed: track.seed!,
              deezerTrackId: track.deezerTrackId,
              title: track.title,
              artist: track.artist,
              cover_url: track.coverUrl,
            }))}
            initialVotes={room.votes}
            readOnly
          />
        </div>
      </>
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
            Partage le lien, puis lance la room à partir de 2 joueurs.
          </p>
          {!me ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => joinBracketRoom(room.id))}
              className="btn-primary mt-5"
            >
              Rejoindre la room
            </button>
          ) : isHost ? (
            <button
              type="button"
              disabled={pending || room.participants.length < 2}
              onClick={() => run(() => startBracketRoom(room.id))}
              className="btn-primary mt-5"
            >
              <Swords size={16} />
              Lancer le bracket
            </button>
          ) : (
            <p className="mt-5 text-sm text-sky-200">En attente du lancement par l’hôte…</p>
          )}
        </section>
      ) : trackA && trackB ? (
        <section className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-sky-400/25 bg-sky-400/10">
            <div className="border-b border-sky-300/15 px-4 py-4 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-200/70">
                Tour en cours
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-sky-50 sm:text-2xl">
                {roundProgressLabel}
              </h2>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex min-w-20 items-center gap-2 rounded-full px-3 py-1 font-black tabular-nums ${
                    timeLeft <= 5
                      ? "bg-red-400/20 text-red-200"
                      : timeLeft <= 10
                        ? "bg-amber-400/20 text-amber-200"
                        : "bg-sky-400/15 text-sky-100"
                  }`}
                >
                  <Clock3 size={15} />
                  {timeLabel}
                </span>
                <span>
                  Réponses reçues : {room.ballots.length} / {room.participants.length}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasVoted ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-emerald-200">
                      <Check size={15} />
                      {myBallot?.winnerSeed === null ? "Tu as passé" : "Ton vote est enregistré"}
                    </span>
                    <button
                      type="button"
                      disabled={pending || timeLeft === 0}
                      onClick={() => run(() => clearBracketVote(room.id))}
                      className="btn-ghost text-xs"
                    >
                      Annuler mon vote
                    </button>
                  </>
                ) : me ? (
                  <button
                    type="button"
                    disabled={pending || timeLeft === 0}
                    onClick={() => run(() => skipBracketVote(room.id))}
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
                    onClick={() => run(() => finishBracketRound(room.id))}
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
          <MatchCard
            a={{
              seed: trackA.seed!,
              deezerTrackId: trackA.deezerTrackId,
              title: trackA.title,
              artist: trackA.artist,
              cover_url: trackA.coverUrl,
            }}
            b={{
              seed: trackB.seed!,
              deezerTrackId: trackB.deezerTrackId,
              title: trackB.title,
              artist: trackB.artist,
              cover_url: trackB.coverUrl,
            }}
            onPick={(seed) => run(() => voteBracketRoom(room.id, seed))}
            roundLabel="Vote collectif"
            voteCounts={liveVoteCounts}
            canVote={Boolean(me && !hasVoted && !pending && timeLeft > 0)}
            disabledVoteLabel={
              !me
                ? "Spectateur"
                : timeLeft === 0
                  ? "Temps écoulé"
                  : myBallot?.winnerSeed === null
                    ? "Vote passé"
                    : "Vote enregistré"
            }
          />
          <section className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
            <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3">
              <p className="text-sm font-bold">Votes de la room</p>
              <p className="text-xs text-[color:var(--muted)]">Modifiables jusqu’à la clôture</p>
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
                return (
                  <div
                    key={participant.playerId}
                    className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium">
                      {participant.username}
                      {participant.playerId === userId ? " · toi" : ""}
                    </span>
                    <span
                      className={`max-w-[58%] truncate text-right text-xs font-semibold ${
                        selectedTrack
                          ? "text-sky-200"
                          : ballot?.winnerSeed === null
                            ? "text-amber-200"
                            : "text-[color:var(--muted)]"
                      }`}
                    >
                      {selectedTrack?.title ?? (ballot ? "A passé" : "En attente")}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </section>
      ) : (
        <div className="card p-6 text-center text-sm text-[color:var(--muted)]">
          Préparation du duel suivant…
        </div>
      )}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
