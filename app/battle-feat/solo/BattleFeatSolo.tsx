"use client";

import { useState, useEffect, useCallback, useEffectEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Swords,
  User,
  Trophy,
  ArrowRight,
  Loader2,
  Zap,
  CheckCircle,
  Bot,
  Play,
  Pause,
  Volume2,
} from "lucide-react";
import ArtistSearchInput from "@/components/ArtistSearchInput";
import type { ArtistResult, FeatMove } from "@/lib/battle-feat";
import { saveSoloSession } from "./actions";
import { usePreviewVolume } from "@/lib/audio-volume";

type Phase = "setup" | "player-turn" | "validating" | "ai-thinking" | "joker" | "game-over";

const TIMER_BY_DIFFICULTY: Record<number, number> = { 1: 20, 2: 20, 3: 10 };

const difficultyConfig = [
  { label: "Facile", value: 1, color: "text-green-400", border: "border-green-400/40", bg: "bg-green-400/10", desc: "20 sec — IA mainstream (165) + 4 options" },
  { label: "Normal", value: 2, color: "text-yellow-400", border: "border-yellow-400/40", bg: "bg-yellow-400/10", desc: "20 sec — IA élargie (673)" },
  { label: "Difficile", value: 3, color: "text-red-400", border: "border-red-400/40", bg: "bg-red-400/10", desc: "10 sec — IA niche (994)" },
] as const;

function getTimestamp() {
  return Date.now();
}

