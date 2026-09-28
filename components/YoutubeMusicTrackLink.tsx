import { ExternalLink } from "lucide-react";
import { youtubeMusicWatchUrl } from "@/lib/youtube-embed";

type YoutubeMusicTrackLinkProps = {
  videoId: string;
  className?: string;
  compact?: boolean;
};

/** Opens the track in YouTube Music (music.youtube.com). */
export default function YoutubeMusicTrackLink({
  videoId,
  className = "",
  compact = false,
}: YoutubeMusicTrackLinkProps) {
  const id = videoId.trim();
  if (!id) return null;

  const label = "Écouter sur YouTube Music";

  return (
    <a
      href={youtubeMusicWatchUrl(id)}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--muted)] transition-colors hover:text-[color:var(--foreground)] ${className}`}
    >
      <ExternalLink size={compact ? 14 : 15} aria-hidden="true" />
      {compact ? <span className="sr-only">{label}</span> : <span>YouTube Music</span>}
    </a>
  );
}
