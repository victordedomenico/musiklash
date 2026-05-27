"use client";

import { useState, useTransition } from "react";
import { Zap } from "lucide-react";
import TrackPicker from "@/components/TrackPicker";
import Input from "@/components/ui/Input";
import { createStreamClash, type StreamClashTrackInput } from "./actions";
import type { SelectedTrack } from "@/app/create-bracket/actions";

type Difficulty = "easy" | "normal" | "hard";

const DIFFICULTY_LABELS: Record<Difficulty, { label: string; desc: string }> = {
  easy: { label: "Facile", desc: "N'importe quel écart de popularité" },
  normal: { label: "Normal", desc: "Écart modéré — proche mais distinguable" },
  hard: { label: "Difficile", desc: "Écart très faible — très difficile à deviner" },
};

const ROUNDS_OPTIONS = [5, 10, 15, 20];

export default function CreateStreamClashForm({ mode }: { mode: "solo" | "multi" }) {
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public" | "none">("private");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [totalRounds, setTotalRounds] = useState(10);
  const [tracks, setTracks] = useState<SelectedTrack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (tracks.length < 4) {
      setError("Il faut au moins 4 morceaux.");
      return;
    }

    const tracksWithRank: StreamClashTrackInput[] = tracks.map((t) => ({
      deezer_track_id: t.deezer_track_id,
      title: t.title,
      artist: t.artist,
      preview_url: t.preview_url,
      cover_url: t.cover_url,
      rank: (t as unknown as { rank?: number }).rank ?? 0,
    }));

    startTransition(async () => {
      const res = await createStreamClash({
        title,
        visibility,
        tracks: tracksWithRank,
        mode,
        difficulty,
        totalRounds,
      });
      if (res?.error) setError(res.error);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Title + visibility */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Titre du Stream Clash</label>
          <Input
            required
            className="mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Top hits 2024"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Publication</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {(["private", "public", "none"] as const).map((v) => (
              <button
                key={v}
                type="button"
                disabled={mode === "multi" && v === "none"}
                onClick={() => setVisibility(v)}
                className="btn-chip"
                data-active={visibility === v}
              >
                {v === "private" ? "Publié — Privé" : v === "public" ? "Publié — Public" : "Non publié"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[color:var(--muted)]">
            {mode === "multi"
              ? "En multijoueur, le contenu doit être conservé."
              : visibility === "public"
              ? "Résultats accessibles à tout le monde."
              : visibility === "private"
              ? "Résultats accessibles uniquement à toi ou par lien direct."
              : "Le contenu sera supprimé définitivement à la fin de la partie."}
          </p>
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <label className="text-sm font-medium">Difficulté</label>
        <p className="mt-0.5 text-xs text-[color:var(--muted)]">
          Détermine l&apos;écart de popularité minimal entre les deux morceaux d&apos;une paire.
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(["easy", "normal", "hard"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              data-active={difficulty === d}
              className="btn-chip flex-col items-start gap-0.5 py-3 text-left"
            >
              <span className="font-semibold">{DIFFICULTY_LABELS[d].label}</span>
              <span className="text-xs text-[color:var(--muted)]">{DIFFICULTY_LABELS[d].desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Rounds (multi only, or solo if they want control) */}
      <div>
        <label className="text-sm font-medium">Nombre de manches</label>
        <div className="mt-1 flex flex-wrap gap-2">
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

      {/* Track picker */}
      <TrackPicker size={50} selected={tracks} onChange={setTracks} freeMode />

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-4">
        <p className="text-sm text-[color:var(--muted)]">
          {tracks.length} morceau{tracks.length > 1 ? "x" : ""} sélectionné
          {tracks.length > 1 ? "s" : ""} · min. 4
        </p>
        <button
          type="submit"
          disabled={pending || tracks.length < 4}
          className="btn-primary disabled:opacity-50"
        >
          <Zap size={14} />
          {pending ? "Création…" : "Créer le Stream Clash"}
        </button>
      </div>
    </form>
  );
}
