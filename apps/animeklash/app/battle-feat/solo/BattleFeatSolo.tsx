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
  Download,
  Share2,
} from "lucide-react";
import ArtistSearchInput from "@/components/ArtistSearchInput";
import ChallengeOutcomeFx from "@/components/ChallengeOutcomeFx";
import type { CharacterResult, FeatMove } from "@/lib/battle-feat";
import { saveSoloSession } from "./actions";
import { downloadNodeAsPng } from "@/lib/download-png";

type Phase = "setup" | "player-turn" | "validating" | "ai-thinking" | "joker" | "game-over";

const TIMER_BY_DIFFICULTY: Record<number, number> = { 1: 20, 2: 20, 3: 10 };

const difficultyConfig = [
  { label: "Facile", value: 1, desc: "20 sec — IA personnages populaires + 4 options" },
  { label: "Normal", value: 2, desc: "20 sec — IA élargie" },
  { label: "Difficile", value: 3, desc: "10 sec — IA tous personnages" },
] as const;

function getTimestamp() {
  return Date.now();
}

function CharacterChip({
  name,
  pictureUrl,
  trackTitle,
  isNew,
  isAi,
}: {
  name: string;
  pictureUrl: string | null;
  trackTitle?: string | null;
  isNew?: boolean;
  isAi?: boolean;
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
          <p className="text-xs text-[color:var(--muted)] truncate">📺 {trackTitle}</p>
        )}
      </div>
      {isNew && (
        isAi
          ? <Bot size={15} className="text-blue-400 shrink-0" />
          : <CheckCircle size={15} className="text-[color:var(--accent)] shrink-0" />
      )}
    </div>
  );
}

export type BattleFeatSoloChallengePreset = {
  id: string;
  title: string;
  difficulty: number;
  startingArtist: {
    id: string;
    name: string;
    pictureUrl: string | null;
  };
};

