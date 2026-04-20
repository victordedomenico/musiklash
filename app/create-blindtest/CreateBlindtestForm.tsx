"use client";

import { useState, useTransition } from "react";
import TrackPicker from "@/components/TrackPicker";
import { createBlindtest, type BlindtestTrackInput } from "./actions";
import Input from "@/components/ui/Input";

export default function CreateBlindtestForm({ mode }: { mode: "solo" | "multi" }) {
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
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

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Titre du blindtest</label>
          <Input
            required
            className="mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Rap FR années 2010"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Visibilité</label>
          <div className="mt-1 flex gap-2">
            {(["private", "public"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className="btn-chip"
                data-active={visibility === v}
              >
                {v === "private" ? "Privé" : "Public"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <TrackPicker size={50} selected={tracks} onChange={setTracks} freeMode />

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-4">
        <p className="text-sm text-[color:var(--muted)]">
          {tracks.length} morceau{tracks.length > 1 ? "x" : ""} sélectionné
          {tracks.length > 1 ? "s" : ""} · 3 min.
        </p>
        <button
          type="submit"
          disabled={pending || tracks.length < 3}
          className="btn-primary disabled:opacity-50"
        >
          {pending ? "Création…" : "Créer le blindtest"}
        </button>
      </div>
    </form>
  );
}
