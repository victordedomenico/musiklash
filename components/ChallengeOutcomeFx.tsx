"use client";

import { useMemo } from "react";

type Outcome = "victory" | "defeat" | "draw";

type ChallengeOutcomeFxProps = {
  outcome: Outcome | null;
};

const VICTORY_COLORS = [
  "#facc15",
  "#ef4444",
  "#22c55e",
  "#38bdf8",
  "#a855f7",
  "#fb7185",
];

const DEFEAT_COLORS = ["#ef4444", "#fb7185", "#94a3b8", "#64748b"];
const DRAW_COLORS = ["#38bdf8", "#a78bfa", "#22d3ee", "#e2e8f0"];

export default function ChallengeOutcomeFx({ outcome }: ChallengeOutcomeFxProps) {
  const pieces = useMemo(
    () =>
      Array.from(
        {
          length:
            outcome === "victory" ? 44 : outcome === "draw" ? 30 : 22,
        },
        (_, index) => ({
          id: index,
          left: (index * 37) % 100,
          width:
            outcome === "victory"
              ? 6 + (index % 5)
              : outcome === "draw"
                ? 5 + (index % 4)
                : 4 + (index % 3),
          height:
            outcome === "victory"
              ? 10 + (index % 6)
              : outcome === "draw"
                ? 8 + (index % 5)
                : 7 + (index % 4),
          rotate: (index * 29) % 360,
          delay: (index * 85) % 900,
          duration:
            (outcome === "victory"
              ? 1900
              : outcome === "draw"
                ? 1650
                : 1400) + ((index * 73) % 1400),
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
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.25),transparent_70%)]" />
          {pieces.map((piece) => (
            <span
              key={`victory-${piece.id}`}
              className="absolute -top-10 rounded-sm opacity-90"
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.2),rgba(15,23,42,0.45)_70%)] [animation:challenge-draw-glow_1700ms_ease-in-out_infinite_alternate]" />
          {pieces.map((piece) => (
            <span
              key={`draw-${piece.id}`}
              className="absolute -top-10 rounded-full opacity-80"
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.15),rgba(2,6,23,0.55)_68%)] [animation:challenge-defeat-pulse_1400ms_ease-in-out_infinite_alternate]" />
          {pieces.map((piece) => (
            <span
              key={`defeat-${piece.id}`}
              className="absolute -top-8 rounded-full opacity-75 blur-[0.3px]"
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
