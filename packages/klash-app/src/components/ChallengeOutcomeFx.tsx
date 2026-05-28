"use client";

import { useMemo } from "react";

type Outcome = "victory" | "defeat" | "draw";

type ChallengeOutcomeFxProps = {
  outcome: Outcome | null;
};

const VICTORY_COLORS = [
  "#facc15",
  "#fde047",
  "#f97316",
  "#22c55e",
  "#38bdf8",
  "#a855f7",
  "#fb7185",
];

const DEFEAT_COLORS = ["#ef4444", "#f87171", "#fb7185", "#e2e8f0", "#94a3b8"];
const DRAW_COLORS = ["#38bdf8", "#a78bfa", "#22d3ee", "#e2e8f0", "#f472b6"];

export default function ChallengeOutcomeFx({ outcome }: ChallengeOutcomeFxProps) {
  const pieces = useMemo(
    () =>
      Array.from(
        {
          length:
            outcome === "victory" ? 70 : outcome === "draw" ? 45 : 48,
        },
        (_, index) => ({
          id: index,
          left: (index * 53) % 100,
          width:
            outcome === "victory"
              ? 7 + (index % 6)
              : outcome === "draw"
                ? 6 + (index % 5)
                : 6 + (index % 5),
          height:
            outcome === "victory"
              ? 12 + (index % 8)
              : outcome === "draw"
                ? 10 + (index % 6)
                : 10 + (index % 6),
          rotate: (index * 29) % 360,
          delay: (index * 61) % 1100,
          duration:
            (outcome === "victory"
              ? 2200
              : outcome === "draw"
                ? 2000
                : 2100) + ((index * 83) % 1600),
          color:
            outcome === "victory"
              ? VICTORY_COLORS[index % VICTORY_COLORS.length]
              : outcome === "draw"
                ? DRAW_COLORS[index % DRAW_COLORS.length]
                : DEFEAT_COLORS[index % DEFEAT_COLORS.length],
        }),
      ),
    [outcome],
  );

  if (!outcome) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
    >
      {outcome === "victory" ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(250,204,21,0.28),rgba(251,146,60,0.12)_40%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.12),transparent_55%)] [animation:challenge-victory-pulse_1800ms_ease-in-out_infinite_alternate]" />
          {pieces.map((piece) => (
            <span
              key={`victory-${piece.id}`}
              className="absolute -top-12 rounded-[2px] shadow-[0_0_8px_rgba(250,204,21,0.45)]"
              style={{
                left: `${piece.left}%`,
                width: piece.width,
                height: piece.height,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotate}deg)`,
                animation: `challenge-confetti-fall ${piece.duration}ms linear ${piece.delay}ms both`,
              }}
            />
          ))}
        </>
      ) : outcome === "draw" ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.22),rgba(15,23,42,0.55)_70%)] [animation:challenge-draw-glow_1700ms_ease-in-out_infinite_alternate]" />
          {pieces.map((piece) => (
            <span
              key={`draw-${piece.id}`}
              className="absolute -top-10 rounded-full opacity-90 shadow-[0_0_6px_rgba(56,189,248,0.45)]"
              style={{
                left: `${piece.left}%`,
                width: piece.width,
                height: piece.height,
                backgroundColor: piece.color,
                animation: `challenge-draw-drift ${piece.duration}ms ease-in-out ${piece.delay}ms both`,
              }}
            />
          ))}
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.22),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.18),rgba(2,6,23,0.65)_72%)] [animation:challenge-defeat-pulse_1600ms_ease-in-out_infinite_alternate]" />
          {pieces.map((piece) => (
            <span
              key={`defeat-${piece.id}`}
              className="absolute -top-10 rounded-full opacity-90 shadow-[0_0_6px_rgba(239,68,68,0.45)]"
              style={{
                left: `${piece.left}%`,
                width: piece.width,
                height: piece.height,
                backgroundColor: piece.color,
                animation: `challenge-defeat-fall ${piece.duration}ms ease-in ${piece.delay}ms both`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
