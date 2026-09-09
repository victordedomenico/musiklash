"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Play, RotateCcw, Search, SkipForward, X, Zap } from "lucide-react";
import { fetchTrackPreview } from "@/lib/deezer-preview-client";
import { isCorrect } from "@/lib/blindtest-utils";
import {
  availableFlashTrackCounts,
  FLASH_DIFFICULTIES,
  FLASH_DIFFICULTY_CONFIG,
  FLASH_LISTEN_SECONDS,
  flashPoints,
  isFlashDifficulty,
  isFlashListenSeconds,
  type FlashAnswer,
  type FlashDifficulty,
  type FlashListenSeconds,
} from "@/lib/blindtest-flash";
import { clearGameProgress, readGameProgress, writeGameProgress } from "@/lib/local-game-progress";
import { saveFlashBlindtestSession } from "./actions";

export type FlashBlindtestTrack = {
  position: number;
  deezerTrackId: number;
  title: string;
  artist: string;
  coverUrl: string | null;
};

type FlashDraft = {
  difficulty: FlashDifficulty;
  listenSeconds: FlashListenSeconds;
  orderedPositions: number[];
  answers: FlashAnswer[];
};

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[next]] = [copy[next], copy[index]];
  }
  return copy;
}

function isFlashDraft(value: unknown): value is FlashDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<FlashDraft>;
  return (
    isFlashDifficulty(draft.difficulty) &&
    isFlashListenSeconds(draft.listenSeconds) &&
    Array.isArray(draft.orderedPositions) &&
    draft.orderedPositions.every((position) => Number.isInteger(position)) &&
    Array.isArray(draft.answers) &&
    draft.answers.every(
      (answer) =>
        answer &&
        typeof answer === "object" &&
        Number.isInteger((answer as FlashAnswer).position) &&
        typeof (answer as FlashAnswer).correct === "boolean" &&
        typeof (answer as FlashAnswer).skipped === "boolean" &&
        Number.isInteger((answer as FlashAnswer).points),
    )
  );
}

function timeLabel(seconds: FlashListenSeconds) {
  return `${String(seconds).replace(".", ",")} s`;
}

