"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play, RotateCcw, Search, SkipForward } from "lucide-react";
import { usePreviewVolume } from "@/lib/audio-volume";
import { fetchTrackPreview } from "@/lib/deezer-preview-client";
import { normalize } from "@/lib/blindtest-utils";
import {
  FLASH_DIFFICULTIES,
  FLASH_DIFFICULTY_CONFIG,
  FLASH_LISTEN_SECONDS,
  FLASH_MAX_ATTEMPTS,
  assignFlashSessionTracks,
  flashAnswerPoints,
  flashAttemptListenSeconds,
  flashDifficultyAt,
  flashNextAttempt,
  flashPerfectScore,
  flashPoints,
  isFlashListenSeconds,
  type FlashAnswer,
} from "@/lib/blindtest-flash";
import { readGameProgress, writeGameProgress } from "@/lib/local-game-progress";
import { saveFlashBlindtestSession } from "./actions";
import styles from "./flash.module.css";

export type FlashBlindtestTrack = {
  position: number;
  deezerTrackId: number;
  title: string;
  artist: string;
  coverUrl: string | null;
  rank: number;
};

type Draft = {
  orderedPositions: number[];
  answers: FlashAnswer[];
  attemptIndex: number;
  saved?: boolean;
};

function restoreDraft(value: unknown): value is Draft {
  if (!value || typeof value !== "object") return false;
  const d = value as Draft;
  return (
    Number.isInteger(d.attemptIndex) &&
    d.attemptIndex >= 0 &&
    d.attemptIndex < FLASH_MAX_ATTEMPTS &&
    Array.isArray(d.orderedPositions) &&
    d.orderedPositions.length > 0 &&
    d.orderedPositions.length <= FLASH_DIFFICULTIES.length &&
    d.orderedPositions.every(Number.isInteger) &&
    new Set(d.orderedPositions).size === d.orderedPositions.length &&
    Array.isArray(d.answers) &&
    d.answers.length <= d.orderedPositions.length &&
    d.answers.every((answer, index) => {
      const difficulty = flashDifficultyAt(index);
      return (
        !!answer &&
        !!difficulty &&
        answer.position === d.orderedPositions[index] &&
        typeof answer.correct === "boolean" &&
        typeof answer.skipped === "boolean" &&
        !(answer.correct && answer.skipped) &&
        answer.difficulty === difficulty &&
        isFlashListenSeconds(answer.listenSeconds) &&
        answer.points === flashAnswerPoints(answer, difficulty, answer.listenSeconds)
      );
    })
  );
}

function freshDraft(tracks: FlashBlindtestTrack[]): Draft {
  return {
    orderedPositions: assignFlashSessionTracks(tracks),
    answers: [],
    attemptIndex: 0,
  };
}

function timeLabel(seconds: number) {
  const rounded = Math.round(seconds * 10) / 10;
  if (Number.isInteger(rounded)) return `${rounded} s`;
  return `${rounded.toFixed(1).replace(".", ",")} s`;
}

function clockLabel(seconds: number) {
  return `${Math.min(15, Math.max(0, seconds)).toFixed(1).replace(".", ",")} s`;
}

