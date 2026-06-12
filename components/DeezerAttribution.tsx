import { DeezerLogo, type DeezerLogoVariant } from "@/components/DeezerLogo";

type DeezerAttributionProps = {
  compact?: boolean;
  variant?: DeezerLogoVariant;
  className?: string;
};

export default function DeezerAttribution({
  compact = false,
  variant = "horizontal",
  className = "",
}: DeezerAttributionProps) {
  const logoHeight = compact ? 20 : variant === "icon" ? 24 : 26;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      aria-label="Contenu musical fourni par Deezer"
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
        <DeezerLogo variant={variant} height={logoHeight} />
      </a>
    </div>
  );
}
