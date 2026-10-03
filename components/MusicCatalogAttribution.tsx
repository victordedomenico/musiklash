import { DeezerLogo } from "@/components/DeezerLogo";
import { YoutubeMusicLogo } from "@/components/YoutubeMusicLogo";

type MusicCatalogAttributionProps = {
  compact?: boolean;
  className?: string;
};

/** Shared “Contenu musical par” line with Deezer + YouTube Music marks. */
export default function MusicCatalogAttribution({
  compact = false,
  className = "",
}: MusicCatalogAttributionProps) {
  const logoHeight = compact ? 18 : 22;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      aria-label="Contenu musical fourni par Deezer et YouTube Music"
    >
      {!compact ? (
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          Contenu musical par
        </span>
      ) : null}
      <a
        href="https://www.deezer.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex transition-opacity hover:opacity-90"
        title="Deezer"
      >
        <DeezerLogo height={logoHeight} />
      </a>
      <span className="text-xs" style={{ color: "var(--border-strong)" }} aria-hidden>
        ·
      </span>
      <a
        href="https://music.youtube.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex text-[color:var(--foreground)] transition-opacity hover:opacity-90"
        title="YouTube Music"
      >
        <YoutubeMusicLogo height={logoHeight} />
      </a>
    </div>
  );
}