function timelinePercent(seconds: number) {
  const marks = [
    [0, 0],
    [0.1, 4],
    [0.5, 12],
    [2, 32],
    [8, 68],
    [15, 100],
  ];
  for (let index = 1; index < marks.length; index++) {
    const [end, percent] = marks[index];
    const [start, previous] = marks[index - 1];
    if (seconds <= end)
      return previous + ((seconds - start) / (end - start)) * (percent - previous);
  }
  return 100;
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
  const signature = useMemo(
    () => tracks.map((t) => `${t.position}:${t.deezerTrackId}`).join("|"),
    [tracks],
  );
  const { volume } = usePreviewVolume();
  const [draft, setDraft] = useState<Draft | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playGenRef = useRef(0);
  const rafRef = useRef(0);
  const timeoutRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [audioError, setAudioError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveAttempt, setSaveAttempt] = useState(0);
  const savingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commit = useCallback(
    (next: Draft) => {
      draftRef.current = next;
      setDraft(next);
      try {
        writeGameProgress(window.localStorage, "blindtest-flash", blindtestId, signature, next);
      } catch {
        setStorageError(true);
      }
    },
    [blindtestId, signature],
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      let restored: Draft | null = null;
      try {
        const stored = readGameProgress(
          window.localStorage,
          "blindtest-flash",
          blindtestId,
          signature,
          (value): value is unknown => value !== null,
        );
        restored = restoreDraft(stored) ? stored : null;
      } catch {
        setStorageError(true);
      }
      if (
        restored &&
        !restored.orderedPositions.every((position) => tracks.some((t) => t.position === position))
      )
        restored = null;
      commit(restored ?? freshDraft(tracks));
      if (restored) setFeedback("Partie reprise là où tu l’avais laissée.");
    });
    return () => {
      cancelled = true;
    };
  }, [blindtestId, commit, signature, tracks]);

  const finished = !!draft && draft.answers.length === draft.orderedPositions.length;
  const currentPosition =
    draft && !finished ? draft.orderedPositions[draft.answers.length] : undefined;
  const currentTrack = tracks.find((t) => t.position === currentPosition);
  const score = draft?.answers.reduce((total, answer) => total + answer.points, 0) ?? 0;
  const difficulty = flashDifficultyAt(draft?.answers.length ?? 0) ?? "easy";
  const config = FLASH_DIFFICULTY_CONFIG[difficulty];
  const attemptIndex = draft?.attemptIndex ?? 0;
  const listenSeconds = flashAttemptListenSeconds(attemptIndex);
  const perfect = flashPerfectScore(draft?.orderedPositions.length ?? FLASH_DIFFICULTIES.length);

  const stopClip = useCallback((resetElapsed = false) => {
    playGenRef.current += 1;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    audioRef.current?.pause();
    setPlaying(false);
    if (resetElapsed) setElapsed(0);
  }, []);

  useEffect(() => {
    if (!currentTrack) return;
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    let cancelled = false;
    const onError = () => {
      setAudioError(true);
      setLoading(false);
      setPlaying(false);
    };
    audio.addEventListener("error", onError);
    void fetchTrackPreview(currentTrack.deezerTrackId)
      .then((url) => {
        if (cancelled) return;
        if (!url) throw new Error("No preview");
        audio.src = url;
        audio.load();
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) onError();
      });
    return () => {
      cancelled = true;
      stopClip(true);
      audio.removeEventListener("error", onError);
      audio.removeAttribute("src");
      audio.load();
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [currentTrack, retry, stopClip]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!playing) return;
    const audio = audioRef.current;
    if (!audio) return;
    const generation = playGenRef.current;
    const limit = listenSeconds;
    const startedAt = performance.now();
    const tick = () => {
      if (playGenRef.current !== generation || audioRef.current !== audio) return;
      const wall = (performance.now() - startedAt) / 1000;
      const heard = Math.min(
        limit,
        Math.max(0, Number.isFinite(audio.currentTime) ? audio.currentTime : 0, wall),
      );
      setElapsed(heard);
      if (heard >= limit) {
        audio.pause();
        audio.currentTime = 0;
        setPlaying(false);
        setElapsed(limit);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    timeoutRef.current = window.setTimeout(
      () => {
        if (playGenRef.current !== generation || audioRef.current !== audio) return;
        audio.pause();
        audio.currentTime = 0;
        setPlaying(false);
        setElapsed(limit);
      },
      limit * 1000 + 30,
    );
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.clearTimeout(timeoutRef.current);
    };
  }, [listenSeconds, playing]);

  const toggleAudio = async () => {
    const audio = audioRef.current;
    if (!audio || loading || audioError) return;
    if (playing) {
      stopClip(true);
      audio.currentTime = 0;
      return;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    playGenRef.current += 1;
    audio.currentTime = 0;
    setElapsed(0);
    try {
      await audio.play();
      if (audioRef.current !== audio) return;
      setPlaying(true);
    } catch {
      setFeedback("Lecture impossible. Appuie à nouveau sur Play pour réessayer.");
    }
  };

  const answer = (skipped: boolean) => {
    stopClip(true);
    if (audioRef.current) audioRef.current.currentTime = 0;
    const current = draftRef.current;
    if (!current || finished || !currentTrack) return;
    const level = flashDifficultyAt(current.answers.length);
    if (!level) return;
    const windowSeconds = flashAttemptListenSeconds(current.attemptIndex);

    if (!skipped && normalize(guess) !== normalize(currentTrack.title)) {
      setGuess("");
      const nextAttempt = flashNextAttempt(current.attemptIndex);
      if (nextAttempt === null) {
        setLoading(true);
        setAudioError(false);
        commit({
          ...current,
          attemptIndex: 0,
          answers: [
            ...current.answers,
            {
              position: currentTrack.position,
              correct: false,
              skipped: false,
              points: 0,
              difficulty: level,
              listenSeconds: windowSeconds,
            },
          ],
        });
        setFeedback(
          `C’était « ${currentTrack.title} ». ${FLASH_DIFFICULTY_CONFIG[level].label} : 0 pt.`,
        );
        inputRef.current?.focus();
        return;
      }
      commit({ ...current, attemptIndex: nextAttempt });
      setElapsed(0);
      setFeedback(
        `Ce n’est pas ça. Prochaine écoute : ${timeLabel(flashAttemptListenSeconds(nextAttempt))}.`,
      );
      inputRef.current?.focus();
      return;
    }

    const points = skipped ? 0 : flashPoints(level, windowSeconds);
    setGuess("");
    setLoading(true);
    setAudioError(false);
    commit({
      ...current,
      attemptIndex: 0,
      answers: [
        ...current.answers,
        {
          position: currentTrack.position,
          correct: !skipped,
          skipped,
          points,
          difficulty: level,
          listenSeconds: windowSeconds,
        },
      ],
    });
    setFeedback(skipped ? `C’était « ${currentTrack.title} ».` : `Trouvé ! +${points} points.`);
    inputRef.current?.focus();
  };

  const restart = () => {
    savingRef.current = false;
    setSaveState("idle");
    setFeedback("");
    setElapsed(0);
    setGuess("");
    setLoading(true);
    setAudioError(false);
    commit(freshDraft(tracks));
  };

  useEffect(() => {
    if (!finished || !draft || draft.saved || savingRef.current) return;
    savingRef.current = true;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) {
        savingRef.current = false;
        return;
      }
      setSaveState("saving");
      try {
        const last = draft.answers.at(-1);
        const result = await saveFlashBlindtestSession({
          blindtestId,
          difficulty: last?.difficulty ?? "easy",
          listenSeconds: last?.listenSeconds ?? 0.1,
          trackCount: draft.answers.length,
          score,
          answers: draft.answers,
        });
        if (result.error) throw new Error(result.error);
        if (!cancelled) {
          commit({ ...draft, saved: true });
          setSaveState("saved");
        }
      } catch {
        if (!cancelled) setSaveState("error");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [blindtestId, commit, draft, finished, saveAttempt, score]);

  if (!draft)
    return (
      <div className={styles.shell} role="status">
        Préparation du blindtest…
      </div>
    );

  const foundAtFirstTry = draft.answers.filter(
    (answer) => answer.correct && answer.listenSeconds === 0.1,
  ).length;

  return (
    <section
      className={styles.shell}
      style={{ "--flash-color": config.color } as React.CSSProperties}
      aria-label="Blindtest éclair"
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>BLINDTEST ÉCLAIR</p>
          <h1>{title}</h1>
        </div>
        <div className={styles.stats}>
          <strong>{score.toLocaleString("fr-FR")} pts</strong>
          <span>
            {finished
              ? "Terminé"
              : `${FLASH_DIFFICULTY_CONFIG[difficulty].label} · ${draft.answers.length + 1} / ${draft.orderedPositions.length}`}
          </span>
        </div>
      </header>
      {finished ? (
        <div className={styles.results}>
          <h2>{foundAtFirstTry === draft.answers.length ? "Éclair parfait" : "Bien joué !"}</h2>
          <p className={styles.total}>
            {score.toLocaleString("fr-FR")} <small>/ {perfect.toLocaleString("fr-FR")} pts</small>
          </p>
          <p>
            {draft.answers.filter((a) => a.correct).length} / {draft.answers.length} titres trouvés
            {foundAtFirstTry > 0 ? ` · ${foundAtFirstTry} en 0,1 s` : ""}
          </p>
          <ol>
            {draft.answers.map((a, index) => (
              <li key={a.position}>
                <span>
                  {tracks.find((t) => t.position === a.position)?.title}
                  <small>
                    {
                      FLASH_DIFFICULTY_CONFIG[a.difficulty ?? flashDifficultyAt(index) ?? "easy"]
                        .label
                    }{" "}
                    · {a.correct ? timeLabel(a.listenSeconds ?? 15) : "non trouvé"}
                  </small>
                </span>
                <strong>{a.points} pts</strong>
              </li>
            ))}
          </ol>
          <p role="status">
            {draft.saved
              ? "Score enregistré."
              : saveState === "error"
                ? "Enregistrement indisponible. Ton résultat reste sauvegardé dans ce navigateur."
                : "Enregistrement…"}
          </p>
          {saveState === "error" && (
            <button
              className={styles.secondary}
              onClick={() => {
                savingRef.current = false;
                setSaveAttempt((n) => n + 1);
              }}
            >
              Réessayer l’enregistrement
            </button>
          )}
          <div className={styles.resultActions}>
            <button
              disabled={saveState === "saving"}
              className={styles.secondary}
              onClick={restart}
            >
              <RotateCcw size={18} /> Rejouer
            </button>
            <Link href="/create-blindtest-eclair">Créer un blindtest</Link>
          </div>
        </div>
      ) : (
        <>
          <ol className={styles.ladder} aria-label="Progression des difficultés">
            {draft.orderedPositions.map((_, index) => {
              const level = flashDifficultyAt(index) ?? "easy";
              const answer = draft.answers[index];
              const state = answer
                ? answer.correct
                  ? "won"
                  : "lost"
                : index === draft.answers.length
                  ? "current"
                  : "next";
              return (
                <li
                  key={level}
                  data-state={state}
                  style={
                    { "--level-color": FLASH_DIFFICULTY_CONFIG[level].color } as React.CSSProperties
                  }
                >
                  {FLASH_DIFFICULTY_CONFIG[level].label}
                </li>
              );
            })}
          </ol>
          <div className={styles.timeline}>
            <div
              className={styles.track}
              role="progressbar"
              aria-label="Durée de l’écoute en cours"
              aria-valuemin={0}
              aria-valuemax={15}
              aria-valuenow={Math.min(listenSeconds, elapsed)}
              aria-valuetext={clockLabel(Math.min(elapsed, listenSeconds))}
            >
              <div className={styles.fill} style={{ width: `${timelinePercent(elapsed)}%` }} />
              {FLASH_LISTEN_SECONDS.map((seconds) => (
                <span
                  key={seconds}
                  className={styles.tick}
                  data-active={listenSeconds === seconds}
                  style={{ left: `${timelinePercent(seconds)}%` }}
                />
              ))}
            </div>
          </div>
          <div className={styles.transport}>
            <button
              className={styles.play}
              aria-label={playing ? "Stop et retour à zéro" : `Écouter ${timeLabel(listenSeconds)}`}
              onClick={() => void toggleAudio()}
              disabled={loading || audioError}
            >
              {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
            </button>
            <output className={styles.clock} aria-label="Temps écouté">
              {clockLabel(elapsed)}
            </output>
          </div>
          <form
            className={styles.answerRow}
            onSubmit={(event) => {
              event.preventDefault();
              if (guess.trim()) answer(false);
            }}
          >
            <label className={styles.search}>
              <Search aria-hidden size={23} />
              <span className="sr-only">Nom du morceau</span>
              <input
                ref={inputRef}
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Nom du morceau…"
                autoComplete="off"
              />
              <button className="sr-only focus:not-sr-only" type="submit">
                Valider
              </button>
            </label>
            <button className={styles.skip} type="button" onClick={() => answer(true)}>
              <SkipForward size={24} /> Passer
            </button>
          </form>
          <div className={styles.hints}>
            <span>
              Essai {attemptIndex + 1} / {FLASH_MAX_ATTEMPTS} · Entrée pour valider
            </span>
            <strong>{flashPoints(difficulty, listenSeconds)} pts à gagner</strong>
          </div>
          <p className={styles.feedback} role="status">
            {audioError
              ? "Extrait indisponible. Réessaie ou passe ce morceau."
              : loading
                ? "Chargement du son…"
                : feedback ||
                  "Écoute le flash, trouve le titre. Une mauvaise réponse allonge l’extrait."}
          </p>
          {audioError && (
            <button
              className={styles.secondary}
              onClick={() => {
                setAudioError(false);
                setLoading(true);
                setRetry((n) => n + 1);
              }}
            >
              Réessayer l’extrait
            </button>
          )}
        </>
      )}
      {storageError && (
        <p role="alert" className={styles.feedback}>
          La sauvegarde du navigateur est indisponible : garde cet onglet ouvert pour conserver la
          partie.
        </p>
      )}
    </section>
  );
}