export default function FlashBlindtestPlayer({
  blindtestId,
  title,
  tracks,
}: {
  blindtestId: string;
  title: string;
  tracks: FlashBlindtestTrack[];
}) {
  const availableCounts = useMemo(() => availableFlashTrackCounts(tracks.length), [tracks.length]);
  const signature = useMemo(
    () => tracks.map((track) => `${track.position}:${track.deezerTrackId}`).join("|"),
    [tracks],
  );
  const byPosition = useMemo(
    () => new Map(tracks.map((track) => [track.position, track])),
    [tracks],
  );

  const [difficulty, setDifficulty] = useState<FlashDifficulty>("easy");
  const [listenSeconds, setListenSeconds] = useState<FlashListenSeconds>(0.5);
  const [trackCount, setTrackCount] = useState(availableCounts[0] ?? 5);
  const [orderedPositions, setOrderedPositions] = useState<number[]>([]);
  const [answers, setAnswers] = useState<FlashAnswer[]>([]);
  const [stage, setStage] = useState<"setup" | "playing" | "finished">("setup");
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resultSaved, setResultSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalSavedRef = useRef(false);
  const restoreCheckedRef = useRef(false);

  const gameTracks = orderedPositions
    .map((position) => byPosition.get(position))
    .filter((track): track is FlashBlindtestTrack => Boolean(track));
  const currentTrack = stage === "playing" ? gameTracks[answers.length] : undefined;
  const pointsPerSong = flashPoints(difficulty, listenSeconds);
  const score = answers.reduce((total, answer) => total + answer.points, 0);

  useEffect(() => {
    if (restoreCheckedRef.current) return;
    restoreCheckedRef.current = true;
    const draft = readGameProgress(
      window.localStorage,
      "blindtest-flash",
      blindtestId,
      signature,
      isFlashDraft,
    );
    if (!draft) return;
    const allPositionsExist = draft.orderedPositions.every((position) => byPosition.has(position));
    const answersFit = draft.answers.length < draft.orderedPositions.length;
    if (
      !allPositionsExist ||
      !answersFit ||
      !availableCounts.includes(draft.orderedPositions.length)
    )
      return;
    queueMicrotask(() => {
      setDifficulty(draft.difficulty);
      setListenSeconds(draft.listenSeconds);
      setTrackCount(draft.orderedPositions.length);
      setOrderedPositions(draft.orderedPositions);
      setAnswers(draft.answers);
      setStage("playing");
      setFeedback("Partie reprise : à toi de jouer.");
      setAudioLoading(true);
    });
  }, [availableCounts, blindtestId, byPosition, signature]);

  useEffect(() => {
    if (stage !== "playing" || orderedPositions.length === 0) return;
    writeGameProgress(window.localStorage, "blindtest-flash", blindtestId, signature, {
      difficulty,
      listenSeconds,
      orderedPositions,
      answers,
    } satisfies FlashDraft);
  }, [answers, blindtestId, difficulty, listenSeconds, orderedPositions, signature, stage]);

  useEffect(() => {
    if (!currentTrack) return;
    let cancelled = false;
    void fetchTrackPreview(currentTrack.deezerTrackId)
      .then((url) => {
        if (!cancelled) setAudioUrl(url);
      })
      .finally(() => {
        if (!cancelled) setAudioLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      audio?.pause();
    };
  }, []);

  useEffect(() => {
    if (stage !== "finished" || finalSavedRef.current) return;
    finalSavedRef.current = true;
    clearGameProgress(window.localStorage, "blindtest-flash", blindtestId);
    setResultSaved("saving");
    void saveFlashBlindtestSession({
      blindtestId,
      difficulty,
      listenSeconds,
      trackCount: gameTracks.length,
      score,
      answers,
    }).then((result) => setResultSaved(result?.error ? "error" : "saved"));
  }, [answers, blindtestId, difficulty, gameTracks.length, listenSeconds, score, stage]);

  const stopAndReset = () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
  };

  const togglePreview = async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (isPlaying) {
      stopAndReset();
      return;
    }
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    audio.pause();
    audio.currentTime = 0;
    try {
      await audio.play();
      setIsPlaying(true);
      stopTimerRef.current = setTimeout(stopAndReset, listenSeconds * 1000);
    } catch {
      setFeedback("La pré-écoute n&apos;a pas pu démarrer. Réessaie dans un instant.");
    }
  };

  const recordAnswer = (correct: boolean, skipped: boolean) => {
    if (!currentTrack) return;
    stopAndReset();
    setAudioUrl(null);
    setAudioLoading(true);
    const nextAnswers = [
      ...answers,
      {
        position: currentTrack.position,
        correct,
        skipped,
        points: correct ? pointsPerSong : 0,
      },
    ];
    setAnswers(nextAnswers);
    setGuess("");
    setFeedback(null);
    if (nextAnswers.length === gameTracks.length) setStage("finished");
  };

  const submitGuess = (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentTrack || !guess.trim()) return;
    if (isCorrect(guess, currentTrack.title) || isCorrect(guess, currentTrack.artist)) {
      recordAnswer(true, false);
    } else {
      setFeedback("Pas encore. Tu peux réécouter autant de fois que nécessaire.");
    }
  };

  const startGame = () => {
    finalSavedRef.current = false;
    setResultSaved("idle");
    setAnswers([]);
    setGuess("");
    setFeedback(null);
    setAudioUrl(null);
    setAudioLoading(true);
    setOrderedPositions(
      shuffle(tracks)
        .slice(0, trackCount)
        .map((track) => track.position),
    );
    setStage("playing");
  };

  const restart = () => {
    stopAndReset();
    clearGameProgress(window.localStorage, "blindtest-flash", blindtestId);
    finalSavedRef.current = false;
    setStage("setup");
    setOrderedPositions([]);
    setAnswers([]);
    setFeedback(null);
    setResultSaved("idle");
  };

  if (availableCounts.length === 0) {
    return (
      <div className="rounded-3xl border border-amber-400/25 bg-amber-400/5 p-6 text-center">
        <p className="text-lg font-bold">
          Il faut au moins 5 morceaux pour lancer un Blindtest éclair.
        </p>
        <Link
          href={`/blindtest/${blindtestId}`}
          className="mt-4 inline-flex text-sm text-[color:var(--accent)]"
        >
          Retour au blindtest
        </Link>
      </div>
    );
  }

  if (stage === "setup") {
    return (
      <section
        className="overflow-hidden rounded-[30px] border"
        style={{ borderColor: "rgba(32,223,112,0.24)", background: "var(--surface)" }}
      >
        <div
          className="border-b px-6 py-6 md:px-8"
          style={{
            borderColor: "rgba(32,223,112,0.15)",
            background:
              "radial-gradient(520px 220px at 0% 0%, rgba(32,223,112,0.16), transparent 75%)",
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: "rgba(32,223,112,0.16)", color: "#20df70" }}
            >
              <Zap size={22} />
            </span>
            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.18em]"
                style={{ color: "#20df70" }}
              >
                Blindtest éclair
              </p>
              <h1 className="mt-0.5 text-2xl font-black">Configure ton rush</h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--muted-strong)]">
            Chaque appui sur lecture repart de zéro et ne diffuse que la durée choisie. Les morceaux
            se suivent uniquement quand tu trouves ou passes.
          </p>
          <p className="mt-3 text-xs font-semibold text-[color:var(--muted)]">Playlist : {title}</p>
        </div>
        <div className="space-y-7 px-6 py-7 md:px-8">
          <ChoiceRow label="Difficulté">
            {FLASH_DIFFICULTIES.map((level) => {
              const config = FLASH_DIFFICULTY_CONFIG[level];
              const active = difficulty === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className="rounded-full border px-4 py-2 text-sm font-black transition"
                  style={{
                    borderColor: active ? config.color : "var(--border)",
                    background: active ? `${config.color}22` : "var(--surface-2)",
                    color: config.color,
                    boxShadow: active ? `0 0 22px ${config.color}24` : "none",
                  }}
                >
                  {config.label}
                </button>
              );
            })}
          </ChoiceRow>
          <ChoiceRow label="Temps d’écoute">
            {FLASH_LISTEN_SECONDS.map((seconds) => {
              const active = listenSeconds === seconds;
              return (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => setListenSeconds(seconds)}
                  className="rounded-xl border px-4 py-2 text-sm font-black transition"
                  style={{
                    borderColor: active ? "#20df70" : "var(--border)",
                    background: active ? "rgba(32,223,112,0.14)" : "var(--surface-2)",
                    color: active ? "#20df70" : "var(--muted-strong)",
                  }}
                >
                  {timeLabel(seconds)}
                </button>
              );
            })}
          </ChoiceRow>
          <ChoiceRow label="Nombre de sons">
            {availableCounts.map((count) => {
              const active = trackCount === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => setTrackCount(count)}
                  className="rounded-xl border px-4 py-2 text-sm font-black transition"
                  style={{
                    borderColor: active ? "#20df70" : "var(--border)",
                    background: active ? "rgba(32,223,112,0.14)" : "var(--surface-2)",
                    color: active ? "#20df70" : "var(--muted-strong)",
                  }}
                >
                  {count} sons
                </button>
              );
            })}
          </ChoiceRow>
          <div
            className="flex flex-col justify-between gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center"
            style={{ borderColor: "rgba(32,223,112,0.2)", background: "rgba(32,223,112,0.06)" }}
          >
            <p className="text-sm text-[color:var(--muted-strong)]">
              <strong className="text-white">{pointsPerSong} pts</strong> par bonne réponse ·
              jusqu&apos;à <strong className="text-white">{pointsPerSong * trackCount} pts</strong>
            </p>
            <button
              type="button"
              onClick={startGame}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-black transition hover:brightness-110"
              style={{ background: "#20df70", boxShadow: "0 0 28px rgba(32,223,112,0.25)" }}
            >
              Lancer le rush <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (stage === "finished") {
    const correctCount = answers.filter((answer) => answer.correct).length;
    return (
      <section
        className="overflow-hidden rounded-[30px] border p-6 text-center md:p-10"
        style={{
          borderColor: "rgba(32,223,112,0.26)",
          background:
            "radial-gradient(600px 360px at 50% 0%, rgba(32,223,112,0.16), transparent 70%), var(--surface)",
        }}
      >
        <span
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl"
          style={{ background: "rgba(32,223,112,0.16)", color: "#20df70" }}
        >
          <Zap size={32} />
        </span>
        <p
          className="mt-5 text-sm font-black uppercase tracking-[0.18em]"
          style={{ color: "#20df70" }}
        >
          Rush terminé
        </p>
        <p className="mt-2 text-5xl font-black tracking-tight">
          {score} <span className="text-xl text-[color:var(--muted)]">pts</span>
        </p>
        <p className="mt-3 text-[color:var(--muted-strong)]">
          {correctCount}/{gameTracks.length} bonnes réponses ·{" "}
          {FLASH_DIFFICULTY_CONFIG[difficulty].label} · {timeLabel(listenSeconds)}
        </p>
        <div className="mx-auto mt-7 grid max-w-md grid-cols-2 gap-3 text-left">
          {gameTracks.map((track, index) => {
            const answer = answers[index];
            return (
              <div
                key={track.position}
                className="rounded-xl border p-3 text-sm"
                style={{
                  borderColor: answer?.correct ? "rgba(32,223,112,0.35)" : "var(--border)",
                  background: "var(--surface-2)",
                }}
              >
                <p className="truncate font-bold">{track.title}</p>
                <p className="truncate text-xs text-[color:var(--muted)]">{track.artist}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-xs text-[color:var(--muted)]">
          {resultSaved === "saving"
            ? "Enregistrement du score…"
            : resultSaved === "saved"
              ? "Score enregistré."
              : resultSaved === "error"
                ? "Score conservé localement, mais l&apos;enregistrement a échoué."
                : null}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={restart}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
            style={{ background: "#20df70", color: "#07120b" }}
          >
            <RotateCcw size={16} /> Rejouer
          </button>
          <Link
            href={`/blindtest/${blindtestId}`}
            className="rounded-xl border px-4 py-3 text-sm font-bold"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            Retour
          </Link>
        </div>
      </section>
    );
  }

  const progress = (answers.length / gameTracks.length) * 100;
  return (
    <section
      className="overflow-hidden rounded-[30px] border"
      style={{ borderColor: "rgba(32,223,112,0.24)", background: "var(--surface)" }}
    >
      <audio ref={audioRef} src={audioUrl ?? undefined} onEnded={stopAndReset} preload="auto" />
      <div
        className="flex items-center justify-between gap-3 border-b px-5 py-4 md:px-7"
        style={{ borderColor: "rgba(32,223,112,0.14)" }}
      >
        <div>
          <p
            className="text-xs font-black uppercase tracking-[0.16em]"
            style={{ color: "#20df70" }}
          >
            Blindtest éclair
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Son {answers.length + 1} / {gameTracks.length}
          </p>
        </div>
        <p
          className="rounded-full px-3 py-1 text-sm font-black"
          style={{ background: "rgba(32,223,112,0.12)", color: "#20df70" }}
        >
          {score} pts
        </p>
      </div>
      <div
        className="mx-5 mt-5 h-2 overflow-hidden rounded-full border md:mx-7"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: "#20df70" }}
        />
      </div>
      <div className="px-5 py-8 md:px-7 md:py-10">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-bold text-[color:var(--muted-strong)]">
            {FLASH_DIFFICULTY_CONFIG[difficulty].label} · {pointsPerSong} pts si tu trouves
          </p>
          <button
            type="button"
            disabled={!audioUrl || audioLoading}
            onClick={() => void togglePreview()}
            aria-label={
              isPlaying
                ? "Arrêter et remettre l'extrait à zéro"
                : `Écouter ${timeLabel(listenSeconds)}`
            }
            className="mx-auto mt-7 flex h-36 w-36 items-center justify-center rounded-full border-4 transition hover:scale-[1.03] disabled:cursor-wait disabled:opacity-50"
            style={{
              borderColor: "#55ef98",
              background: "#20df70",
              color: "#07120b",
              boxShadow: "0 0 42px rgba(32,223,112,0.3)",
            }}
          >
            {isPlaying ? (
              <X size={46} strokeWidth={3} />
            ) : (
              <Play className="ml-1" size={50} fill="currentColor" strokeWidth={2.5} />
            )}
          </button>
          <p className="mt-4 text-lg font-black" style={{ color: "#20df70" }}>
            {audioLoading ? "Chargement…" : timeLabel(listenSeconds)}
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            {isPlaying ? "Un nouvel appui coupe et remet à 0." : "Chaque écoute redémarre à 0."}
          </p>
        </div>
        <form
          onSubmit={submitGuess}
          className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
        >
          <label className="sr-only" htmlFor="flash-guess">
            Titre ou artiste
          </label>
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--muted)]"
              size={20}
            />
            <input
              id="flash-guess"
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              placeholder="Cherche le titre ou l'artiste…"
              className="h-14 w-full rounded-2xl border bg-transparent pl-12 pr-4 text-base outline-none transition focus:border-[#20df70]"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className="h-14 rounded-2xl px-5 font-black text-black"
            style={{ background: "#20df70" }}
          >
            Valider
          </button>
        </form>
        {feedback ? (
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-amber-300">{feedback}</p>
        ) : null}
        <button
          type="button"
          onClick={() => recordAnswer(false, true)}
          className="mx-auto mt-6 flex items-center gap-2 text-sm font-bold text-[color:var(--muted)] transition hover:text-white"
        >
          <SkipForward size={17} /> Passer ce son
        </button>
      </div>
    </section>
  );
}

function ChoiceRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-sm font-black text-[color:var(--muted-strong)]">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
