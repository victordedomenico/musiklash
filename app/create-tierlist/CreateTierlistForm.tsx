"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TrackPicker from "@/components/TrackPicker";
import { createTierlist, type TierlistTrackInput } from "./actions";
import Input from "@/components/ui/Input";

export default function CreateTierlistForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public" | "none">("private");
  const [tracks, setTracks] = useState<TierlistTrackInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (tracks.length < 2) {
      setError("Il faut au moins 2 morceaux.");
      return;
    }
    startTransition(async () => {
      const res = await createTierlist({ title, theme, visibility, tracks });
      if (res?.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Titre de la tierlist</label>
          <Input
            required
            className="mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Meilleurs albums rap FR"
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
          <p className="mt-2 text-xs text-[color:var(--muted)]">
            {visibility === "public"
              ? "Résultats accessibles à tout le monde et par lien."
              : visibility === "private"
              ? "Résultats accessibles uniquement à toi ou par lien direct."
              : "Résultats non sauvegardés : la tierlist sera supprimée définitivement une fois terminée."}
          </p>
        </div>
      </div>

      {/* Réutilise TrackPicker en mode « sans limite fixe » (size=50) */}
      <TrackPicker size={50} selected={tracks} onChange={setTracks} freeMode />

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-4">
        <p className="text-sm text-[color:var(--muted)]">
          {tracks.length} morceau{tracks.length > 1 ? "x" : ""} sélectionné
          {tracks.length > 1 ? "s" : ""}
        </p>
        <button
          type="submit"
          disabled={pending || tracks.length < 2}
          className="btn-primary disabled:opacity-50"
        >
          {pending ? "Création…" : "Créer la tierlist"}
        </button>
      </div>
    </form>
  );
}
