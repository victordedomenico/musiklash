"use client";

import { useCallback, useSyncExternalStore } from "react";

const VOLUME_STORAGE_KEY = "musiklash:preview-volume";
const VOLUME_EVENT_NAME = "musiklash:preview-volume-change";
const DEFAULT_VOLUME = 0.7;

function clampVolume(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, value));
}

function parseStoredVolume(raw: string | null): number {
  if (!raw) return DEFAULT_VOLUME;
  const parsed = Number(raw);
  return clampVolume(parsed);
}

function getSnapshot(): number {
  if (typeof window === "undefined") return DEFAULT_VOLUME;
  return parseStoredVolume(window.localStorage.getItem(VOLUME_STORAGE_KEY));
}

function getServerSnapshot(): number {
  return DEFAULT_VOLUME;
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key !== VOLUME_STORAGE_KEY) return;
    onStoreChange();
  };

  const onVolumeChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(VOLUME_EVENT_NAME, onVolumeChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(VOLUME_EVENT_NAME, onVolumeChange);
  };
}

export function usePreviewVolume() {
  const volume = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setVolume = useCallback((nextVolume: number) => {
    const normalized = clampVolume(nextVolume);
    window.localStorage.setItem(VOLUME_STORAGE_KEY, String(normalized));
    window.dispatchEvent(new CustomEvent<number>(VOLUME_EVENT_NAME, { detail: normalized }));
  }, []);

  return { volume, setVolume };
}
