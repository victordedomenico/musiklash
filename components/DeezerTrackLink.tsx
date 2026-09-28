import { ExternalLink } from "lucide-react";

type DeezerTrackLinkProps = {
  deezerTrackId: number;
  className?: string;
  compact?: boolean;
};

/** Opens the licensed, full-length listening page for a Deezer track. */
export default function DeezerTrackLink({
  deezerTrackId,
  className = "",
  compact = false,
}: DeezerTrackLinkProps) {
  if (!Number.isSafeInteger(deezerTrackId) || deezerTrackId <= 0) return null;

  const label = "Écouter le morceau entier sur Deezer";

  return (
    <a
      href={`https://www.deezer.com/track/${deezerTrackId}`}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--muted)] transition-colors hover:text-[color:var(--foreground)] ${className}`}
    >
      <ExternalLink size={compact ? 14 : 15} aria-hidden="true" />
      {compact ? <span className="sr-only">{label}</span> : <span>Écouter en entier</span>}
    </a>
  );
}
