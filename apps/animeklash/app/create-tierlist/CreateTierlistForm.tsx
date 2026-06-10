"use client";

import { useState, useTransition } from "react";
import AnimePicker, { type SelectedItem } from "@/components/AnimePicker";
import { createTierlist } from "./actions";
import Input from "@/components/ui/Input";

const VIS_HINTS = {
  public: "Visible dans Explorer. Accessible à tous par lien.",
  private: "Non visible dans Explorer. Accessible par lien direct ou depuis ta bibliothèque.",
  none: "Éphémère : la tierlist sera supprimée définitivement après la partie.",
} as const;

export default function CreateTierlistForm() {
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public" | "none">("private");
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (items.length < 2) {
      setError("Il faut au moins 2 éléments.");
      return;
    }
    startTransition(async () => {
      const res = await createTierlist({ title, theme, visibility, tracks: items });
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
            placeholder="Ex. Top personnages One Piece"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Thème (optionnel)</label>
          <Input
            className="mt-1"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Ex. One Piece"
          />
        </div>
      </div>

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

      <AnimePicker
        size={50}
        selected={items}
        onChange={setItems}
        freeMode
        tabs={["anime", "character", "arc", "opening", "ending"]}
      />

      {error ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-4">
        <p className="text-sm text-[color:var(--muted)]">
          {items.length} élément{items.length > 1 ? "s" : ""} sélectionné
          {items.length > 1 ? "s" : ""} · min. 2
        </p>
        <button
          type="submit"
          disabled={pending || items.length < 2}
          className="btn-primary disabled:opacity-50"
        >
          {pending ? "Création…" : "Créer la tierlist"}
        </button>
      </div>
    </form>
  );
}
