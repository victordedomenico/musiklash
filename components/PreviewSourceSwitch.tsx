"use client";

import type { BracketPreviewSource } from "@/lib/bracket-preview-source";

export default function PreviewSourceSwitch({
  source,
  onChange,
  className = "",
}: {
  source: BracketPreviewSource;
  onChange: (next: BracketPreviewSource) => void;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] p-1 ${className}`}
      role="group"
      aria-label="Source d'écoute"
    >
      <button
        type="button"
        onClick={() => onChange("deezer")}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
          source === "deezer"
            ? "bg-[color:var(--surface)] text-[color:var(--foreground)] shadow-sm"
            : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
        }`}
        aria-pressed={source === "deezer"}
      >
        Deezer
      </button>
      <button
        type="button"
        onClick={() => onChange("youtube")}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
          source === "youtube"
            ? "bg-[color:var(--surface)] text-[color:var(--foreground)] shadow-sm"
            : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
        }`}
        aria-pressed={source === "youtube"}
      >
        YouTube Music
      </button>
    </div>
  );
}
