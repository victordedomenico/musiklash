"use client";

import { useState, useTransition } from "react";
import AnimePicker, { type SelectedItem } from "@/components/AnimePicker";
import { createBlindtest } from "./actions";
import Input from "@/components/ui/Input";

export default function CreateBlindtestForm({ mode }: { mode: "solo" | "multi" }) {
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public" | "none">("private");
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (items.length < 3) {
      setError("Il faut au moins 3 openings/endings.");
      return;
    }
    startTransition(async () => {
      const res = await createBlindtest({ title, visibility, tracks: items, mode });
      if (res?.error) setError(res.error);
    });
  };

  const visHint =
    mode === "multi"
      ? "En multijoueur, le blindtest doit rester publié (la room en dépend)."
      : visibility === "public"
      ? "Visible dans Explorer. Accessible à tous par lien."
      : visibility === "private"
      ? "Non visible dans Explorer. Accessible par lien direct ou depuis ta bibliothèque."
      : "Éphémère : le blindtest sera supprimé définitivement après la partie.";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="text-sm font-medium">Titre</label>
        <Input
          required
          className="mt-1 max-w-md"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. Best Naruto Openings"
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
              className="btn-chip disabled:opacity-40 disabled:cursor-not-allowed"
              data-active={visibility === v}
            >
              {v === "private" ? "Publié — Privé" : v === "public" ? "Publié — Public" : "Non publié"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[color:var(--muted)]">{visHint}</p>
      </div>

      {/* Theme tab restricted to openings/endings only for blindtest */}
      <AnimePicker size={50} selected={items} onChange={setItems} freeMode tabs={["theme"]} />

      {error ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-4">
        <p className="text-sm text-[color:var(--muted)]">
          {items.length} opening{items.length > 1 ? "s" : ""}/ending{items.length > 1 ? "s" : ""} sélectionné
          {items.length > 1 ? "s" : ""} · min. 3
        </p>
        <button
          type="submit"
          disabled={pending || items.length < 3}
          className="btn-primary disabled:opacity-50"
        >
          {pending ? "Création…" : mode === "multi" ? "Créer et lancer la room" : "Créer le blindtest"}
        </button>
      </div>
    </form>
  );
}
