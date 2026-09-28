import DeezerAttribution from "@/components/DeezerAttribution";
import YoutubeMusicAttribution from "@/components/YoutubeMusicAttribution";
import type { BracketPreviewSource } from "@/lib/bracket-preview-source";

export default function MusicSourceAttribution({
  source,
  compact = false,
  className = "",
  deezerVariant,
}: {
  source: BracketPreviewSource;
  compact?: boolean;
  className?: string;
  deezerVariant?: "horizontal" | "vertical" | "icon";
}) {
  if (source === "youtube") {
    return <YoutubeMusicAttribution compact={compact} className={className} />;
  }
  return <DeezerAttribution compact={compact} variant={deezerVariant} className={className} />;
}
