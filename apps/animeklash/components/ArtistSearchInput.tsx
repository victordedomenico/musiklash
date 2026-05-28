"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, User } from "lucide-react";
import type { CharacterResult } from "@/lib/battle-feat";

type Props = {
  onSelect: (character: CharacterResult) => void;
  disabled?: boolean;
  excludeIds?: string[];
  placeholder?: string;
  autoFocus?: boolean;
};

export default function ArtistSearchInput({
  onSelect,
  disabled = false,
  excludeIds = [],
  placeholder = "Cherche un personnage…",
  autoFocus = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(CharacterResult & { animeTitle?: string | null })[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (q: string) => {
      abortRef.current?.abort();
      if (q.length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const res = await fetch(`/api/battle-feat/artists?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as { data: (CharacterResult & { animeTitle?: string | null })[] };
        const filtered = json.data.filter((c) => !excludeIds.includes(c.id));
        setResults(filtered);
        setOpen(filtered.length > 0);
        setHighlightIdx(-1);
      } catch {
        // aborted or error
      } finally {
        setLoading(false);
      }
    },
    [excludeIds],
  );

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (character: CharacterResult) => {
    setQuery("");
    setResults([]);
    setOpen(false);
    onSelect(character);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      const r = results[highlightIdx];
      if (r) handleSelect(r);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]"
        />
        {loading && (
          <Loader2
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)] animate-spin"
          />
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          className="input pl-9 pr-9"
          autoComplete="off"
          autoFocus={autoFocus}
        />
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-2xl">
          {results.map((character, i) => (
            <li key={character.id}>
              <button
                type="button"
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm transition ${
                  i === highlightIdx
                    ? "bg-[color:var(--accent)]/15 text-white"
                    : "hover:bg-[color:var(--surface-2)] text-[color:var(--foreground)]"
                }`}
                onClick={() => handleSelect(character)}
                onMouseEnter={() => setHighlightIdx(i)}
              >
                {character.pictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={character.pictureUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center shrink-0">
                    <User size={14} className="text-[color:var(--muted)]" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate">{character.name}</p>
                  <p className="text-xs text-[color:var(--muted)] truncate">
                    {character.animeTitle
                      ? character.animeTitle
                      : character.favourites > 0
                        ? `${(character.favourites / 1000).toFixed(0)}k fans`
                        : "Personnage"}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
