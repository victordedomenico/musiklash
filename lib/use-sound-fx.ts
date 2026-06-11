"use client";

import { useCallback, useRef } from "react";

type SoundName =
  | "tick"
  | "spin_end"
  | "win"
  | "correct"
  | "wrong"
  | "smash"
  | "pass"
  | "vote";

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  return new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
}

function playTick(ctx: AudioContext, vol = 0.25) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 900 + Math.random() * 200;
  osc.type = "square";
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}

function playSpinEnd(ctx: AudioContext) {
  // Descending ratchet clicks then silence
  const times = [0, 0.07, 0.16, 0.27, 0.40, 0.55];
  times.forEach((t, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const vol = 0.18 * (1 - i / times.length);
    osc.frequency.value = 700 - i * 60;
    osc.type = "square";
    gain.gain.setValueAtTime(vol, ctx.currentTime + t);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.06);
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + 0.07);
  });
}

function playWin(ctx: AudioContext) {
  // Ascending fanfare arpeggio
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime + i * 0.11;
    osc.frequency.value = freq;
    osc.type = "triangle";
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.start(t);
    osc.stop(t + 0.28);
  });
}

function playCorrect(ctx: AudioContext) {
  // Short rising chime
  const notes = [659.25, 880];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime + i * 0.1;
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t);
    osc.stop(t + 0.22);
  });
}

function playWrong(ctx: AudioContext) {
  // Short descending buzz
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
}

function playSmash(ctx: AudioContext) {
  // Punchy positive pop
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.16);
}

function playPass(ctx: AudioContext) {
  // Neutral swipe sound
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(350, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

function playVote(ctx: AudioContext) {
  // Clean confirm click
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(750, ctx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.16, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.13);
}

export function useSoundFx() {
  const ctxRef = useRef<AudioContext | null>(null);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = getCtx();
    return ctxRef.current;
  }, []);

  const play = useCallback(
    (name: SoundName) => {
      const ctx = ensureCtx();
      if (!ctx) return;
      if (ctx.state === "suspended") void ctx.resume();
      switch (name) {
        case "tick": playTick(ctx); break;
        case "spin_end": playSpinEnd(ctx); break;
        case "win": playWin(ctx); break;
        case "correct": playCorrect(ctx); break;
        case "wrong": playWrong(ctx); break;
        case "smash": playSmash(ctx); break;
        case "pass": playPass(ctx); break;
        case "vote": playVote(ctx); break;
      }
    },
    [ensureCtx],
  );

  return { play };
}
