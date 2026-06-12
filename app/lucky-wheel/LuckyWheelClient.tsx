"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Dice6, Play, X } from "lucide-react";
import { useSoundFx } from "@/lib/use-sound-fx";

// ─── Game modes ───────────────────────────────────────────────────────────────

type ModeId = "bracket" | "tierlist" | "blindtest" | "battle-feat" | "smash-pass" | "stream-clash";

type GameModeItem = {
  id: ModeId;
  label: string;
  emoji: string;
  color: string;
  description: string;
  href: string;
};

const BASE_MODES: Omit<GameModeItem, "description">[] = [
  { id: "bracket", label: "Bracket", emoji: "🏆", color: "#ef4444", href: "/create-bracket" },
  { id: "tierlist", label: "Tierlist", emoji: "📊", color: "#f59e0b", href: "/create-tierlist" },
  { id: "blindtest", label: "Blindtest", emoji: "🎧", color: "#8b5cf6", href: "/create-blindtest" },
  { id: "battle-feat", label: "Battle Feat", emoji: "🎤", color: "#06b6d4", href: "/battle-feat" },
  {
    id: "smash-pass",
    label: "Smash or Pass",
    emoji: "💘",
    color: "#ec4899",
    href: "/create-smash-pass",
  },
  {
    id: "stream-clash",
    label: "Stream Clash",
    emoji: "⚡",
    color: "#1db954",
    href: "/create-stream-clash",
  },
];

// ─── Canvas drawing ───────────────────────────────────────────────────────────

