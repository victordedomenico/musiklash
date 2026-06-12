"use client";

import { useEffect, useState } from "react";
import type { MusicGenre } from "@/lib/genres";

export function useDeezerSearch<T>(
  endpoint: string,
  query: string,
  enabled: boolean,
  genre: MusicGenre | null,
): { data: T[]; loading: boolean; browsing: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const trimmed = query.trim();
  const browsing = Boolean(genre && genre !== "autre" && !trimmed);

  useEffect(() => {
    // Clearing stale results when the search is disabled or the query is empty
    // is a legitimate reset-on-dependency-change synchronization.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!enabled) {
      setData([]);
      return;
    }
    if (!trimmed && !genre) {
      setData([]);
      return;
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    const ctrl = new AbortController();
    const timer = setTimeout(
      async () => {
        setLoading(true);
        try {
          const params = new URLSearchParams();
          if (trimmed) params.set("q", trimmed);
          if (genre) params.set("genre", genre);
          const res = await fetch(`${endpoint}?${params.toString()}`, { signal: ctrl.signal });
          const json = await res.json();
          setData(json.data ?? []);
        } catch (e) {
          if ((e as { name?: string }).name !== "AbortError") console.error(e);
        } finally {
          setLoading(false);
        }
      },
      browsing ? 0 : 400,
    );

    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [query, endpoint, enabled, genre, trimmed, browsing]);

  return { data: trimmed || genre ? data : [], loading, browsing };
}
