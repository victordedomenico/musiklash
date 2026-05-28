"use client";

import { useState, useTransition } from "react";
import TrackPicker from "@/components/TrackPicker";
import { createBlindtest, type BlindtestTrackInput } from "./actions";
import Input from "@/components/ui/Input";

export default function CreateBlindtestForm({ mode }: { mode: "solo" | "multi" }) {
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public" | "none">("private");
  const [tracks, setTracks] = useState<BlindtestTrackInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (tracks.length < 3) {
      setError("Il faut au moins 3 morceaux.");
      return;
    }
    startTransition(async () => {
      const res = await createBlindtest({ title, visibility, tracks, mode });
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
      {/* Ligne 1 — Titre */}
      <div>
        <label className="text-sm font-medium">Titre</label>
        <Input
          required
          className="mt-1 max-w-md"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. Rap FR années 2010"
        />
      </div>

      {/* Ligne 2 — Publication */}
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
      <TrackPicker size={50} selected={tracks} onChange={setTracks} freeMode />

      {error ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-4">
        <p className="text-sm text-[color:var(--muted)]">
          {tracks.length} morceau{tracks.length > 1 ? "x" : ""} sélectionné
          {tracks.length > 1 ? "s" : ""} · min. 3
        </p>
        <button
          type="submit"
          disabled={pending || tracks.length < 3}
          className="btn-primary disabled:opacity-50"
        >
          {pending ? "Création…" : mode === "multi" ? "Créer et lancer la room" : "Créer le blindtest"}
        </button>
      </div>
    </form>
  );
}
