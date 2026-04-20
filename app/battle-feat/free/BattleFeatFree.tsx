"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Swords,
  User,
  Trophy,
  ArrowRight,
  Loader2,
  CheckCircle,
  Play,
  Pause,
  Volume2,
  Zap,
  Link2,
} from "lucide-react";
import ArtistSearchInput from "@/components/ArtistSearchInput";
import type { ArtistResult, FeatMove } from "@/lib/battle-feat";
import { saveSoloSession } from "@/app/battle-feat/solo/actions";
import { usePreviewVolume } from "@/lib/audio-volume";

type Phase = "setup" | "playing" | "validating" | "joker" | "game-over";

// ── ArtistChip ────────────────────────────────────────────────────────────────

function ArtistChip({
  name,
  pictureUrl,
  trackTitle,
  previewUrl,
  isNew,
  onPlayPreview,
}: {
  name: string;
  pictureUrl: string | null;
  trackTitle?: string | null;
  previewUrl?: string | null;
  isNew?: boolean;
  onPlayPreview?: (title: string | null, previewUrl: string | null) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 bg-[color:var(--surface)] transition ${
        isNew
          ? "border-[color:var(--accent)]/60 ring-1 ring-[color:var(--accent)]/30"
          : "border-[color:var(--border)]"
      }`}
    >
      {pictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pictureUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-2)]">
          <User size={16} className="text-[color:var(--muted)]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{name}</p>
        {trackTitle && (
          <p className="truncate text-xs text-[color:var(--muted)]">
            🎵 {trackTitle}
          </p>
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
        <CheckCircle
          size={15}
          className="shrink-0 text-[color:var(--accent)]"
        />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BattleFeatFree() {
  const router = useRouter();

  const [startingArtist, setStartingArtist] = useState<ArtistResult | null>(
    null,
  );
  const [phase, setPhase] = useState<Phase>("setup");
  const [moves, setMoves] = useState<FeatMove[]>([]);
  const [score, setScore] = useState(0);
  const [jokers, setJokers] = useState(1);
  const [jokersUsed, setJokersUsed] = useState(0);
  const [gameOverReason, setGameOverReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [nowPlaying, setNowPlaying] = useState<{
    title: string;
    previewUrl: string;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { volume } = usePreviewVolume();

  const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;
  const currentArtistId = lastMove?.artistId ?? startingArtist?.id ?? "";
  const currentArtistName =
    lastMove?.artistName ?? startingArtist?.name ?? "";
  const usedIds = [
    ...(startingArtist ? [startingArtist.id] : []),
    ...moves.map((m) => m.artistId),
  ];

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  // ── Audio ─────────────────────────────────────────────────────────────────
  const playPreview = useCallback(
    (title: string | null, previewUrl: string | null) => {
      if (!previewUrl) return;
      const url = previewUrl.replace(/^http:\/\//i, "https://");
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = url;
        audioRef.current.volume = volume;
        setNowPlaying({ title: title ?? "Extrait", previewUrl: url });
        void audioRef.current.play().catch(() => null);
      } else {
        const audio = new Audio(url);
        audio.volume = volume;
        audio.onplay = () => setIsPlaying(true);
        audio.onpause = () => setIsPlaying(false);
        audio.onended = () => {
          setIsPlaying(false);
          setNowPlaying(null);
        };
        audioRef.current = audio;
        setNowPlaying({ title: title ?? "Extrait", previewUrl: url });
        void audio.play().catch(() => null);
      }
    },
    [volume],
  );

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) void audioRef.current.play().catch(() => null);
    else audioRef.current.pause();
  };

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
    setScore(0);
    setJokers(1);
    setJokersUsed(0);
    setSessionId(null);
    setPhase("playing");
  };

  // ── End ───────────────────────────────────────────────────────────────────
  const endGame = useCallback(
    async (reason: string, finalMoves: FeatMove[], finalScore: number, finalJokersUsed = jokersUsed) => {
      if (!startingArtist) return;
      audioRef.current?.pause();
      setNowPlaying(null);
      setGameOverReason(reason);
      setPhase("game-over");
      setSaving(true);
      try {
        // difficulty=0 marks this as free mode
        const result = await saveSoloSession(
          0,
          startingArtist.id,
          finalMoves,
          finalScore,
          finalJokersUsed,
        );
        if (result.id) setSessionId(result.id);
      } catch {
        // non-critical
      }
      setSaving(false);
    },
    [startingArtist, jokersUsed],
  );

  // ── Submit move ───────────────────────────────────────────────────────────
  async function submitMove(
    artist: ArtistResult,
    options?: { consumeJoker?: boolean },
  ) {
    if (phase !== "playing" && phase !== "joker") return;
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
      const json = (await res.json()) as {
        valid: boolean;
        trackTitle?: string | null;
        previewUrl?: string | null;
      };

      if (!json.valid) {
        await endGame(
          `${artist.name} n'a pas de featuring connu avec ${currentArtistName}.`,
          moves,
          score,
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
        ts: Date.now(),
        isAi: false,
      };
      const newMoves = [...moves, move];
      const newScore = score + 1;

      setMoves(newMoves);
      setScore(newScore);
      if (consumeJoker) {
        setJokers((v) => Math.max(0, v - 1));
        setJokersUsed(finalJokersUsed);
      }
      setPhase("playing");
    } catch {
      await endGame("Erreur réseau.", moves, score, finalJokersUsed);
    }
  }

  // ── Joker ─────────────────────────────────────────────────────────────────
  async function handleJoker() {
    if (phase !== "playing" || jokers < 1) return;
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
        await endGame("Aucun featuring disponible !", moves, score);
        return;
      }

      await submitMove(
        {
          id: json.artist.id,
          name: json.artist.name,
          nameSlug: "",
          fanCount: 0,
          popularityTier: 3,
          pictureUrl: json.artist.pictureUrl,
        },
        { consumeJoker: true },
      );
    } catch {
      setPhase("playing");
    }
  }

  // ── SETUP ─────────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="space-y-8">
        <div className="card p-6 md:p-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Swords size={20} className="text-[color:var(--accent)]" />
            Artiste de départ
          </h2>
          {startingArtist ? (
            <div className="flex items-center gap-3">
              <ArtistChip
                name={startingArtist.name}
                pictureUrl={startingArtist.pictureUrl}
              />
              <button
                onClick={() => setStartingArtist(null)}
                className="btn-ghost !px-3 !py-1.5 text-sm"
              >
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
          className="btn-primary w-full py-3 text-lg disabled:cursor-not-allowed disabled:opacity-40"
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
          <Trophy size={48} className="mx-auto mb-4 text-yellow-400" />
          <h2 className="text-2xl font-black">Partie terminée !</h2>
          <p className="mt-2 text-[color:var(--muted)]">{gameOverReason}</p>
          <div className="mt-6">
            <p className="text-5xl font-black text-[color:var(--accent)]">
              {score}
            </p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              feat{score !== 1 ? "s" : ""} enchaîné{score !== 1 ? "s" : ""}
            </p>
          </div>
          {jokersUsed > 0 && (
            <p className="mt-3 text-xs text-[color:var(--muted)]">
              {jokersUsed} joker{jokersUsed > 1 ? "s" : ""} utilisé
              {jokersUsed > 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="card p-6">
          <h3 className="mb-3 font-bold">La chaîne complète</h3>
          <div className="space-y-2">
            {startingArtist && (
              <ArtistChip
                name={startingArtist.name}
                pictureUrl={startingArtist.pictureUrl}
              />
            )}
            {moves.map((m, i) => (
              <ArtistChip
                key={m.artistId + i}
                name={m.artistName}
                pictureUrl={m.pictureUrl}
                trackTitle={m.trackTitle}
                previewUrl={m.previewUrl}
                onPlayPreview={playPreview}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          {sessionId && (
            <button
              onClick={() =>
                router.push(`/battle-feat/results/${sessionId}`)
              }
              className="btn-primary flex-1"
            >
              Voir les résultats <ArrowRight size={16} />
            </button>
          )}
          <button
            onClick={() => {
              setPhase("setup");
              setMoves([]);
              setScore(0);
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
  const isBlocked = phase === "validating" || phase === "joker";

  return (
    <div className="space-y-4">
      {/* Score */}
      <div className="card flex items-center justify-between px-4 py-2.5 text-sm">
        <span className="flex items-center gap-2 text-[color:var(--muted)]">
          <Link2 size={14} />
          Chaîne
        </span>
        <span className="text-2xl font-black text-[color:var(--accent)]">
          {score}
        </span>
        <button
          onClick={() => endGame("Partie abandonnée.", moves, score)}
          className="text-xs text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition"
        >
          Abandonner
        </button>
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
            className="shrink-0 rounded-full p-1 transition hover:bg-[color:var(--surface-2)]"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </div>
      )}

      {/* Chain */}
      <div className="card space-y-2 p-5">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[color:var(--muted)]">
          Chaîne en cours
        </p>
        {moves.length === 0 && startingArtist && (
          <ArtistChip
            name={startingArtist.name}
            pictureUrl={startingArtist.pictureUrl}
          />
        )}
        {moves.slice(-5).map((m, i, arr) => (
          <ArtistChip
            key={m.artistId + i}
            name={m.artistName}
            pictureUrl={m.pictureUrl}
            trackTitle={m.trackTitle}
            previewUrl={m.previewUrl}
            onPlayPreview={playPreview}
            isNew={i === arr.length - 1}
          />
        ))}
      </div>

      {/* Input area */}
      <div className="card space-y-4 p-6">
        <p className="text-sm text-[color:var(--muted)]">
          Trouve un feat avec{" "}
          <strong className="text-[color:var(--foreground)]">
            {currentArtistName}
          </strong>
        </p>

        {isBlocked ? (
          <div className="flex items-center justify-center gap-3 py-4 text-[color:var(--muted)]">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">
              {phase === "joker" ? "Joker en cours…" : "Vérification…"}
            </span>
          </div>
        ) : (
          <>
            <ArtistSearchInput
              onSelect={submitMove}
              excludeIds={usedIds}
              placeholder={`Artiste avec un feat avec ${currentArtistName}…`}
              autoFocus
            />
            {jokers > 0 && (
              <button
                onClick={handleJoker}
                className="btn-ghost w-full text-sm"
              >
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
