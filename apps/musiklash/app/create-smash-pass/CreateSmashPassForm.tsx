"use client";

import { useState, useTransition } from "react";
import SmashPassItemPicker from "@/components/smash-pass/SmashPassItemPicker";
import Input from "@/components/ui/Input";
import type { SmashPassItemType } from "@/lib/smash-pass";
import { createSmashPass, type SmashPassItemInput } from "./actions";

const ITEM_TYPES: { value: SmashPassItemType; label: string }[] = [
  { value: "track", label: "Morceaux" },
  { value: "album", label: "Albums" },
  { value: "artist", label: "Artistes" },
];

export default function CreateSmashPassForm({ mode }: { mode: "solo" | "multi" }) {
  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState<SmashPassItemType>("track");
  const [visibility, setVisibility] = useState<"private" | "public" | "none">("private");
  const [items, setItems] = useState<SmashPassItemInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (items.length < 5) {
      setError("Il faut au moins 5 éléments.");
      return;
    }
    startTransition(async () => {
      const res = await createSmashPass({ title, itemType, visibility, items, mode });
      if (res?.error) setError(res.error);
    });
  };

  const visHint =
    mode === "multi"
      ? "En multijoueur, le deck doit rester publié (la room en dépend)."
      : visibility === "public"
      ? "Visible dans Explorer. Accessible à tous par lien."
      : visibility === "private"
      ? "Non visible dans Explorer. Accessible par lien direct ou depuis ta bibliothèque."
      : "Éphémère : le deck sera supprimé définitivement après la partie.";

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
          placeholder="Ex. Rap FR — Smash or Pass"
        />
      </div>

      {/* Ligne 2 — Type de contenu */}
      <div>
        <label className="text-sm font-medium">Type de contenu</label>
        <p className="mt-0.5 text-xs text-[color:var(--muted)]">
          Choisir un type vide la sélection en cours.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ITEM_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setItemType(t.value);
                setItems([]);
              }}
              className="btn-chip"
              data-active={itemType === t.value}
            >
              {t.label}
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

      {/* Picker */}
      <SmashPassItemPicker itemType={itemType} selected={items} onChange={setItems} />

      {error ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-4">
        <p className="text-sm text-[color:var(--muted)]">
          {items.length} élément{items.length > 1 ? "s" : ""} · min. 5
        </p>
        <button
          type="submit"
          disabled={pending || items.length < 5}
          className="btn-primary disabled:opacity-50"
        >
          {pending ? "Création…" : mode === "multi" ? "Créer et lancer la room" : "Lancer Smash or Pass"}
        </button>
      </div>
    </form>
  );
}
