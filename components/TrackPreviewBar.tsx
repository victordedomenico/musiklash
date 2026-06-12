"use client";

import { Pause, Play, Volume2 } from "lucide-react";
import DeezerAttribution from "@/components/DeezerAttribution";

export default function TrackPreviewBar({
  title,
  isPlaying,
  onToggle,
}: {
  title: string;
  isPlaying: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5">
      <Volume2 size={14} className="shrink-0 text-[color:var(--accent)]" />
      <p className="min-w-0 flex-1 truncate text-sm">
        <span className="text-[color:var(--muted)]">En écoute : </span>
        <span className="font-medium">{title}</span>
      </p>
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 rounded-full p-1 transition hover:bg-[color:var(--surface-2)]"
        aria-label={isPlaying ? "Pause" : "Lire"}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <DeezerAttribution compact variant="icon" className="shrink-0" />
    </div>
  );
}
