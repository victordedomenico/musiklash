import type { ReactNode } from "react";

export default function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="section-title">{title}</h1>
        {subtitle ? <p className="mt-1 section-subtitle">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}
