"use client";

import type { SmashPassChoice } from "@/lib/smash-pass";

type Props = {
  smashCount: number;
  passCount: number;
  disabled?: boolean;
  onVote: (choice: SmashPassChoice) => void;
};

export default function SmashPassControls({
  smashCount,
  passCount,
  disabled,
  onVote,
}: Props) {
  return (
    <div className="flex gap-4 justify-center max-w-lg mx-auto w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote("pass")}
        className="group relative flex-1 rounded-xl border-2 border-blue-500/80 bg-[color:var(--surface)] py-4 px-4 font-black text-lg text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.35)] transition hover:shadow-[0_0_28px_rgba(59,130,246,0.5)] disabled:opacity-50"
      >
        <span className="flex items-center justify-center gap-2">
          PASS
          <span className="rounded-md bg-pink-500/90 px-2 py-0.5 text-sm font-bold text-white">
            {passCount}
          </span>
        </span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onVote("smash")}
        className="group relative flex-1 rounded-xl border-2 border-blue-500/80 bg-[color:var(--surface)] py-4 px-4 font-black text-lg text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.35)] transition hover:shadow-[0_0_28px_rgba(59,130,246,0.5)] disabled:opacity-50"
      >
        <span className="flex items-center justify-center gap-2">
          <span className="rounded-md bg-emerald-500/90 px-2 py-0.5 text-sm font-bold text-white">
            {smashCount}
          </span>
          SMASH
        </span>
      </button>
    </div>
  );
}
