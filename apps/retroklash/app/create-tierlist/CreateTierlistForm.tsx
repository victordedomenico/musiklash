"use client";

import { useState, useTransition } from "react";
import RetroPicker, { type SelectedItem } from "@/components/RetroPicker";
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
      setError("Il faut au moins 2 films.");
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
            placeholder="Ex. Films sci-fi des années 80"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Thème (optionnel)</label>
          <Input
            className="mt-1"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Ex. Science-fiction"
          />
        </div>
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

      <RetroPicker size={64} selected={items} onChange={setItems} freeMode />

      {error && <p className="text-sm text-[color:var(--danger)]">{error}</p>}

      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={pending}>
        {pending ? "Création…" : "Créer la tierlist"}
      </button>
    </form>
  );
}
