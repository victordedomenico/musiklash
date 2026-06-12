"use client";

import { MUSIC_GENRES, type MusicGenre } from "@/lib/genres";

export default function GenrePicker({
  value,
  onChange,
}: {
  value: MusicGenre | null;
  onChange: (genre: MusicGenre | null) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium">Genre musical (optionnel)</label>
      <div className="mt-1 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className="btn-chip"
          data-active={value === null}
        >
          Aucun
        </button>
        {MUSIC_GENRES.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => onChange(value === g.value ? null : g.value)}
            className="btn-chip"
            data-active={value === g.value}
          >
            {g.fr}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-[color:var(--muted)]">
        Tag pour Explorer · tops du genre sans recherche · résultats filtrés par style Deezer.
      </p>
    </div>
  );
}
