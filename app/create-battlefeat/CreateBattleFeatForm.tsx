"use client";

import { useState, useTransition } from "react";
import { Swords, User, Loader2 } from "lucide-react";
import ArtistSearchInput from "@/components/ArtistSearchInput";
import Input from "@/components/ui/Input";
import type { ArtistResult } from "@/lib/battle-feat";
import { createBattleFeatChallenge } from "./actions";

const difficultyConfig = [
  {
    value: 1,
    label: "Facile",
    color: "text-green-400",
    border: "border-green-400/40",
    bg: "bg-green-400/10",
    desc: "20 sec — IA mainstream, 4 propositions",
  },
  {
    value: 2,
    label: "Normal",
    color: "text-yellow-400",
    border: "border-yellow-400/40",
    bg: "bg-yellow-400/10",
    desc: "20 sec — IA élargie",
  },
  {
    value: 3,
    label: "Difficile",
    color: "text-red-400",
    border: "border-red-400/40",
    bg: "bg-red-400/10",
    desc: "10 sec — IA niche",
  },
] as const;

export default function CreateBattleFeatForm() {
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState(2);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [startingArtist, setStartingArtist] = useState<ArtistResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Le titre est requis.");
      return;
    }
    if (!startingArtist) {
      setError("Choisis un artiste de départ.");
      return;
    }
    startTransition(async () => {
      const res = await createBattleFeatChallenge({
        title,
        difficulty,
        visibility,
        startingArtistId: startingArtist.id,
        startingArtistName: startingArtist.name,
        startingArtistPic: startingArtist.pictureUrl,
      });
      if (res?.error) setError(res.error);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="card p-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Titre du BattleFeat solo</label>
          <Input
            required
            className="mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Chaîne de feats rap FR"
            maxLength={120}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Publication</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {(["private", "public"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className="btn-chip"
                data-active={visibility === v}
              >
                {v === "private" ? "Publié — Privé" : "Publié — Public"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[color:var(--muted)]">
            {visibility === "public"
              ? "Visible dans Explorer et accessible par lien."
              : "Accessible uniquement par lien direct ou depuis ta bibliothèque."}
          </p>
        </div>
      </div>

      <div className="card p-6 space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Swords size={18} className="text-[color:var(--accent)]" />
          Difficulté
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {difficultyConfig.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDifficulty(d.value)}
              className={`rounded-xl border p-4 text-left transition ${
                difficulty === d.value
                  ? `${d.border} ${d.bg} ring-1 ring-current ${d.color}`
                  : "border-[color:var(--border)] hover:border-[color:var(--muted)]"
              }`}
            >
              <p className={`font-bold ${d.color}`}>{d.label}</p>
              <p className="text-xs text-[color:var(--muted)] mt-1">{d.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="card p-6 space-y-3">
        <h2 className="text-lg font-bold">Artiste de départ</h2>
        {startingArtist ? (
          <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5">
            {startingArtist.pictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={startingArtist.pictureUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center shrink-0">
                <User size={16} className="text-[color:var(--muted)]" />
              </div>
            )}
            <p className="flex-1 font-semibold truncate">{startingArtist.name}</p>
            <button
              type="button"
              onClick={() => setStartingArtist(null)}
              className="btn-ghost !px-3 !py-1.5 text-sm"
            >
              Changer
            </button>
          </div>
        ) : (
          <ArtistSearchInput
            onSelect={setStartingArtist}
            placeholder="Choisis l'artiste de départ…"
          />
        )}
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !startingArtist || !title.trim()}
        className="btn-primary w-full py-3 text-lg disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? <Loader2 size={18} className="animate-spin" /> : <Swords size={20} />}
        Créer le BattleFeat solo
      </button>
    </form>
  );
}
