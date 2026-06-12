"use client";

import { motion } from "framer-motion";
import type { SmashPassChoice } from "@/lib/smash-pass";
import { useSoundFx } from "@/lib/use-sound-fx";

type Props = {
  smashCount: number;
  passCount: number;
  disabled?: boolean;
  onVote: (choice: SmashPassChoice) => void;
};

export default function SmashPassControls({ smashCount, passCount, disabled, onVote }: Props) {
  const { play } = useSoundFx();

  const handlePass = () => {
    if (disabled) return;
    play("pass");
    onVote("pass");
  };

  const handleSmash = () => {
    if (disabled) return;
    play("smash");
    onVote("smash");
  };

  return (
    <div className="flex gap-4 justify-center max-w-lg mx-auto w-full">
      <motion.button
        type="button"
        disabled={disabled}
        onClick={handlePass}
        className="group relative flex-1 rounded-xl border-2 border-blue-500/80 bg-[color:var(--surface)] py-4 px-4 font-black text-lg text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.35)] transition hover:shadow-[0_0_28px_rgba(59,130,246,0.5)] disabled:opacity-50"
        whileTap={!disabled ? { scale: 0.92, x: -6 } : {}}
        whileHover={!disabled ? { scale: 1.03 } : {}}
      >
        <span className="flex items-center justify-center gap-2">
          PASS
          <span className="rounded-md bg-pink-500/90 px-2 py-0.5 text-sm font-bold text-white">
            {passCount}
          </span>
        </span>
      </motion.button>
      <motion.button
        type="button"
        disabled={disabled}
        onClick={handleSmash}
        className="group relative flex-1 rounded-xl border-2 border-blue-500/80 bg-[color:var(--surface)] py-4 px-4 font-black text-lg text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.35)] transition hover:shadow-[0_0_28px_rgba(59,130,246,0.5)] disabled:opacity-50"
        whileTap={!disabled ? { scale: 0.92, x: 6 } : {}}
        whileHover={!disabled ? { scale: 1.03 } : {}}
      >
        <span className="flex items-center justify-center gap-2">
          <span className="rounded-md bg-emerald-500/90 px-2 py-0.5 text-sm font-bold text-white">
            {smashCount}
          </span>
          SMASH
        </span>
      </motion.button>
    </div>
  );
}
