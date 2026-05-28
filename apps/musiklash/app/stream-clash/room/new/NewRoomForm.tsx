"use client";

import { useState, useTransition } from "react";
import { Loader2, Zap } from "lucide-react";
import { createStreamClashRoom } from "./actions";
import type { StreamClashDifficulty } from "@/lib/stream-clash";

const DIFFICULTY_LABELS: Record<StreamClashDifficulty, string> = {
  easy: "Facile",
  normal: "Normal",
  hard: "Difficile",
};

const ROUNDS_OPTIONS = [5, 10, 15, 20];

export default function NewRoomForm({ scId, scTitle }: { scId: string; scTitle: string }) {
  const [difficulty, setDifficulty] = useState<StreamClashDifficulty>("easy");
  const [totalRounds, setTotalRounds] = useState(10);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await createStreamClashRoom({
          streamClashId: scId,
          difficulty,
          totalRounds,
          visibility,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur création room.";
        setError(msg);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-[color:var(--muted)]">
        Contenu sélectionné :{" "}
        <span className="font-semibold text-[color:var(--foreground)]">{scTitle}</span>
      </p>

      {/* Difficulty */}
      <div>
        <label className="text-sm font-medium">Difficulté</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["easy", "normal", "hard"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              data-active={difficulty === d}
              className="btn-chip"
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {/* Rounds */}
      <div>
        <label className="text-sm font-medium">Nombre de manches</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {ROUNDS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setTotalRounds(r)}
              data-active={totalRounds === r}
              className="btn-chip"
            >
              {r} manches
            </button>
          ))}
        </div>
      </div>

      {/* Visibility */}
      <div>
        <label className="text-sm font-medium">Visibilité</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["private", "public"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              data-active={visibility === v}
              className="btn-chip"
            >
              {v === "private" ? "Privée (lien uniquement)" : "Publique"}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full justify-center disabled:opacity-50"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
        {pending ? "Création…" : "Créer la room"}
      </button>
    </form>
  );
}
