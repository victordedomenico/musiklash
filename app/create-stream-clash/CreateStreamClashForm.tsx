"use client";

import { useState, useTransition } from "react";
import TrackPicker from "@/components/TrackPicker";
import GenrePicker from "@/components/GenrePicker";
import Input from "@/components/ui/Input";
import { createStreamClash, type StreamClashTrackInput } from "./actions";
import type { MusicGenre } from "@/lib/genres";
import type { SelectedTrack } from "@/app/create-bracket/actions";

type Difficulty = "easy" | "normal" | "hard";

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; desc: string }[] = [
  { value: "easy", label: "Facile", desc: "N'importe quel écart de popularité" },
  { value: "normal", label: "Normal", desc: "Écart modéré — proche mais distinguable" },
  { value: "hard", label: "Difficile", desc: "Écart très faible — très difficile à deviner" },
];

const ROUNDS_OPTIONS = [5, 10, 15, 20];

export default function CreateStreamClashForm({ mode }: { mode: "solo" | "multi" }) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<MusicGenre | null>(null);
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
        genre,
        visibility,
        tracks: tracksWithRank,
        mode,
        difficulty,
        totalRounds,
      });
      if (res?.error) setError(res.error);
    });
  };

  const visHint =
    mode === "multi"
      ? "En multijoueur, le contenu doit rester publié (la room en dépend)."
      : visibility === "public"
        ? "Visible dans Explorer. Accessible à tous par lien."
        : visibility === "private"
          ? "Non visible dans Explorer. Accessible par lien direct ou depuis ta bibliothèque."
          : "Éphémère : le Stream Clash sera supprimé définitivement après la partie.";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Ligne 1 — Titre */}
      <div>
        <label className="text-sm font-medium">Titre</label>
        <Input
          required
          className="mt-1 max-w-md"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. Top hits 2024"
        />
      </div>

      {/* Ligne 2 — Difficulté */}
      <div>
        <label className="text-sm font-medium">Difficulté</label>
        <p className="mt-0.5 text-xs text-[color:var(--muted)]">
          Écart de popularité minimal entre les deux morceaux d&apos;une paire.
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {DIFFICULTY_OPTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDifficulty(d.value)}
              data-active={difficulty === d.value}
              className="btn-chip flex-col items-start gap-0.5 py-3 text-left"
            >
              <span className="font-semibold">{d.label}</span>
              <span className="text-xs text-[color:var(--muted)]">{d.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ligne 3 — Nombre de manches */}
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

      {/* Ligne 4 — Genre musical */}
      <GenrePicker value={genre} onChange={setGenre} />

      {/* Ligne 5 — Publication */}
      <div>
        <label className="text-sm font-medium">Publication</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {(["private", "public", "none"] as const).map((v) => (
            <button
              key={v}
              type="button"
              disabled={mode === "multi" && v === "none"}
              onClick={() => setVisibility(v)}
              className="btn-chip disabled:opacity-40 disabled:cursor-not-allowed"
              data-active={visibility === v}
            >
              {v === "private"
                ? "Publié — Privé"
                : v === "public"
                  ? "Publié — Public"
                  : "Non publié"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[color:var(--muted)]">{visHint}</p>
      </div>

      {/* Picker */}
      <TrackPicker size={50} selected={tracks} onChange={setTracks} freeMode genre={genre} />

      {error ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {/* Footer */}
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
          {pending
            ? "Création…"
            : mode === "multi"
              ? "Créer et lancer la room"
              : "Créer le Stream Clash"}
        </button>
      </div>
    </form>
  );
}
