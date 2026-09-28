"use client";

import { Pause, Play, Volume2 } from "lucide-react";
import DeezerTrackLink from "@/components/DeezerTrackLink";
import MusicSourceAttribution from "@/components/MusicSourceAttribution";
import YoutubeEmbed from "@/components/YoutubeEmbed";
import YoutubeMusicTrackLink from "@/components/YoutubeMusicTrackLink";
import type { BracketPreviewSource } from "@/lib/bracket-preview-source";

export default function TrackPreviewBar({
  title,
  deezerTrackId,
  isPlaying,
  onToggle,
  source = "deezer",
  youtubeVideoId = null,
  youtubeActive = false,
}: {
  title: string;
  deezerTrackId?: number | null;
  isPlaying: boolean;
  onToggle: () => void;
  source?: BracketPreviewSource;
  youtubeVideoId?: string | null;
  youtubeActive?: boolean;
}) {
  if (source === "youtube" && youtubeVideoId) {
    return (
      <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]">
        <div className="relative aspect-video w-full bg-[color:var(--surface-2)]">
          <YoutubeEmbed
            videoId={youtubeVideoId}
            title={title}
            active={youtubeActive}
            className="absolute inset-0 h-full w-full"
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5">
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
          <MusicSourceAttribution source="youtube" compact className="shrink-0" />
          <YoutubeMusicTrackLink videoId={youtubeVideoId} compact className="shrink-0" />
        </div>
      </div>
    );
  }

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
      <MusicSourceAttribution source={source} compact deezerVariant="icon" className="shrink-0" />
      {typeof deezerTrackId === "number" && deezerTrackId > 0 ? (
        <DeezerTrackLink deezerTrackId={deezerTrackId} compact className="shrink-0" />
      ) : null}
    </div>
  );
}
