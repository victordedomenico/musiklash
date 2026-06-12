"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, X, Trophy, ArrowRight, ChevronRight, Loader2, Zap } from "lucide-react";
import Link from "next/link";
import ChallengeOutcomeFx from "@/components/ChallengeOutcomeFx";
import StreamClashTrackCard from "@/components/StreamClashTrackCard";
import TrackPreviewBar from "@/components/TrackPreviewBar";
import { useTrackPreview } from "@/lib/use-track-preview";
import {
  generatePairs,
  checkAnswer,
  POINTS_PER_CORRECT,
  type StreamClashDifficulty,
  type StreamClashTrackData,
  type StreamClashPair,
} from "@/lib/stream-clash";
import { submitRound } from "./actions";

const ANSWER_TIMEOUT_MS = 10_000;

type Phase = "picking" | "revealed" | "finished";

type RoundResult = {
  pair: StreamClashPair;
  chosenPosition: number;
  correct: boolean;
};

export default function StreamClashPlayer({
  streamClashId,
  sessionId,
  tracks,
  difficulty,
  totalRounds,
}: {
  streamClashId: string;
  sessionId: string;
  tracks: StreamClashTrackData[];
  difficulty: StreamClashDifficulty;
  totalRounds: number;
}) {
  const pairs = useMemo(
    () => generatePairs(tracks, difficulty, totalRounds),
    // Pairs are generated once on mount; do not regenerate on re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("picking");
  const [chosenPosition, setChosenPosition] = useState<number | null>(null);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ANSWER_TIMEOUT_MS / 1000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmittedRef = useRef(false);
  const { nowPlaying, isPlaying, playTrack, toggle, stop, isPlayingKey } = useTrackPreview();

  const pair = pairs[roundIndex] ?? null;
  const isLastRound = roundIndex >= pairs.length - 1;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePick = useCallback(
    async (position: number) => {
      if (phase !== "picking" || submitting || !pair) return;
      clearTimer();
      setChosenPosition(position);
      setPhase("revealed");
      setSubmitting(true);

      const correct = checkAnswer(pair, position);
      setResults((prev) => [...prev, { pair, chosenPosition: position, correct }]);

      const res = await submitRound(sessionId, pair, position);
      if (res.ok) setScore(res.score);
      setSubmitting(false);
    },
    [phase, submitting, pair, clearTimer, sessionId],
  );

  // Auto-pick (time out) — choose neither = always wrong
  const handleTimeout = useCallback(async () => {
    if (phase !== "picking" || !pair || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    clearTimer();
    setChosenPosition(-1);
    setPhase("revealed");
    setSubmitting(true);
    setResults((prev) => [...prev, { pair, chosenPosition: -1, correct: false }]);
    const res = await submitRound(sessionId, pair, -1);
    if (res.ok) setScore(res.score);
    setSubmitting(false);
  }, [phase, pair, clearTimer, sessionId]);

  // Reset timer on new round
  useEffect(() => {
    if (phase !== "picking") return;
    // Reset the countdown when a new picking round starts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeLeft(ANSWER_TIMEOUT_MS / 1000);
    autoSubmittedRef.current = false;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          void handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return clearTimer;
  }, [roundIndex, phase, clearTimer, handleTimeout]);

  useEffect(() => {
    stop();
  }, [roundIndex, stop]);

  const handleNext = () => {
    if (isLastRound) {
      setPhase("finished");
    } else {
      setRoundIndex((i) => i + 1);
      setChosenPosition(null);
      setPhase("picking");
    }
  };

  if (pairs.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="font-semibold">Impossible de générer des manches pour cette sélection.</p>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Réessaie avec une autre sélection de morceaux.
        </p>
        <Link href={`/stream-clash/${streamClashId}`} className="btn-ghost mt-4 inline-flex">
          <ArrowRight size={14} /> Retour
        </Link>
      </div>
    );
  }

  // ── FINISHED ─────────────────────────────────────────────────────────────────
  if (phase === "finished") {
    const correctCount = results.filter((r) => r.correct).length;
    const perfect = correctCount === pairs.length;
    const outcome =
      correctCount >= pairs.length * 0.7
        ? "victory"
        : correctCount >= pairs.length * 0.4
          ? "draw"
          : "defeat";

    return (
      <div className="space-y-6">
        <ChallengeOutcomeFx outcome={outcome} />
        <div className="card p-8 text-center">
          <Trophy
            size={48}
            className={`mx-auto mb-4 ${perfect ? "text-yellow-400" : outcome === "victory" ? "text-[color:var(--accent)]" : "text-[color:var(--muted)]"}`}
          />
          <h2 className="text-3xl font-black">{score} pts</h2>
          <p className="mt-2 text-lg font-semibold">
            {correctCount}/{pairs.length} bonne{correctCount > 1 ? "s" : ""} réponse
            {correctCount > 1 ? "s" : ""}
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {perfect
              ? "Parfait ! Tu as tout bon."
              : outcome === "victory"
                ? "Excellent score !"
                : outcome === "draw"
                  ? "Pas mal, continue !"
                  : "Tu peux faire mieux !"}
          </p>
        </div>

        {/* Round recap */}
        <div className="card p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--muted)]">
            Récap manche par manche
          </p>
          {results.map((r, i) => {
            const winnerTrack =
              r.pair.trackA.rank >= r.pair.trackB.rank ? r.pair.trackA : r.pair.trackB;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                  r.correct ? "text-green-400" : "text-red-400"
                }`}
                style={{ background: "var(--surface)" }}
              >
                {r.correct ? <Check size={14} /> : <X size={14} />}
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{winnerTrack.title}</span>
                  <span className="ml-1 text-xs text-[color:var(--muted)]">
                    ({winnerTrack.artist})
                  </span>
                </div>
                <span className="shrink-0 font-bold">
                  {r.correct ? `+${POINTS_PER_CORRECT}` : "0"} pts
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/stream-clash/${streamClashId}/play`}
            className="btn-primary flex-1 justify-center"
          >
            <Zap size={14} /> Rejouer
          </Link>
          <Link href={`/stream-clash/${streamClashId}`} className="btn-ghost flex-1 justify-center">
            <ArrowRight size={14} /> Voir le contenu
          </Link>
        </div>
      </div>
    );
  }

  if (!pair) return null;

  const timerProgress = ((ANSWER_TIMEOUT_MS / 1000 - timeLeft) / (ANSWER_TIMEOUT_MS / 1000)) * 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-[color:var(--muted)]">
          Manche {roundIndex + 1}/{pairs.length}
        </span>
        <span className="text-sm font-bold">{score} pts</span>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]">
        {phase === "picking" ? (
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              timeLeft > 6
                ? "bg-[color:var(--accent)]"
                : timeLeft > 3
                  ? "bg-yellow-400"
                  : "bg-red-400"
            }`}
            style={{ width: `${100 - timerProgress}%` }}
          />
        ) : (
          <div className="h-full w-full bg-[color:var(--surface-2)]" />
        )}
      </div>

      {/* Question */}
      <div className="card p-5 text-center">
        <p className="text-sm font-semibold text-[color:var(--muted)]">
          Lequel a le meilleur score de popularité ?
        </p>
        {phase === "picking" && (
          <p
            className={`mt-1 text-2xl font-black tabular-nums ${
              timeLeft <= 3 ? "text-red-400 animate-pulse" : "text-[color:var(--foreground)]"
            }`}
          >
            {timeLeft}s
          </p>
        )}
        {phase === "revealed" && chosenPosition !== null && (
          <div className="mt-2 flex items-center justify-center gap-2">
            {checkAnswer(pair, chosenPosition) ? (
              <>
                <Check size={20} className="text-green-400" />
                <span className="font-bold text-green-400">+{POINTS_PER_CORRECT} pts !</span>
              </>
            ) : (
              <>
                <X size={20} className="text-red-400" />
                <span className="font-bold text-red-400">
                  {chosenPosition === -1 ? "Temps écoulé !" : "Raté !"}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {nowPlaying && (
        <TrackPreviewBar title={nowPlaying.title} isPlaying={isPlaying} onToggle={toggle} />
      )}

      {/* Tracks */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StreamClashTrackCard
          track={pair.trackA}
          chosen={chosenPosition === pair.trackA.position}
          revealed={phase === "revealed"}
          isWinner={pair.trackA.rank >= pair.trackB.rank}
          onPick={() => handlePick(pair.trackA.position)}
          disabled={phase === "revealed" || submitting}
          onPlayPreview={() =>
            void playTrack(
              String(pair.trackA.position),
              pair.trackA.title,
              pair.trackA.deezerTrackId,
            )
          }
          isPlayingPreview={isPlayingKey(String(pair.trackA.position))}
        />
        <StreamClashTrackCard
          track={pair.trackB}
          chosen={chosenPosition === pair.trackB.position}
          revealed={phase === "revealed"}
          isWinner={pair.trackB.rank > pair.trackA.rank}
          onPick={() => handlePick(pair.trackB.position)}
          disabled={phase === "revealed" || submitting}
          onPlayPreview={() =>
            void playTrack(
              String(pair.trackB.position),
              pair.trackB.title,
              pair.trackB.deezerTrackId,
            )
          }
          isPlayingPreview={isPlayingKey(String(pair.trackB.position))}
        />
      </div>

      {/* Next button */}
      {phase === "revealed" && (
        <div className="flex justify-end">
          <button type="button" onClick={handleNext} disabled={submitting} className="btn-primary">
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isLastRound ? (
              <>
                Voir les résultats <Trophy size={14} />
              </>
            ) : (
              <>
                Suivant <ChevronRight size={14} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
