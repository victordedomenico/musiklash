"use client";

import { formatProgress } from "@/lib/smash-pass";

type Props = {
  current: number;
  total: number;
  itemLabel: string;
};

export default function SmashPassProgress({ current, total, itemLabel }: Props) {
  return (
    <p className="text-center text-sm text-[color:var(--muted)]">
      {itemLabel}{" "}
      <span className="inline-flex items-center rounded-md bg-[color:var(--surface-2)] px-2 py-0.5 font-bold text-[color:var(--foreground)]">
        {current}
      </span>{" "}
      sur {total}
      <span className="sr-only"> ({formatProgress(current, total)})</span>
    </p>
  );
}
