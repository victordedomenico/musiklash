"use client";

import { Check, Pause, Play } from "lucide-react";
import { formatRank, type StreamClashTrackData } from "@/lib/stream-clash";

export default function StreamClashTrackCard({
  track,
  chosen,
  revealed,
  isWinner,
  onPick,
  disabled,
  onPlayPreview,
  isPlayingPreview,
  coverClassName = "h-32 w-32",
}: {
  track: StreamClashTrackData;
  chosen: boolean;
  revealed: boolean;
  isWinner: boolean;
  onPick: () => void;
  disabled: boolean;
  onPlayPreview?: () => void;
  isPlayingPreview?: boolean;
  coverClassName?: string;
}) {
  const borderColor = !revealed
    ? chosen
      ? "var(--accent)"
      : "var(--border)"
    : isWinner
      ? "var(--accent)"
      : "var(--border)";

  const canPick = !disabled && !revealed;
  const canPreview = !!track.previewUrl && !!onPlayPreview;

  return (
    <div
      role="button"
      tabIndex={canPick ? 0 : -1}
      onClick={() => canPick && onPick()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && canPick) {
          e.preventDefault();
          onPick();
        }
      }}
      className={`group relative flex w-full flex-col items-center gap-3 rounded-2xl p-5 text-center transition-all duration-200 ${
        canPick ? "cursor-pointer hover:scale-[1.01]" : "cursor-default"
      }`}
      style={{
        background: chosen ? "var(--accent-dim)" : "var(--surface)",
        border: `2px solid ${borderColor}`,
      }}
    >
      <div className={`relative shrink-0 overflow-hidden rounded-xl ${coverClassName}`}>
        {track.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-4xl"
            style={{ background: "var(--surface-2)" }}
          >
            🎵
          </div>
        )}

        {canPreview && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlayPreview?.();
            }}
            className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
            aria-label={isPlayingPreview ? "Pause" : "Écouter"}
          >
            {isPlayingPreview ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
        )}

        {chosen && !revealed && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
            <Check size={32} className="text-white" />
          </div>
        )}
      </div>

      <div className="w-full">
        <p className="font-bold leading-tight">{track.title}</p>
        <p className="mt-0.5 text-sm text-[color:var(--muted)]">{track.artist}</p>
      </div>

      {revealed && (
        <div
          className={`w-full rounded-xl px-3 py-2 ${
            isWinner
              ? "bg-[color:var(--accent-dim)] text-[color:var(--accent)]"
              : "bg-[color:var(--surface-2)] text-[color:var(--muted)]"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide">
            {isWinner ? "Plus populaire" : "Moins populaire"}
          </p>
          <p className="mt-0.5 text-2xl font-black tabular-nums">{formatRank(track.rank)}</p>
          <p className="text-[10px] text-[color:var(--muted)]">score popularité</p>
        </div>
      )}
    </div>
  );
}