export default function BattleFeatSolo({
  challenge,
}: {
  challenge?: BattleFeatSoloChallengePreset;
}) {
  const router = useRouter();

  const challengeLocked = !!challenge;
  const initialCharacter: CharacterResult | null = challenge
    ? {
        id: challenge.startingArtist.id,
        name: challenge.startingArtist.name,
        nameSlug: "",
        favourites: 0,
        popularityTier: 3,
        pictureUrl: challenge.startingArtist.pictureUrl,
      }
    : null;

  const [difficulty, setDifficulty] = useState(challenge?.difficulty ?? 2);
  const [startingCharacter, setStartingCharacter] = useState<CharacterResult | null>(initialCharacter);

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
  const [publishMode, setPublishMode] = useState<"none" | "private" | "public">("private");
  const [easyOptions, setEasyOptions] = useState<CharacterResult[]>([]);
  const [roundMessage, setRoundMessage] = useState("");

  const exportRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [promoted, setPromoted] = useState(false);

  const turnSeconds = TIMER_BY_DIFFICULTY[difficulty] ?? 20;

  const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;
  const currentCharacterId = lastMove?.artistId ?? startingCharacter?.id ?? "";
  const currentCharacterName = lastMove?.artistName ?? startingCharacter?.name ?? "";
  const usedIds = [
    ...(startingCharacter ? [startingCharacter.id] : []),
    ...moves.map((m) => m.artistId),
  ];
  const usedIdsKey = usedIds.join(",");

  const startGame = () => {
    if (!startingCharacter) return;
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

  const endGame = useCallback(
    async (
      reason: string,
      winner: "player" | "ai" | null,
      finalMoves: FeatMove[],
      finalPlayerScore: number,
      finalJokersUsed = jokersUsed,
    ) => {
      if (!startingCharacter) return;
      setGameOverReason(reason);
      setGameOverWinner(winner);
      setPhase("game-over");
      if (publishMode === "none") return;
      setSaving(true);
      try {
        const result = await saveSoloSession(
          difficulty,
          startingCharacter.id,
          finalMoves,
          finalPlayerScore,
          finalJokersUsed,
          publishMode,
          challenge?.id ?? null,
        );
        if ("id" in result && result.id) setSessionId(result.id);
      } catch {
        // non-critical
      }
      setSaving(false);
    },
    [difficulty, startingCharacter, jokersUsed, publishMode, challenge],
  );

  const handleDownload = async () => {
    if (!exportRef.current) return;
    setIsDownloading(true);
    try {
      await downloadNodeAsPng(exportRef.current, {
        filename: "battleclash-resultat.png",
        backgroundColor: "var(--surface)",
      });
    } catch {
      alert("Impossible de générer le PNG pour le moment. Réessaie dans quelques secondes.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveAndShare = async () => {
    if (!startingCharacter) return;
    const copyLink = async (id: string) => {
      const url = `${window.location.origin}/battle-feat/results/${id}`;
      try {
        await navigator.clipboard.writeText(url);
        alert(
          publishMode === "none" && !promoted
            ? "Partie sauvegardée en privé et lien copié !"
            : "Lien copié dans le presse-papiers !",
        );
      } catch {
        window.prompt("Copie le lien :", url);
      }
    };

    if (sessionId) {
      await copyLink(sessionId);
      return;
    }

    setSaving(true);
    try {
      const result = await saveSoloSession(
        difficulty,
        startingCharacter.id,
        moves,
        playerScore,
        jokersUsed,
        "private",
        challenge?.id ?? null,
      );
      if ("id" in result && result.id) {
        if (publishMode === "none") setPromoted(true);
        setSessionId(result.id);
        await copyLink(result.id);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTimeout = useEffectEvent(() => {
    void endGame("Temps écoulé !", "ai", moves, playerScore);
  });

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
  }, [phase]);

  useEffect(() => {
    if (phase !== "player-turn" || difficulty !== 1 || !currentCharacterId) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/battle-feat/options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentArtistId: currentCharacterId, usedIds }),
        });
        const json = (await res.json()) as { options: CharacterResult[] };
        if (!cancelled) setEasyOptions(json.options ?? []);
      } catch {
        if (!cancelled) setEasyOptions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [phase, difficulty, currentCharacterId, usedIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerAiMove = useCallback(
    async (
      currentMoves: FeatMove[],
      currentPlayerScore: number,
      characterId: string,
      currentUsedIds: string[],
      currentJokers: number,
      currentJokersUsed: number,
    ) => {
      try {
        const res = await fetch("/api/battle-feat/ai-move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentArtistId: characterId, difficulty, usedIds: currentUsedIds }),
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
          previewUrl: null,
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

  async function submitMove(character: CharacterResult, options?: { consumeJoker?: boolean }) {
    if (phase !== "player-turn" && phase !== "joker") return;
    setPhase("validating");

    const consumeJoker = options?.consumeJoker ?? false;
    const finalJokersUsed = jokersUsed + (consumeJoker ? 1 : 0);

    try {
      const res = await fetch("/api/battle-feat/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prevArtistId: currentCharacterId,
          nextArtistId: character.id,
        }),
      });
      const json = (await res.json()) as { valid: boolean; trackTitle?: string | null };

      if (!json.valid) {
        await endGame(
          `${character.name} n'a pas co-apparu avec ${currentCharacterName}.`,
          "ai",
          moves,
          playerScore,
          finalJokersUsed,
        );
        return;
      }

      const move: FeatMove = {
        artistId: character.id,
        artistName: character.name,
        pictureUrl: character.pictureUrl,
        trackTitle: json.trackTitle ?? null,
        previewUrl: null,
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
        character.id,
        [...usedIds, character.id],
        remainingJokers,
        finalJokersUsed,
      );
    } catch {
      await endGame("Erreur réseau.", "ai", moves, playerScore, finalJokersUsed);
    }
  }

  async function handleJoker() {
    if (phase !== "player-turn" || jokers < 1) return;
    setPhase("joker");

    try {
      const res = await fetch("/api/battle-feat/joker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentArtistId: currentCharacterId, usedIds }),
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
        await endGame("Aucun personnage disponible !", "ai", moves, playerScore);
        return;
      }

      const jokerChar: CharacterResult = {
        id: json.artist.id,
        name: json.artist.name,
        nameSlug: "",
        favourites: 0,
        popularityTier: 3,
        pictureUrl: json.artist.pictureUrl,
      };
      await submitMove(jokerChar, { consumeJoker: true });
    } catch {
      setPhase("player-turn");
    }
  }

  const timerProgress = ((turnSeconds - timeLeft) / turnSeconds) * 100;

  // ── SETUP ─────────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="space-y-8">
        {challenge && (
          <div className="card border-[color:var(--accent)]/40 bg-[color:var(--accent)]/5 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--accent)]">
              Challenge
            </p>
            <p className="mt-1 text-lg font-bold">{challenge.title}</p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              Personnage de départ et difficulté imposés par la création.
            </p>
          </div>
        )}
        <div className="card p-6 md:p-8">
          <div>
            <label className="text-sm font-medium">Difficulté</label>
            <p className="mt-0.5 text-xs text-[color:var(--muted)]">
              Détermine le temps par tour et la force de l&apos;IA.
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {difficultyConfig.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => !challengeLocked && setDifficulty(d.value)}
                  disabled={challengeLocked && difficulty !== d.value}
                  data-active={difficulty === d.value}
                  className={`btn-chip flex-col items-start gap-0.5 py-3 text-left ${
                    challengeLocked && difficulty !== d.value ? "opacity-40 cursor-not-allowed" : ""
                  }`}
                >
                  <span className="font-semibold">{d.label}</span>
                  <span className="text-xs text-[color:var(--muted)]">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-bold uppercase tracking-wide text-[color:var(--muted)]">
              Publication du résultat
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPublishMode("private")} className="btn-chip" data-active={publishMode === "private"}>
                Publié — Privé
              </button>
              <button type="button" onClick={() => setPublishMode("public")} className="btn-chip" data-active={publishMode === "public"}>
                Publié — Public
              </button>
              <button type="button" onClick={() => setPublishMode("none")} className="btn-chip" data-active={publishMode === "none"}>
                Non publié
              </button>
            </div>
          </div>
        </div>

        <div className="card p-6 md:p-8">
          <h2 className="text-lg font-bold mb-4">Personnage de départ</h2>
          {startingCharacter ? (
            <div className="flex items-center gap-3">
              <CharacterChip name={startingCharacter.name} pictureUrl={startingCharacter.pictureUrl} />
              {!challengeLocked && (
                <button
                  type="button"
                  onClick={() => setStartingCharacter(null)}
                  className="btn-ghost !px-3 !py-1.5 text-sm"
                >
                  Changer
                </button>
              )}
            </div>
          ) : (
            <ArtistSearchInput
              onSelect={setStartingCharacter}
              placeholder="Choisis le personnage de départ…"
              autoFocus
            />
          )}
        </div>

        <button
          onClick={startGame}
          disabled={!startingCharacter}
          className="btn-primary w-full py-3 text-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Swords size={20} /> Lancer la partie
        </button>
      </div>
    );
  }

  // ── GAME OVER ─────────────────────────────────────────────────────────────
  if (phase === "game-over") {
    const isDraw = playerScore === aiScore;
    const outcome = isDraw
      ? "draw"
      : gameOverWinner === "player"
        ? "victory"
        : "defeat";

    return (
      <div className="space-y-6">
        <ChallengeOutcomeFx outcome={outcome} />
        {publishMode === "none" ? (
          <p className="no-export rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {promoted
              ? "Résultat sauvegardé en Publié — Privé. Tu peux partager le lien."
              : "Mode non publié : cette partie ne sera pas sauvegardée. Clique sur « Sauvegarder et partager » pour la conserver."}
          </p>
        ) : null}
        <div ref={exportRef} className="space-y-6">
          <div className="card p-8 text-center">
            <Trophy
              size={48}
              className={`mx-auto mb-4 ${
                isDraw
                  ? "text-sky-400"
                  : gameOverWinner === "player"
                    ? "text-yellow-400"
                    : "text-[color:var(--muted)]"
              }`}
            />
            <h2 className="text-2xl font-black">
              {isDraw
                ? "Égalité !"
                : gameOverWinner === "player"
                  ? "Victoire !"
                  : "Partie terminée !"}
            </h2>
            <p className="mt-2 text-[color:var(--muted)]">{gameOverReason}</p>
            <div className="mt-6 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-3xl font-black text-[color:var(--accent)]">{playerScore}</p>
                <p className="text-xs text-[color:var(--muted)]">tes coups</p>
              </div>
              <span className="text-2xl text-[color:var(--muted)]">–</span>
              <div className="text-center">
                <p className="text-3xl font-black text-blue-400">{aiScore}</p>
                <p className="text-xs text-[color:var(--muted)]">coups IA</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-bold mb-3">La chaîne</h3>
            <div className="space-y-2">
              {startingCharacter && (
                <CharacterChip name={startingCharacter.name} pictureUrl={startingCharacter.pictureUrl} />
              )}
              {moves.map((m, i) => (
                <CharacterChip
                  key={m.artistId + i}
                  name={m.artistName}
                  pictureUrl={m.pictureUrl}
                  trackTitle={m.trackTitle}
                  isAi={m.isAi}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="no-export flex flex-wrap gap-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="btn-ghost flex-1 disabled:opacity-50"
          >
            <Download size={14} />
            {isDownloading ? "Génération…" : "Enregistrer en PNG"}
          </button>
          <button
            onClick={handleSaveAndShare}
            disabled={saving}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            <Share2 size={14} /> {saving ? "…" : "Sauvegarder et partager"}
          </button>
          {sessionId && (
            <button
              onClick={() => router.push(`/battle-feat/results/${sessionId}`)}
              className="btn-ghost flex-1"
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
              setPromoted(false);
            }}
            className="btn-ghost flex-1"
          >
            Recommencer
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
      <div className="card flex items-center justify-between px-4 py-2 text-sm">
        <span className={`font-semibold ${isPlayerTurn ? "text-[color:var(--accent)]" : ""}`}>
          Toi : {playerScore}
        </span>
        <span className="text-[color:var(--muted)] text-xs">vs</span>
        <span className={`font-semibold ${isAiThinking ? "text-blue-400" : ""}`}>
          IA : {aiScore}
        </span>
      </div>

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

      <div className="card p-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--muted)] mb-1">
          Chaîne en cours
        </p>
        {moves.length === 0 && startingCharacter && (
          <CharacterChip name={startingCharacter.name} pictureUrl={startingCharacter.pictureUrl} />
        )}
        {moves.slice(-4).map((m, i, arr) => (
          <CharacterChip
            key={m.artistId + i}
            name={m.artistName}
            pictureUrl={m.pictureUrl}
            trackTitle={m.trackTitle}
            isNew={i === arr.length - 1}
            isAi={m.isAi}
          />
        ))}
      </div>

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
                Trouve un personnage qui a côtoyé{" "}
                <strong className="text-white">{currentCharacterName}</strong>
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
                  Mode facile : 4 propositions directes.
                </p>
                {easyOptions.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {easyOptions.map((character) => (
                      <button
                        key={character.id}
                        type="button"
                        onClick={() => submitMove(character)}
                        className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2 text-left hover:bg-[color:var(--surface-2)]"
                      >
                        {character.pictureUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={character.pictureUrl} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-[color:var(--surface-2)]" />
                        )}
                        <span className="truncate text-sm font-medium">{character.name}</span>
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
                  placeholder={`Ou cherche un personnage avec ${currentCharacterName}…`}
                  autoFocus
                />
              </div>
            ) : (
              <ArtistSearchInput
                onSelect={submitMove}
                excludeIds={usedIds}
                placeholder={`Personnage qui a côtoyé ${currentCharacterName}…`}
                autoFocus
              />
            )}
            {jokers > 0 && (
              <button onClick={handleJoker} className="btn-ghost w-full text-sm">
                <Zap size={14} className="text-yellow-400" />
                Utiliser le joker — il te trouve un personnage
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
