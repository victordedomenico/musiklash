"use client";

import { useCallback, useSyncExternalStore } from "react";
function verticalSlug() {
  return process.env.NEXT_PUBLIC_KLASH_VERTICAL ?? "musiklash";
}

function storageKey() {
  return `${verticalSlug()}:preview-volume`;
}

function eventName() {
  return `${verticalSlug()}:preview-volume-change`;
}

function readVolume(): number {
  if (typeof window === "undefined") return 0.7;
  const raw = window.localStorage.getItem(storageKey());
  const parsed = raw ? Number.parseFloat(raw) : 0.7;
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.7;
}

function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener(eventName(), handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(eventName(), handler);
    window.removeEventListener("storage", handler);
  };
}

export function setPreviewVolume(volume: number) {
  const clamped = Math.min(1, Math.max(0, volume));
  window.localStorage.setItem(storageKey(), String(clamped));
  window.dispatchEvent(new CustomEvent(eventName()));
}

export function usePreviewVolume() {
  const volume = useSyncExternalStore(subscribe, readVolume, () => 0.7);
  const setVolume = useCallback((next: number) => setPreviewVolume(next), []);
  return { volume, setVolume };
}
