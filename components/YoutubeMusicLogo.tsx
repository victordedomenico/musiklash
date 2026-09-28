type YoutubeMusicLogoProps = {
  height?: number;
  className?: string;
};

/** Compact YouTube Music mark (icon + wordmark) for attribution. */
export function YoutubeMusicLogo({ height = 20, className = "" }: YoutubeMusicLogoProps) {
  const iconSize = height;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[color:var(--foreground)] ${className}`}
      style={{ height }}
      data-youtube-music-logo
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        className="shrink-0"
      >
        <circle cx="12" cy="12" r="12" fill="#FF0033" />
        <path d="M9.2 7.6v8.8l7.6-4.4-7.6-4.4Z" fill="#fff" />
      </svg>
      <span
        className="font-semibold tracking-tight"
        style={{ fontSize: Math.max(11, Math.round(height * 0.72)), lineHeight: 1 }}
      >
        YouTube Music
      </span>
    </span>
  );
}
