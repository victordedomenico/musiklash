"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import BlindtestGame, {
  type BlindtrackData,
  type BlindtestAnswer,
  POINTS_PER_TRACK,
} from "@/components/BlindtestGame";
import ChallengeOutcomeFx from "@/components/ChallengeOutcomeFx";
import { saveBlindtestSession } from "./actions";
import { isSingleArtistBlindtest } from "@/lib/blindtest-utils";
import { Trophy, RotateCcw, Share2, Check, X } from "lucide-react";

export default function BlindtestPlayer({
  blindtestId,
  tracks,
}: {
  blindtestId: string;
  tracks: BlindtrackData[];
}) {
  const router = useRouter();
  const [finalAnswers, setFinalAnswers] = useState<BlindtestAnswer[] | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleComplete = (answers: BlindtestAnswer[], score: number) => {
    setFinalAnswers(answers);
    setFinalScore(score);
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

  // ── Results screen ────────────────────────────────────────────────────────
  if (finalAnswers) {
    const maxScore = tracks.length * POINTS_PER_TRACK;
    const pct = Math.round((finalScore / maxScore) * 100);
    const outcome = pct === 50 ? "draw" : pct > 50 ? "victory" : "defeat";
    const shareUrl =
      sessionId && typeof window !== "undefined"
        ? `${window.location.origin}/blindtest/${blindtestId}/results/${sessionId}`
        : null;

    return (
      <div className="space-y-6">
        <ChallengeOutcomeFx outcome={outcome} />
        <div className="card p-8 text-center">
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

          <div className="mt-6 flex justify-center gap-2 flex-wrap">
            <button onClick={handleRestart} className="btn-ghost">
              <RotateCcw size={14} /> Rejouer
            </button>
            {shareUrl ? (
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl).catch(() => {})}
                className="btn-primary"
              >
                <Share2 size={14} /> Copier le lien
              </button>
            ) : saving ? (
              <span className="text-sm text-[color:var(--muted)] self-center">Sauvegarde…</span>
            ) : null}
          </div>
          {saveError && <p className="mt-2 text-xs text-red-400">{saveError}</p>}
        </div>

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
