import { YoutubeMusicLogo } from "@/components/YoutubeMusicLogo";

type YoutubeMusicAttributionProps = {
  compact?: boolean;
  className?: string;
};

export default function YoutubeMusicAttribution({
  compact = false,
  className = "",
}: YoutubeMusicAttributionProps) {
  const logoHeight = compact ? 18 : 22;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      aria-label="Contenu musical fourni par YouTube Music"
    >
      {!compact ? (
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          Contenu musical par
        </span>
      ) : null}
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
