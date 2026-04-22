"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TrackPicker from "@/components/TrackPicker";
import {
  createBracket,
  type SelectedTrack,
} from "@/app/create-bracket/actions";
import Input from "@/components/ui/Input";
import { effectiveBracketSize, VALID_BRACKET_SIZES } from "@/lib/bracket";

const SIZES = VALID_BRACKET_SIZES;

export default function CreateBracketForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [size, setSize] = useState<(typeof SIZES)[number]>(8);
  const [visibility, setVisibility] = useState<"private" | "public" | "none">("private");
  const [selected, setSelected] = useState<SelectedTrack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const effectiveSize = selected.length >= 3 ? effectiveBracketSize(selected.length) : null;
  const byeCount = effectiveSize ? effectiveSize - selected.length : 0;
  const canSubmit = !pending && selected.length >= 3;

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setError(null);
    if (selected.length < 3) {
      setError("Sélectionne au moins 3 morceaux.");
      return;
    }
    startTransition(async () => {
      const res = await createBracket({
        title,
        theme,
        size,
        visibility,
        tracks: selected,
      });
      if (res?.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div
        className="rounded-[30px] border p-6 md:p-7"
        style={{ borderColor: "var(--border-strong)", background: "var(--surface)" }}
      >
        <p className="mb-5 flex items-center gap-3 text-3xl font-bold">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-black"
            style={{ background: "#ff2f6d", color: "#fff" }}
          >
            1
          </span>
          Configuration
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="bracket-title"
              className="text-sm font-medium uppercase tracking-wide"
              style={{ color: "var(--muted-strong)" }}
            >
              Titre du défi
            </label>
            <Input
              id="bracket-title"
              required
              className="mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Tournoi rap FR 2020s"
            />
          </div>
          <div>
            <label
              htmlFor="bracket-theme"
              className="text-sm font-medium uppercase tracking-wide"
              style={{ color: "var(--muted-strong)" }}
            >
              Thème (optionnel)
            </label>
            <Input
              id="bracket-theme"
              className="mt-1"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex. Rap français"
            />
          </div>

          <div>
            <p
              className="text-sm font-medium uppercase tracking-wide"
              style={{ color: "var(--muted-strong)" }}
            >
              Taille max
            </p>
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
          </div>

          <div>
            <p
              className="text-sm font-medium uppercase tracking-wide"
              style={{ color: "var(--muted-strong)" }}
            >
              Publication
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className="btn-chip"
                data-active={visibility === "private"}
              >
                Publié — Privé
              </button>
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className="btn-chip"
                data-active={visibility === "public"}
              >
                Publié — Public
              </button>
              <button
                type="button"
                onClick={() => setVisibility("none")}
                className="btn-chip"
                data-active={visibility === "none"}
              >
                Non publié
              </button>
            </div>
            <p className="mt-2 text-xs text-[color:var(--muted)]">
              {visibility === "public"
                ? "Résultats accessibles à tout le monde et par lien."
                : visibility === "private"
                ? "Résultats accessibles uniquement à toi ou par lien direct."
                : "Résultats non sauvegardés : le bracket sera supprimé définitivement à la fin de la partie."}
            </p>
          </div>
        </div>
      </div>

      <div
        className="rounded-[30px] border p-6 md:p-7"
        style={{ borderColor: "var(--border-strong)", background: "var(--surface)" }}
      >
        <p className="mb-5 flex items-center gap-3 text-3xl font-bold">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-black"
            style={{ background: "#ff2f6d", color: "#fff" }}
          >
            2
          </span>
          Chercher des morceaux via Deezer
        </p>
        <TrackPicker size={size} selected={selected} onChange={setSelected} />
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div
        className="flex items-center justify-between rounded-2xl border px-5 py-4"
        style={{ borderColor: "var(--border-strong)", background: "var(--surface)" }}
      >
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          <span>
            {selected.length} morceau{selected.length !== 1 ? "x" : ""} sélectionné
            {selected.length !== 1 ? "s" : ""}
          </span>
          {effectiveSize && (
            <span style={{ color: "var(--muted-strong)" }}>
              {" "}→ bracket de {effectiveSize}
              {byeCount > 0 && (
                <span style={{ color: "var(--accent)" }}>
                  {" "}
                  ({byeCount} passe{byeCount > 1 ? "s" : ""} directe
                  {byeCount > 1 ? "s" : ""})
                </span>
              )}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary disabled:opacity-50"
        >
          {pending ? "Création…" : "Créer et jouer"}
        </button>
      </div>
    </form>
  );
}
