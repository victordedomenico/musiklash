"use client";

import { useState, useTransition } from "react";
import TrackPicker from "@/components/TrackPicker";
import GenrePicker from "@/components/GenrePicker";
import { createBracket, type SelectedTrack } from "@/app/create-bracket/actions";
import Input from "@/components/ui/Input";
import { MAX_BRACKET_TRACKS } from "@/lib/bracket";
import type { MusicGenre } from "@/lib/genres";

const VIS_HINTS = {
  public: "Visible dans Explorer. Accessible à tous par lien.",
  private: "Non visible dans Explorer. Accessible par lien direct ou depuis ta bibliothèque.",
  none: "Éphémère : le bracket sera supprimé définitivement après la partie.",
} as const;

export default function CreateBracketForm({ mode = "solo" }: { mode?: "solo" | "multi" }) {
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [genre, setGenre] = useState<MusicGenre | null>(null);
  const [visibility, setVisibility] = useState<"private" | "public" | "none">("private");
  const [selected, setSelected] = useState<SelectedTrack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setError(null);
    if (selected.length < 3) {
      setError("Sélectionne au moins 3 morceaux.");
      return;
    }
    startTransition(async () => {
      const res = await createBracket({ title, theme, genre, visibility, mode, tracks: selected });
      if (res?.error) setError(res.error);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Ligne 1 — Titre + Option principale */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Titre</label>
          <Input
            required
            className="mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Tournoi rap FR 2020s"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Thème (optionnel)</label>
          <Input
            className="mt-1"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Ex. Rap français"
          />
        </div>
      </div>

      {/* Ligne 2 — Genre musical */}
      <GenrePicker value={genre} onChange={setGenre} />

      {mode === "multi" ? (
        <p className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
          Room collaborative : partage le lien créé avec les autres joueurs. Chaque duel est décidé
          à la majorité ; une égalité déclenche un pile ou face.
        </p>
      ) : null}

      {/* Ligne 3 — Publication */}
      <div>
        <label className="text-sm font-medium">Publication</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {(["private", "public", "none"] as const)
            .filter((v) => mode === "solo" || v !== "none")
            .map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className="btn-chip"
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
        <p className="mt-2 text-xs text-[color:var(--muted)]">{VIS_HINTS[visibility]}</p>
      </div>

      {/* Picker */}
      <TrackPicker
        size={MAX_BRACKET_TRACKS}
        selected={selected}
        onChange={setSelected}
        unlimited
        genre={genre}
      />

      {error ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-4">
        <p className="text-sm text-[color:var(--muted)]">
          {selected.length} morceau{selected.length !== 1 ? "x" : ""} · min. 3
          {selected.length >= 3 ? (
            <span className="ml-2 text-[color:var(--muted-strong)]">
              → tableau généré automatiquement · un morceau est qualifié par tirage au sort à chaque
              tour impair
            </span>
          ) : null}
        </p>
        <button
          type="submit"
          disabled={pending || selected.length < 3}
          className="btn-primary disabled:opacity-50"
        >
          {pending ? "Création…" : mode === "multi" ? "Créer la room" : "Créer et jouer"}
        </button>
      </div>
    </form>
  );
}
