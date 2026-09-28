"use client";

import { useCallback, useSyncExternalStore } from "react";

export type BracketPreviewSource = "deezer" | "youtube";

const STORAGE_KEY = "musiklash:bracket-preview-source";
const EVENT_NAME = "musiklash:bracket-preview-source-change";
const DEFAULT_SOURCE: BracketPreviewSource = "deezer";

function parseSource(raw: string | null): BracketPreviewSource {
  return raw === "youtube" ? "youtube" : "deezer";
}

function getSnapshot(): BracketPreviewSource {
  if (typeof window === "undefined") return DEFAULT_SOURCE;
  return parseSource(window.localStorage.getItem(STORAGE_KEY));
}

function getServerSnapshot(): BracketPreviewSource {
  return DEFAULT_SOURCE;
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    onStoreChange();
  };

  const onChange = () => onStoreChange();

  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT_NAME, onChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT_NAME, onChange);
  };
}

export function useBracketPreviewSource() {
  const source = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setSource = useCallback((next: BracketPreviewSource) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
  }, []);

  return { source, setSource };
}
