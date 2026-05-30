"use client";

import { useState, useTransition } from "react";
import CharacterPicker, { type SelectedItem } from "@/components/CharacterPicker";
import { createBracket } from "@/app/create-bracket/actions";
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
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const effectiveSize = selected.length >= 3 ? effectiveBracketSize(selected.length) : null;
  const byeCount = effectiveSize ? effectiveSize - selected.length : 0;

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setError(null);
    if (selected.length < 3) {
      setError("Sélectionne au moins 3 personnages.");
      return;
    }
    startTransition(async () => {
      const res = await createBracket({ title, theme, size, visibility, tracks: selected });
      if (res?.error) setError(res.error);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Titre</label>
          <Input
            required
            className="mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Tournoi des plus forts shonen"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Thème (optionnel)</label>
          <Input
            className="mt-1"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Ex. Univers shonen"
          />
        </div>
      </div>

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
        {effectiveSize != null && selected.length >= 3 && (
          <p className="mt-2 text-xs text-[color:var(--muted)]">
            Tableau effectif : {effectiveSize} places
            {byeCount > 0 ? ` (${byeCount} bye${byeCount > 1 ? "s" : ""})` : ""}.
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Visibilité</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {(["private", "public", "none"] as const).map((v) => (
            <button
              key={v}
              type="button"
              className="btn-chip"
              data-active={visibility === v}
              onClick={() => setVisibility(v)}
            >
              {v === "public" ? "Public" : v === "private" ? "Privé" : "Éphémère"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[color:var(--muted)]">{VIS_HINTS[visibility]}</p>
      </div>

      <CharacterPicker size={size} selected={selected} onChange={setSelected} tabs={["hero", "character", "pokemon", "movie", "series", "universe"]} />

      {error && <p className="text-sm text-[color:var(--danger)]">{error}</p>}

      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={pending}>
        {pending ? "Création…" : "Créer le bracket"}
      </button>
    </form>
  );
}
