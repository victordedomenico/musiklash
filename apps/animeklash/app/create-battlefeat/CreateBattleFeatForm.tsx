"use client";

import { useState, useTransition } from "react";
import { Swords, User, Loader2 } from "lucide-react";
import ArtistSearchInput from "@/components/ArtistSearchInput";
import Input from "@/components/ui/Input";
import type { CharacterResult } from "@/lib/battle-feat";
import { createBattleFeatChallenge } from "./actions";

const DIFFICULTY_OPTIONS = [
  { value: 1, label: "Facile", desc: "20 sec — IA populaire, 4 propositions" },
  { value: 2, label: "Normal", desc: "20 sec — IA élargie" },
  { value: 3, label: "Difficile", desc: "10 sec — IA niche" },
] as const;

export default function CreateBattleFeatForm() {
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState(2);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [startingCharacter, setStartingCharacter] = useState<CharacterResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Le titre est requis.");
      return;
    }
    if (!startingCharacter) {
      setError("Choisis un personnage de départ.");
      return;
    }
    startTransition(async () => {
      const res = await createBattleFeatChallenge({
        title,
        difficulty,
        visibility,
        startingArtistId: startingCharacter.id,
        startingArtistName: startingCharacter.name,
        startingArtistPic: startingCharacter.pictureUrl,
      });
      if (res?.error) setError(res.error);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="text-sm font-medium">Titre</label>
        <Input
          required
          className="mt-1 max-w-md"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. Chaîne de co-apparitions One Piece"
          maxLength={120}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Difficulté</label>
        <p className="mt-0.5 text-xs text-[color:var(--muted)]">
          Détermine le temps par tour et la force de l&apos;IA.
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {DIFFICULTY_OPTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDifficulty(d.value)}
              data-active={difficulty === d.value}
              className="btn-chip flex-col items-start gap-0.5 py-3 text-left"
            >
              <span className="font-semibold">{d.label}</span>
              <span className="text-xs text-[color:var(--muted)]">{d.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Personnage de départ</label>
        <div className="mt-1">
          {startingCharacter ? (
            <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5">
              {startingCharacter.pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={startingCharacter.pictureUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-2)]">
                  <User size={16} className="text-[color:var(--muted)]" />
                </div>
              )}
              <p className="flex-1 truncate font-semibold">{startingCharacter.name}</p>
              <button
                type="button"
                onClick={() => setStartingCharacter(null)}
                className="btn-ghost !px-3 !py-1.5 text-sm"
              >
                Changer
              </button>
            </div>
          ) : (
            <ArtistSearchInput
              onSelect={setStartingCharacter}
              placeholder="Recherche un personnage de départ…"
            />
          )}
        </div>
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
            ? "Visible dans Explorer. Accessible à tous par lien."
            : "Non visible dans Explorer. Accessible par lien direct ou depuis ta bibliothèque."}
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-4">
        <p className="text-sm text-[color:var(--muted)]">
          {startingCharacter
            ? `Personnage : ${startingCharacter.name}`
            : "Aucun personnage sélectionné"}
        </p>
        <button
          type="submit"
          disabled={pending || !startingCharacter || !title.trim()}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Swords size={16} />}
          {pending ? "Création…" : "Créer le BattleClash"}
        </button>
      </div>
    </form>
  );
}
