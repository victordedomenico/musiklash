"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import BlindtestGame, {
  type BlindtrackData,
  type BlindtestAnswer,
  POINTS_PER_TRACK,
} from "@/components/BlindtestGame";
import ChallengeOutcomeFx from "@/components/ChallengeOutcomeFx";
import { deleteTransientBlindtest, saveBlindtestSession } from "./actions";
import { isSingleArtistBlindtest } from "@/lib/blindtest-utils";
import { downloadNodeAsPng } from "@/lib/download-png";
import { Trophy, RotateCcw, Share2, Check, X, Download } from "lucide-react";

export default function BlindtestPlayer({
  blindtestId,
  tracks,
  transient = false,
}: {
  blindtestId: string;
  tracks: BlindtrackData[];
  transient?: boolean;
}) {
  const router = useRouter();
  const [finalAnswers, setFinalAnswers] = useState<BlindtestAnswer[] | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const promotedRef = useRef(false);
  const [promoted, setPromoted] = useState(false);

  // Cleanup on unmount: delete the transient blindtest unless the user saved & shared.
  useEffect(() => {
    if (!transient) return;
    return () => {
      if (promotedRef.current) return;
      void deleteTransientBlindtest(blindtestId);
    };
  }, [transient, blindtestId]);

  const handleComplete = (answers: BlindtestAnswer[], score: number) => {
    setFinalAnswers(answers);
    setFinalScore(score);
    if (transient) {
      // Keep the blindtest + results locally; the user will decide whether to
      // persist them via "Sauvegarder et partager".
      return;
    }
    const maxScore = tracks.length * POINTS_PER_TRACK;

    startTransition(async () => {
      const res = await saveBlindtestSession(blindtestId, answers, score, maxScore);
      if ("error" in res) {
        setSaveError(res.error ?? "Erreur inconnue.");
      } else {
        setSessionId(res.id);
        router.refresh();
      }
    });
  };

  const handleRestart = () => {
    setFinalAnswers(null);
    setFinalScore(0);
    setSessionId(null);
    setSaveError(null);
  };

  const handleDownload = async () => {
    if (!exportRef.current) return;
    setIsDownloading(true);
    try {
      await downloadNodeAsPng(exportRef.current, {
        filename: `blindtest-resultat-${blindtestId}.png`,
        backgroundColor: "var(--surface)",
      });
    } catch {
      alert(
        "Impossible de générer le PNG pour le moment. Réessaie dans quelques secondes.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveAndShare = () => {
    if (!finalAnswers) return;
    const copyLink = async (id: string) => {
      const url = `${window.location.origin}/blindtest/${blindtestId}/results/${id}`;
      try {
        await navigator.clipboard.writeText(url);
        alert(
          promotedRef.current && transient
            ? "Blindtest sauvegardé en privé et lien copié !"
            : "Lien copié dans le presse-papiers !",
        );
      } catch {
        window.prompt("Copie le lien :", url);
      }
    };

    if (sessionId) {
      void copyLink(sessionId);
      return;
    }

    const maxScore = tracks.length * POINTS_PER_TRACK;
    startTransition(async () => {
      const res = await saveBlindtestSession(
        blindtestId,
        finalAnswers,
        finalScore,
        maxScore,
      );
      if ("error" in res) {
        setSaveError(res.error ?? "Erreur inconnue.");
        return;
      }
      if (transient) {
        promotedRef.current = true;
        setPromoted(true);
      }
      setSessionId(res.id);
      await copyLink(res.id);
      router.refresh();
    });
  };

  // ── Results screen ────────────────────────────────────────────────────────
  if (finalAnswers) {
    const maxScore = tracks.length * POINTS_PER_TRACK;
    const pct = Math.round((finalScore / maxScore) * 100);
    const outcome = pct === 50 ? "draw" : pct > 50 ? "victory" : "defeat";

    return (
      <div className="space-y-6">
        <ChallengeOutcomeFx outcome={outcome} />
        {transient ? (
          <p className="no-export rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {promoted
              ? "Résultat sauvegardé en Publié — Privé. Tu peux partager le lien."
              : "Mode non publié : ce blindtest sera supprimé en quittant. Clique sur « Sauvegarder et partager » pour le conserver en Publié — Privé."}
          </p>
        ) : null}
        <div ref={exportRef} className="card p-8 text-center">
          <Trophy className="mx-auto text-yellow-400" size={48} />
          <p className="mt-4 text-4xl font-black">
            {finalScore}
            <span className="text-xl font-normal text-[color:var(--muted)]">
              {" "}/ {maxScore} pts
            </span>
          </p>
          <p className="mt-1 text-[color:var(--muted)]">
            {pct >= 80
              ? "Excellent ! 🔥"
              : pct >= 50
              ? "Pas mal du tout 👌"
              : "Continue de t'entraîner 💪"}
          </p>
        </div>

        <div className="no-export flex flex-wrap justify-center gap-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="btn-ghost disabled:opacity-50"
          >
            <Download size={14} />
            {isDownloading ? "Génération…" : "Enregistrer en PNG"}
          </button>
          <button
            onClick={handleSaveAndShare}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            <Share2 size={14} /> {saving ? "…" : "Sauvegarder et partager"}
          </button>
          <button onClick={handleRestart} className="btn-ghost">
            <RotateCcw size={14} /> Recommencer
          </button>
        </div>
        {saveError && (
          <p className="no-export text-center text-xs text-red-400">{saveError}</p>
        )}

        {/* Track-by-track recap */}
        <div className="space-y-3">
          <h2 className="font-bold text-lg">Récap morceau par morceau</h2>
          {isSingleArtistBlindtest(tracks) ? (
            <p className="text-sm text-[color:var(--muted)]">
              Un seul artiste : les points « artiste » ont été attribués automatiquement à chaque morceau.
            </p>
          ) : null}
          {finalAnswers.map((a) => (
            <div key={a.position} className="card flex gap-4 p-3 items-start">
              {a.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.coverUrl}
                  alt=""
                  className="h-14 w-14 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-[color:var(--surface-2)] shrink-0 flex items-center justify-center text-2xl">
                  🎵
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{a.trueTitle}</p>
                <p className="text-xs text-[color:var(--muted)] truncate">{a.trueArtist}</p>
                <div className="mt-1 flex gap-3 text-xs">
                  <span className={`flex items-center gap-1 ${a.correctTitle ? "text-green-400" : "text-red-400"}`}>
                    {a.correctTitle ? <Check size={11} /> : <X size={11} />}
                    Titre
                    {!a.correctTitle && a.guessTitle && (
                      <span className="text-[color:var(--muted)] line-through ml-1">
                        {a.guessTitle}
                      </span>
                    )}
                  </span>
                  <span className={`flex items-center gap-1 ${a.correctArtist ? "text-green-400" : "text-red-400"}`}>
                    {a.correctArtist ? <Check size={11} /> : <X size={11} />}
                    Artiste
                    {!a.correctArtist && a.guessArtist && (
                      <span className="text-[color:var(--muted)] line-through ml-1">
                        {a.guessArtist}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <p className="text-sm font-bold shrink-0 self-center">
                +{a.points} pts
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Game ──────────────────────────────────────────────────────────────────
  return <BlindtestGame tracks={tracks} onComplete={handleComplete} />;
}
