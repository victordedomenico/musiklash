"use client";

import { useState, useTransition } from "react";
import TrackPicker from "@/components/TrackPicker";
import { createBracket, type SelectedTrack } from "@/app/create-bracket/actions";
import Input from "@/components/ui/Input";
import { effectiveBracketSize, VALID_BRACKET_SIZES } from "@/lib/bracket";

const SIZES = VALID_BRACKET_SIZES;

const VIS_HINTS = {
  public: "Visible dans Explorer. Accessible à tous par lien.",
  private: "Non visible dans Explorer. Accessible par lien direct ou depuis ta bibliothèque.",
  none: "Éphémère : le bracket sera supprimé définitivement après la partie.",
} as const;

export default function CreateBracketForm() {
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [size, setSize] = useState<(typeof SIZES)[number]>(8);
  const [visibility, setVisibility] = useState<"private" | "public" | "none">("private");
  const [selected, setSelected] = useState<SelectedTrack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const effectiveSize = selected.length >= 3 ? effectiveBracketSize(selected.length) : null;
  const byeCount = effectiveSize ? effectiveSize - selected.length : 0;

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setError(null);
    if (selected.length < 3) {
      setError("Sélectionne au moins 3 morceaux.");
      return;
    }
    startTransition(async () => {
      const res = await createBracket({ title, theme, size, visibility, tracks: selected });
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

      {/* Ligne 2 — Options supplémentaires */}
      <div>
        <label className="text-sm font-medium">Taille du tournoi</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => {
                if (selected.length > s) setSelected(selected.slice(0, s));
                setSize(s);
              }}
              className="btn-chip"
              data-active={s === size}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Ligne 3 — Publication */}
      <div>
        <label className="text-sm font-medium">Publication</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {(["private", "public", "none"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              className="btn-chip"
              data-active={visibility === v}
            >
              {v === "private" ? "Publié — Privé" : v === "public" ? "Publié — Public" : "Non publié"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[color:var(--muted)]">{VIS_HINTS[visibility]}</p>
      </div>

      {/* Picker */}
      <TrackPicker size={size} selected={selected} onChange={setSelected} />

      {error ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-4">
        <p className="text-sm text-[color:var(--muted)]">
          {selected.length} morceau{selected.length !== 1 ? "x" : ""} · min. 3
          {effectiveSize ? (
            <span className="ml-2 text-[color:var(--muted-strong)]">
              → bracket de {effectiveSize}
              {byeCount > 0 && (
                <span className="text-[color:var(--accent)]">
                  {" "}({byeCount} passe{byeCount > 1 ? "s" : ""} directe{byeCount > 1 ? "s" : ""})
                </span>
              )}
            </span>
          ) : null}
        </p>
        <button
          type="submit"
          disabled={pending || selected.length < 3}
          className="btn-primary disabled:opacity-50"
        >
          {pending ? "Création…" : "Créer et jouer"}
        </button>
      </div>
    </form>
  );
}
