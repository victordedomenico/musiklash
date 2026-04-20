"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Check, X, SkipForward } from "lucide-react";
import { usePreviewVolume } from "@/lib/audio-volume";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BlindtrackData = {
  position: number;
  deezerTrackId: number;
  title: string;
  artist: string;
  coverUrl: string | null;
};

export type BlindtestAnswer = {
  position: number;
  guessTitle: string;
  guessArtist: string;
  correctTitle: boolean;
  correctArtist: boolean;
  points: number;
  trueTitle: string;
  trueArtist: string;
  coverUrl: string | null;
};

type Phase = "loading" | "playing" | "revealed";

// ─── Constants ───────────────────────────────────────────────────────────────

const TIMER_SECONDS = 30;
export const POINTS_TITLE = 2;
export const POINTS_ARTIST = 1;
export const POINTS_PER_TRACK = POINTS_TITLE + POINTS_ARTIST;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isCorrect(guess: string, truth: string): boolean {
  const g = normalize(guess);
  const t = normalize(truth);
  if (!g) return false;
  return t.includes(g) || g.includes(t);
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
        <p className="text-sm text-[color:var(--muted)] line-through mt-0.5">
          {guess}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BlindtestGame({
  tracks,
  onComplete,
}: {
  tracks: BlindtrackData[];
  onComplete: (answers: BlindtestAnswer[], score: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [guessTitle, setGuessTitle] = useState("");
  const [guessArtist, setGuessArtist] = useState("");
  const [answers, setAnswers] = useState<BlindtestAnswer[]>([]);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const freshUrlRef = useRef("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { volume } = usePreviewVolume();

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  // Refs so the timer always sees fresh values without re-running
  const guessRef = useRef({ title: "", artist: "" });
  const idxRef = useRef(idx);
  const phaseRef = useRef<Phase>("loading");

  useEffect(() => {
    guessRef.current = { title: guessTitle, artist: guessArtist };
  }, [guessTitle, guessArtist]);

  useEffect(() => {
    idxRef.current = idx;
  }, [idx]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    return () => {
      if (!audioRef.current) return;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    };
  }, []);

  // ── Fetch fresh preview URL for current track ─────────────────────────────
  useEffect(() => {
    const track = tracks[idx];
    freshUrlRef.current = "";
    audioRef.current?.pause();

    fetch(`/api/deezer/track/${track.deezerTrackId}`)
      .then((r) => r.json())
      .then((d: { preview?: string }) => {
        freshUrlRef.current = d.preview ?? "";
        setTimeLeft(TIMER_SECONDS);
        setPhase("playing");
      })
      .catch(() => {
        setTimeLeft(TIMER_SECONDS);
        setPhase("playing");
      });
  }, [idx, tracks]);

  // ── Auto-play when phase becomes "playing" ────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    const url = freshUrlRef.current;
    if (!url) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const a = audioRef.current;
    a.onended = () => setAudioPlaying(false);
    a.pause();
    a.volume = volume;
    a.src = url;
    a.load();
    setAudioPlaying(true);
    a.play().catch(() => setAudioPlaying(false));

    return () => { a.pause(); };
  }, [phase, volume]);

  // ── Stable submit (uses refs to avoid stale closures in timer) ────────────
  const submit = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    audioRef.current?.pause();
    setAudioPlaying(false);

    const { title: gt, artist: ga } = guessRef.current;
    const track = tracks[idxRef.current];
    const correctTitle = isCorrect(gt, track.title);
    const correctArtist = isCorrect(ga, track.artist);
    const points = (correctTitle ? POINTS_TITLE : 0) + (correctArtist ? POINTS_ARTIST : 0);

    setAnswers((prev) => [
      ...prev,
      {
        position: track.position,
        guessTitle: gt,
        guessArtist: ga,
        correctTitle,
        correctArtist,
        points,
        trueTitle: track.title,
        trueArtist: track.artist,
        coverUrl: track.coverUrl,
      },
    ]);
    setPhase("revealed");
  }, [tracks]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          submit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [phase, idx, submit]);

  // ── Next track / finish ───────────────────────────────────────────────────
  const goNext = useCallback(() => {
    const isLast = idx + 1 >= tracks.length;
    if (isLast) {
      // answers state is already complete at this point
      setAnswers((current) => {
        const score = current.reduce((s, a) => s + a.points, 0);
        onComplete(current, score);
        return current;
      });
      return;
    }
    setGuessTitle("");
    setGuessArtist("");
    setPhase("loading");
    setAudioPlaying(false);
    setIdx((i) => i + 1);
    setTimeout(() => titleInputRef.current?.focus(), 300);
  }, [idx, tracks.length, onComplete]);

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

  // ── Derived values ────────────────────────────────────────────────────────
  const track = tracks[idx];
  const lastAnswer = phase === "revealed" ? answers[answers.length - 1] : null;
  const currentScore = answers.reduce((s, a) => s + a.points, 0);
  const maxSoFar = (phase === "revealed" ? idx + 1 : idx) * POINTS_PER_TRACK;
  const timerProgress = ((TIMER_SECONDS - timeLeft) / TIMER_SECONDS) * 100;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-[color:var(--muted)]">
          Morceau {idx + 1} / {tracks.length}
        </span>
        <span className="font-semibold tabular-nums">
          {currentScore} / {maxSoFar} pts
        </span>
      </div>

      {/* Timer bar */}
      <div className="h-1.5 w-full rounded-full bg-[color:var(--surface-2)] overflow-hidden">
        {phase === "playing" ? (
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              timeLeft > 15
                ? "bg-green-400"
                : timeLeft > 7
                ? "bg-yellow-400"
                : "bg-red-400"
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

        {phase === "playing" && (
          <div className="flex flex-col md:flex-row gap-8 items-center">
            {/* Blurred / hidden cover */}
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
                <span className="text-5xl select-none">🎵</span>
                <span
                  className={`text-2xl font-black tabular-nums ${
                    timeLeft <= 7 ? "text-red-400" : "text-white"
                  }`}
                >
                  {timeLeft}s
                </span>
              </div>
            </div>

            {/* Inputs */}
            <div className="flex-1 w-full space-y-4">
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
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                  Artiste (+{POINTS_ARTIST} pt)
                </label>
                <input
                  className="input mt-1"
                  placeholder="Tape l'artiste…"
                  value={guessArtist}
                  onChange={(e) => setGuessArtist(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  autoComplete="off"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={toggleAudio}
                  className="btn-ghost"
                  aria-label={audioPlaying ? "Pause" : "Lire"}
                >
                  {audioPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  type="button"
                  onClick={submit}
                  className="btn-primary flex-1"
                >
                  Valider
                </button>
                <button
                  type="button"
                  onClick={submit}
                  className="btn-ghost"
                  title="Passer ce morceau"
                >
                  <SkipForward size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === "revealed" && lastAnswer && (
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
                <div className="h-full w-full flex items-center justify-center text-4xl">
                  🎵
                </div>
              )}
            </div>

            {/* Answer details */}
            <div className="flex-1 w-full space-y-3">
              <AnswerRow
                label={`Titre (+${POINTS_TITLE} pts)`}
                truth={track.title}
                guess={lastAnswer.guessTitle}
                correct={lastAnswer.correctTitle}
                points={POINTS_TITLE}
              />
              <AnswerRow
                label={`Artiste (+${POINTS_ARTIST} pt)`}
                truth={track.artist}
                guess={lastAnswer.guessArtist}
                correct={lastAnswer.correctArtist}
                points={POINTS_ARTIST}
              />

              <div className="flex items-center justify-between pt-1">
                <p className="font-bold text-lg">
                  +{lastAnswer.points} pt{lastAnswer.points !== 1 ? "s" : ""}
                  <span className="text-sm font-normal text-[color:var(--muted)] ml-2">
                    sur {POINTS_PER_TRACK} possibles
                  </span>
                </p>
                <button type="button" onClick={goNext} className="btn-primary">
                  {idx + 1 >= tracks.length ? "Voir les résultats →" : "Suivant →"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
