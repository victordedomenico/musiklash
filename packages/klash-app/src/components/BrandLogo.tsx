type BrandMarkProps = Readonly<{
  size?: number;
}>;

export function BrandMark({ size = 40 }: BrandMarkProps) {
  return (
    <span
      aria-hidden
      className="relative inline-flex items-center justify-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        background: "linear-gradient(140deg, #ff2f6d 0%, #ff6b2c 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
      }}
    >
      <svg
        width={Math.round(size * 0.7)}
        height={Math.round(size * 0.7)}
        viewBox="0 0 100 100"
        fill="none"
      >
        <path
          d="M38 20L18 50L38 80"
          stroke="white"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M62 20L82 50L62 80"
          stroke="white"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="50" cy="50" r="9.5" fill="white" />
      </svg>
    </span>
  );
}