function ArtistChip({
  name,
  pictureUrl,
  trackTitle,
  previewUrl,
  isNew,
  isAi,
  onPlayPreview,
}: {
  name: string;
  pictureUrl: string | null;
  trackTitle?: string | null;
  previewUrl?: string | null;
  isNew?: boolean;
  isAi?: boolean;
  onPlayPreview?: (title: string | null, previewUrl: string | null) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 bg-[color:var(--surface)] transition ${
        isNew
          ? isAi
            ? "border-blue-400/60 ring-1 ring-blue-400/30"
            : "border-[color:var(--accent)]/60 ring-1 ring-[color:var(--accent)]/30"
          : "border-[color:var(--border)]"
      }`}
    >
      {pictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pictureUrl} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="h-10 w-10 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center shrink-0">
          <User size={16} className="text-[color:var(--muted)]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate">{name}</p>
        {trackTitle && (
          <p className="text-xs text-[color:var(--muted)] truncate">🎵 {trackTitle}</p>
        )}
      </div>
      {trackTitle && previewUrl && onPlayPreview && (
        <button
          type="button"
          onClick={() => onPlayPreview(trackTitle, previewUrl)}
          className="btn-ghost !px-2.5 !py-1.5 text-xs"
        >
          <Play size={12} />
          Écouter
        </button>
      )}
      {isNew && (
        isAi
          ? <Bot size={15} className="text-blue-400 shrink-0" />
          : <CheckCircle size={15} className="text-[color:var(--accent)] shrink-0" />
      )}
    </div>
  );
}

export default function BattleFeatSolo() {
  const router = useRouter();

  const [difficulty, setDifficulty] = useState(2);
  const [startingArtist, setStartingArtist] = useState<ArtistResult | null>(null);

  const [phase, setPhase] = useState<Phase>("setup");
  const [moves, setMoves] = useState<FeatMove[]>([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [jokers, setJokers] = useState(1);
  const [jokersUsed, setJokersUsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [gameOverReason, setGameOverReason] = useState("");
  const [gameOverWinner, setGameOverWinner] = useState<"player" | "ai" | null>(null);
  const [saving, setSaving] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [easyOptions, setEasyOptions] = useState<ArtistResult[]>([]);
  const [roundMessage, setRoundMessage] = useState("");

  // Audio player
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [nowPlaying, setNowPlaying] = useState<{ title: string; previewUrl: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { volume } = usePreviewVolume();

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  const turnSeconds = TIMER_BY_DIFFICULTY[difficulty] ?? 20;

  const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;
  const currentArtistId = lastMove?.artistId ?? startingArtist?.id ?? "";
  const currentArtistName = lastMove?.artistName ?? startingArtist?.name ?? "";
  const usedIds = [
    ...(startingArtist ? [startingArtist.id] : []),
    ...moves.map((m) => m.artistId),
  ];
  const usedIdsKey = usedIds.join(",");

  // ── Audio ─────────────────────────────────────────────────────────────────
  const playPreview = useCallback((title: string | null, previewUrl: string | null) => {
    if (!previewUrl) return;
    const safePreviewUrl = previewUrl.replace(/^http:\/\//i, "https://");
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = safePreviewUrl;
      audioRef.current.volume = volume;
      setNowPlaying({ title: title ?? "Extrait", previewUrl: safePreviewUrl });
      void audioRef.current.play().catch(() => null);
    } else {
      const audio = new Audio(safePreviewUrl);
      audio.volume = volume;
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => { setIsPlaying(false); setNowPlaying(null); };
      audioRef.current = audio;
      setNowPlaying({ title: title ?? "Extrait", previewUrl: safePreviewUrl });
      void audio.play().catch(() => null);
    }
  }, [volume]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      void audioRef.current.play().catch(() => null);
    } else {
      audioRef.current.pause();
    }
  };

  // Stop audio when game ends
  useEffect(() => {
    if (phase === "game-over" || phase === "setup") {
      audioRef.current?.pause();
    }
  }, [phase]);

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

  // ── Start ─────────────────────────────────────────────────────────────────
  const startGame = () => {
    if (!startingArtist) return;
    setMoves([]);
    setPlayerScore(0);
    setAiScore(0);
    setJokers(1);
    setJokersUsed(0);
    setSessionId(null);
    setEasyOptions([]);
    setRoundMessage("");
    setTimeLeft(turnSeconds);
    setPhase("player-turn");
  };

  // ── End game ──────────────────────────────────────────────────────────────
  const endGame = useCallback(
    async (
      reason: string,
      winner: "player" | "ai" | null,
      finalMoves: FeatMove[],
      finalPlayerScore: number,
      finalJokersUsed = jokersUsed,
    ) => {
      if (!startingArtist) return;
      setGameOverReason(reason);
      setGameOverWinner(winner);
      setPhase("game-over");
      setSaving(true);
      try {
        const result = await saveSoloSession(
          difficulty,
          startingArtist.id,
          finalMoves,
          finalPlayerScore,
          finalJokersUsed,
        );
        if (result.id) setSessionId(result.id);
      } catch {
        // non-critical
      }
      setSaving(false);
    },
    [difficulty, startingArtist, jokersUsed],
  );

  const handleTimeout = useEffectEvent(() => {
    void endGame("Temps écoulé !", "ai", moves, playerScore);
  });

  // ── Timer (only during player-turn) ──────────────────────────────────────
  useEffect(() => {
    if (phase !== "player-turn") return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          window.setTimeout(() => handleTimeout(), 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]); // re-runs each time phase becomes "player-turn" → timer resets

  useEffect(() => {
    if (phase !== "player-turn" || difficulty !== 1 || !currentArtistId) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/battle-feat/options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentArtistId, usedIds }),
        });
        const json = (await res.json()) as { options: ArtistResult[] };
        if (!cancelled) {
          setEasyOptions(json.options ?? []);
        }
      } catch {
        if (!cancelled) {
          setEasyOptions([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [phase, difficulty, currentArtistId, usedIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI move ───────────────────────────────────────────────────────────────
  const triggerAiMove = useCallback(
    async (
      currentMoves: FeatMove[],
      currentPlayerScore: number,
      artistId: string,
      currentUsedIds: string[],
      currentJokers: number,
      currentJokersUsed: number,
    ) => {
      try {
        const res = await fetch("/api/battle-feat/ai-move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentArtistId: artistId, difficulty, usedIds: currentUsedIds }),
        });
        const json = (await res.json()) as {
          artist: {
            id: string;
            name: string;
            pictureUrl: string | null;
            trackTitle: string | null;
            previewUrl: string | null;
          } | null;
        };

        if (!json.artist) {
          const nextJokers = Math.min(1, currentJokers + 1);
          setJokers(nextJokers);
          setRoundMessage(
            nextJokers > currentJokers
              ? "Impasse IA : bonus joker gagné, la partie continue."
              : "Impasse IA : la partie continue.",
          );
          setTimeLeft(turnSeconds);
          setPhase("player-turn");
          return;
        }

        const aiMove: FeatMove = {
          artistId: json.artist.id,
          artistName: json.artist.name,
          pictureUrl: json.artist.pictureUrl,
          trackTitle: json.artist.trackTitle,
          previewUrl: json.artist.previewUrl,
          ts: getTimestamp(),
          isAi: true,
        };
        setMoves([...currentMoves, aiMove]);
        setAiScore((s) => s + 1);
        setRoundMessage("");
        setTimeLeft(turnSeconds);
        setPhase("player-turn");
      } catch {
        await endGame("Erreur réseau.", "ai", currentMoves, currentPlayerScore, currentJokersUsed);
      }
    },
    [difficulty, endGame, turnSeconds],
  );

  // ── Submit player move ────────────────────────────────────────────────────
  async function submitMove(artist: ArtistResult, options?: { consumeJoker?: boolean }) {
    if (phase !== "player-turn" && phase !== "joker") return;
    setPhase("validating");

    const consumeJoker = options?.consumeJoker ?? false;
    const finalJokersUsed = jokersUsed + (consumeJoker ? 1 : 0);

    try {
      const res = await fetch("/api/battle-feat/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prevArtistId: currentArtistId,
          prevArtistName: currentArtistName,
          nextArtistId: artist.id,
          nextArtistName: artist.name,
        }),
      });
      const json = (await res.json()) as { valid: boolean; trackTitle?: string | null; previewUrl?: string | null };

      if (!json.valid) {
        await endGame(
          `${artist.name} n'a pas de featuring connu avec ${currentArtistName}.`,
          "ai",
          moves,
          playerScore,
          finalJokersUsed,
        );
        return;
      }

      const move: FeatMove = {
        artistId: artist.id,
        artistName: artist.name,
        pictureUrl: artist.pictureUrl,
        trackTitle: json.trackTitle ?? null,
        previewUrl: json.previewUrl ?? null,
        ts: getTimestamp(),
        isAi: false,
      };
      const newMoves = [...moves, move];
      const newPlayerScore = playerScore + 1;
      const remainingJokers = consumeJoker ? Math.max(0, jokers - 1) : jokers;

      setMoves(newMoves);
      setPlayerScore(newPlayerScore);
      setRoundMessage("");
      if (consumeJoker) {
        setJokers((v) => Math.max(0, v - 1));
        setJokersUsed(finalJokersUsed);
      }

      setPhase("ai-thinking");
      await triggerAiMove(
        newMoves,
        newPlayerScore,
        artist.id,
        [...usedIds, artist.id],
        remainingJokers,
        finalJokersUsed,
      );
    } catch {
      await endGame("Erreur réseau.", "ai", moves, playerScore, finalJokersUsed);
    }
  }

  // ── Joker ─────────────────────────────────────────────────────────────────
  async function handleJoker() {
    if (phase !== "player-turn" || jokers < 1) return;
    setPhase("joker");

    try {
      const res = await fetch("/api/battle-feat/joker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentArtistId, usedIds }),
      });
      const json = (await res.json()) as {
        artist: {
          id: string;
          name: string;
          pictureUrl: string | null;
          trackTitle: string | null;
        } | null;
      };

      if (!json.artist) {
        await endGame("Aucun featuring disponible !", "ai", moves, playerScore);
        return;
      }

      const jokerArtist: ArtistResult = {
        id: json.artist.id,
        name: json.artist.name,
        nameSlug: "",
        fanCount: 0,
        popularityTier: 3,
        pictureUrl: json.artist.pictureUrl,
      };
      await submitMove(jokerArtist, { consumeJoker: true });
    } catch {
      setPhase("player-turn");
    }
  }

  const timerProgress = ((turnSeconds - timeLeft) / turnSeconds) * 100;

  // ── SETUP ─────────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="space-y-8">
        <div className="card p-6 md:p-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Swords size={20} className="text-[color:var(--accent)]" />
            Difficulté
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {difficultyConfig.map((d) => (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                className={`rounded-xl border p-4 text-left transition ${
                  difficulty === d.value
                    ? `${d.border} ${d.bg} ring-1 ring-current ${d.color}`
                    : "border-[color:var(--border)] hover:border-[color:var(--muted)]"
                }`}
              >
                <p className={`font-bold ${d.color}`}>{d.label}</p>
                <p className="text-xs text-[color:var(--muted)] mt-1">{d.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="card p-6 md:p-8">
          <h2 className="text-lg font-bold mb-4">Artiste de départ</h2>
          {startingArtist ? (
            <div className="flex items-center gap-3">
              <ArtistChip name={startingArtist.name} pictureUrl={startingArtist.pictureUrl} />
              <button onClick={() => setStartingArtist(null)} className="btn-ghost !px-3 !py-1.5 text-sm">
                Changer
              </button>
            </div>
          ) : (
            <ArtistSearchInput
              onSelect={setStartingArtist}
              placeholder="Choisis l'artiste de départ…"
              autoFocus
            />
          )}
        </div>

        <button
          onClick={startGame}
          disabled={!startingArtist}
          className="btn-primary w-full py-3 text-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Swords size={20} /> Lancer la partie
        </button>
      </div>
    );
  }

  // ── GAME OVER ─────────────────────────────────────────────────────────────
  if (phase === "game-over") {
    return (
      <div className="space-y-6">
        <div className="card p-8 text-center">
          <Trophy
            size={48}
            className={`mx-auto mb-4 ${gameOverWinner === "player" ? "text-yellow-400" : "text-[color:var(--muted)]"}`}
          />
          <h2 className="text-2xl font-black">
            {gameOverWinner === "player" ? "Victoire !" : "Partie terminée !"}
          </h2>
          <p className="mt-2 text-[color:var(--muted)]">{gameOverReason}</p>
          <div className="mt-6 flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-black text-[color:var(--accent)]">{playerScore}</p>
              <p className="text-xs text-[color:var(--muted)]">tes feats</p>
            </div>
            <span className="text-2xl text-[color:var(--muted)]">–</span>
            <div className="text-center">
              <p className="text-3xl font-black text-blue-400">{aiScore}</p>
              <p className="text-xs text-[color:var(--muted)]">feats IA</p>
            </div>
          </div>
          {jokersUsed > 0 && (
            <p className="mt-3 text-xs text-[color:var(--muted)]">
              {jokersUsed} joker{jokersUsed > 1 ? "s" : ""} utilisé{jokersUsed > 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-bold mb-3">La chaîne</h3>
          <div className="space-y-2">
            {startingArtist && (
              <ArtistChip name={startingArtist.name} pictureUrl={startingArtist.pictureUrl} />
            )}
            {moves.map((m, i) => (
              <ArtistChip
                key={m.artistId + i}
                name={m.artistName}
                pictureUrl={m.pictureUrl}
                trackTitle={m.trackTitle}
                previewUrl={m.previewUrl}
                onPlayPreview={playPreview}
                isAi={m.isAi}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          {sessionId && (
            <button
              onClick={() => router.push(`/battle-feat/results/${sessionId}`)}
              className="btn-primary flex-1"
            >
              Voir les résultats <ArrowRight size={16} />
            </button>
          )}
          <button
            onClick={() => {
              setPhase("setup");
              setMoves([]);
              setPlayerScore(0);
              setAiScore(0);
            }}
            className="btn-ghost flex-1"
          >
            Rejouer
          </button>
          {saving && (
            <span className="btn-ghost !cursor-wait opacity-60">
              <Loader2 size={14} className="animate-spin" /> Sauvegarde…
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────
  const isPlayerTurn = phase === "player-turn";
  const isBlocked = phase === "validating" || phase === "joker";
  const isAiThinking = phase === "ai-thinking";

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      <div className="card flex items-center justify-between px-4 py-2 text-sm">
        <span className={`font-semibold ${isPlayerTurn ? "text-[color:var(--accent)]" : ""}`}>
          Toi : {playerScore}
        </span>
        <span className="text-[color:var(--muted)] text-xs">vs</span>
        <span className={`font-semibold ${isAiThinking ? "text-blue-400" : ""}`}>
          IA : {aiScore}
        </span>
      </div>

      {/* Timer bar — only meaningful on player's turn */}
      <div className="h-1.5 w-full rounded-full bg-[color:var(--surface-2)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isPlayerTurn
              ? timeLeft > Math.ceil(turnSeconds * 0.5)
                ? "bg-green-400"
                : timeLeft > Math.ceil(turnSeconds * 0.25)
                ? "bg-yellow-400"
                : "bg-red-400"
              : "bg-[color:var(--surface-2)]"
          }`}
          style={{ width: isPlayerTurn ? `${100 - timerProgress}%` : "100%" }}
        />
      </div>

      {/* Audio mini-player */}
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
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </div>
      )}

      {/* Chain */}
      <div className="card p-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)] mb-1">
          Chaîne en cours
        </p>
        {moves.length === 0 && startingArtist && (
          <ArtistChip name={startingArtist.name} pictureUrl={startingArtist.pictureUrl} />
        )}
        {moves.slice(-4).map((m, i, arr) => (
          <ArtistChip
            key={m.artistId + i}
            name={m.artistName}
            pictureUrl={m.pictureUrl}
            trackTitle={m.trackTitle}
            previewUrl={m.previewUrl}
            onPlayPreview={playPreview}
            isNew={i === arr.length - 1}
            isAi={m.isAi}
          />
        ))}
      </div>

      {/* Action area */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[color:var(--muted)]">
            {isAiThinking ? (
              <span className="flex items-center gap-2">
                <Bot size={14} className="text-blue-400" />
                <span>L&apos;IA réfléchit…</span>
              </span>
            ) : (
              <>
                Trouve un feat avec{" "}
                <strong className="text-white">{currentArtistName}</strong>
              </>
            )}
          </p>
          {isPlayerTurn && (
            <span
              className={`text-xl font-black tabular-nums ${
                timeLeft <= Math.ceil(turnSeconds * 0.25) ? "text-red-400 animate-pulse" : ""
              }`}
            >
              {timeLeft}s
            </span>
          )}
        </div>
        {roundMessage && (
          <p className="rounded-lg border border-yellow-400/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
            {roundMessage}
          </p>
        )}

        {isAiThinking ? (
          <div className="flex items-center justify-center gap-3 py-4 text-blue-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">L&apos;IA joue…</span>
          </div>
        ) : isBlocked ? (
          <div className="flex items-center justify-center gap-3 py-4 text-[color:var(--muted)]">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">
              {phase === "joker" ? "Joker en cours…" : "Vérification…"}
            </span>
          </div>
        ) : (
          <>
            {difficulty === 1 ? (
              <div className="space-y-3">
                <p className="text-xs text-[color:var(--muted)]">
                  Mode facile: 4 propositions directes.
                </p>
                {easyOptions.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {easyOptions.map((artist) => (
                      <button
                        key={artist.id}
                        type="button"
                        onClick={() => submitMove(artist)}
                        className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2 text-left hover:bg-[color:var(--surface-2)]"
                      >
                        {artist.pictureUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={artist.pictureUrl} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-[color:var(--surface-2)]" />
                        )}
                        <span className="truncate text-sm font-medium">{artist.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[color:var(--muted)]">
                    Pas de proposition automatique pour ce tour.
                  </p>
                )}
                <ArtistSearchInput
                  onSelect={submitMove}
                  excludeIds={usedIds}
                  placeholder={`Ou cherche un artiste avec ${currentArtistName}…`}
                  autoFocus
                />
              </div>
            ) : (
              <ArtistSearchInput
                onSelect={submitMove}
                excludeIds={usedIds}
                placeholder={`Artiste avec un feat avec ${currentArtistName}…`}
                autoFocus
              />
            )}
            {jokers > 0 && (
              <button onClick={handleJoker} className="btn-ghost w-full text-sm">
                <Zap size={14} className="text-yellow-400" />
                Utiliser le joker — il te trouve un feat
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