function drawWheel(canvas: HTMLCanvasElement, modes: GameModeItem[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 2;

  ctx.clearRect(0, 0, size, size);

  const n = modes.length;
  const segAngle = (2 * Math.PI) / n;

  for (let i = 0; i < n; i++) {
    const startAngle = -Math.PI / 2 + i * segAngle;
    const endAngle = startAngle + segAngle;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = modes[i].color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + segAngle / 2);

    const textX = radius * 0.92;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "700 14px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 3;
    ctx.fillText(modes[i].label, textX, 5);

    ctx.shadowBlur = 0;
    ctx.font = "22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(modes[i].emoji, radius * 0.42, 8);

    ctx.restore();
  }

  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type LuckyWheelTranslations = {
  title: string;
  subtitle: string;
  spinAriaLabel: string;
  spinning: string;
  respin: string;
  randomChose: string;
  playMode: string;
  respin2: string;
  closeAriaLabel: string;
  modeDescs: Record<ModeId, string>;
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function LuckyWheelClient({ t }: { t: LuckyWheelTranslations }) {
  const router = useRouter();
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<GameModeItem | null>(null);
  const [rotation, setRotation] = useState(0);

  const GAME_MODES = useMemo<GameModeItem[]>(
    () => BASE_MODES.map((m) => ({ ...m, description: t.modeDescs[m.id] })),
    [t.modeDescs],
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const winnerRef = useRef<GameModeItem | null>(null);
  const tickIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoSpunRef = useRef(false);

  const { play: playSound } = useSoundFx();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawWheel(canvas, GAME_MODES);
  }, [GAME_MODES]);

  const handleTransitionEnd = useCallback(() => {
    if (tickIntervalRef.current) {
      clearTimeout(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    playSound("spin_end");
    setTimeout(() => playSound("win"), 650);
    setIsSpinning(false);
    if (winnerRef.current) setWinner(winnerRef.current);
  }, [playSound]);

  const spin = useCallback(() => {
    if (isSpinning) return;
    setWinner(null);

    const n = GAME_MODES.length;
    const winnerIdx = Math.floor(Math.random() * n);
    winnerRef.current = GAME_MODES[winnerIdx];

    const segAngle = 360 / n;
    const currentR = rotationRef.current;
    const winnerCenter = (winnerIdx + 0.5) * segAngle;
    const targetAngle = (90 - winnerCenter + 360) % 360;
    const delta = (targetAngle - (currentR % 360) + 360) % 360;
    const newR = currentR + 5 * 360 + delta;

    rotationRef.current = newR;
    setRotation(newR);
    setIsSpinning(true);

    let elapsed = 0;
    const SPIN_MS = 4000;
    const tick = () => {
      elapsed += 50;
      const progress = elapsed / SPIN_MS;
      const nextInterval = 50 + Math.pow(progress, 2) * 350;
      playSound("tick");
      if (elapsed < SPIN_MS - 300) {
        tickIntervalRef.current = setTimeout(tick, nextInterval);
      }
    };
    tickIntervalRef.current = setTimeout(tick, 50);
  }, [isSpinning, playSound, GAME_MODES]);

  useEffect(() => {
    if (hasAutoSpunRef.current) return;
    hasAutoSpunRef.current = true;
    const timer = setTimeout(() => spin(), 700);
    return () => clearTimeout(timer);
  }, [spin]);

  const closeWinner = useCallback(() => {
    setWinner(null);
  }, []);

  const wheelStyle = useMemo(
    () => ({
      transform: `rotate(${rotation}deg)`,
      transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
    }),
    [rotation, isSpinning],
  );

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8 lg:mb-10">
        <div className="mb-2 flex items-center gap-3">
          <Dice6 size={28} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
          <h1 className="section-title">{t.title}</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {t.subtitle}
        </p>
      </div>

      {/* ── Wheel ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-6">
        {/* Wheel + pointer container */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: 380, height: 380 }}
        >
          {/* Rotating canvas */}
          <div
            style={{
              ...wheelStyle,
              width: 360,
              height: 360,
              borderRadius: "50%",
              overflow: "hidden",
              boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            <canvas ref={canvasRef} width={360} height={360} />
          </div>

          {/* Pointer arrow (right side, pointing left) */}
          <div
            style={{
              position: "absolute",
              right: 2,
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "13px solid transparent",
              borderBottom: "13px solid transparent",
              borderRight: "22px solid var(--accent)",
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
              zIndex: 10,
            }}
          />

          {/* Center SPIN button */}
          <motion.button
            onClick={spin}
            disabled={isSpinning}
            aria-label={t.spinAriaLabel}
            animate={isSpinning ? { scale: [1, 1.12, 1] } : {}}
            transition={isSpinning ? { repeat: Infinity, duration: 0.6 } : {}}
            whileTap={!isSpinning ? { scale: 0.9 } : {}}
            style={{
              position: "absolute",
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: isSpinning ? "var(--surface-2)" : "#ffffff",
              color: isSpinning ? "var(--muted)" : "#111111",
              fontWeight: 800,
              fontSize: 10,
              letterSpacing: "0.08em",
              border: "none",
              cursor: isSpinning ? "not-allowed" : "pointer",
              boxShadow: "0 2px 16px rgba(0,0,0,0.3)",
              zIndex: 10,
              userSelect: "none",
            }}
          >
            SPIN
          </motion.button>
        </div>

        {/* Spin CTA */}
        <motion.button
          onClick={spin}
          disabled={isSpinning}
          className="btn-primary px-10 py-3 text-base"
          whileTap={!isSpinning ? { scale: 0.94 } : {}}
          whileHover={!isSpinning ? { scale: 1.04 } : {}}
        >
          <Dice6 size={18} />
          {isSpinning ? t.spinning : t.respin}
        </motion.button>

        {/* Modes legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {GAME_MODES.map((mode) => (
            <span
              key={mode.id}
              className="inline-flex items-center gap-1.5 text-xs"
              style={{ color: "var(--muted)" }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: mode.color }} />
              {mode.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Winner modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {winner && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backdropFilter: "blur(10px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeWinner}
          >
            {/* Confetti particles */}
            {Array.from({ length: 18 }).map((_, i) => (
              <motion.div
                key={i}
                className="pointer-events-none fixed rounded-full"
                style={{
                  width: 8 + (i % 4) * 4,
                  height: 8 + (i % 4) * 4,
                  background: GAME_MODES[i % GAME_MODES.length].color,
                  left: `${10 + ((i * 5) % 80)}%`,
                  top: "-10px",
                }}
                initial={{ y: -20, opacity: 1, rotate: 0 }}
                animate={{
                  y: typeof window !== "undefined" ? window.innerHeight + 40 : 900,
                  opacity: [1, 1, 0],
                  rotate: 360 * (i % 2 === 0 ? 1 : -1),
                  x: (i % 2 === 0 ? 1 : -1) * (20 + ((i * 13) % 80)),
                }}
                transition={{ duration: 1.8 + (i % 4) * 0.3, ease: "easeIn" }}
              />
            ))}

            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 -z-10"
              style={{ background: "rgba(0,0,0,0.72)" }}
            />

            <motion.div
              className="relative w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-strong)",
              }}
              initial={{ scale: 0.7, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeWinner}
                className="absolute right-4 top-4 rounded-xl p-2 transition"
                style={{ color: "var(--muted)" }}
                aria-label={t.closeAriaLabel}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <X size={18} />
              </button>

              <motion.p
                className="mb-5 text-xs font-bold uppercase tracking-[0.25em]"
                style={{ color: "var(--muted)" }}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {t.randomChose}
              </motion.p>

              <motion.div
                className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-2xl text-6xl shadow-xl"
                style={{ background: winner.color }}
                initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
              >
                {winner.emoji}
              </motion.div>

              <motion.h2
                className="mb-1 text-2xl font-black leading-tight"
                style={{ color: "var(--foreground)" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
              >
                {winner.label}
              </motion.h2>
              <motion.p
                className="mb-6 text-sm"
                style={{ color: "var(--muted)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {winner.description}
              </motion.p>

              <button onClick={() => router.push(winner.href)} className="btn-primary mb-3 w-full">
                <Play size={16} />
                {t.playMode.replace("{label}", winner.label)}
              </button>

              <button
                onClick={() => {
                  closeWinner();
                  spin();
                }}
                className="btn-ghost w-full"
              >
                <Dice6 size={14} />
                {t.respin2}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
