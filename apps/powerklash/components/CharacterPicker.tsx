"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Plus, X, ChevronLeft, Check, Tv, User, Layers } from "lucide-react";
import Image from "next/image";
import type { ContentItem, ContentCollection } from "@klash/content-adapter";
import { withSearchQuery } from "@/lib/api-url";

export type SelectedItem = {
  external_id: string;
  title: string;
  subtitle?: string;
  cover_url: string | null;
  preview_url?: string | null;
  source?: string;
  metadata?: Record<string, unknown>;
};

type Props = {
  size: number;
  selected: SelectedItem[];
  onChange: (next: SelectedItem[]) => void;
  freeMode?: boolean;
  /** Which content types are available (default: all) */
  tabs?: Tab[];
};

type Tab = "anime" | "character" | "theme" | "arc";

/** Local display type for opened anime's themes */
type ThemeResult = {
  id: string;
  title: string;
  type: string;
  videoUrl: string | null;
  coverUrl: string | null;
  animeTitle: string;
};

// ─── Typed metadata helpers ───────────────────────────────────────────────────

function num(v: unknown): number | undefined {
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function str(v: unknown): string | undefined {
  return v != null && v !== "" ? String(v) : undefined;
}

// ─── Debounced search hook ────────────────────────────────────────────────────

function useDebouncedSearch(
  endpoint: string,
  query: string,
  enabled: boolean,
): { results: ContentItem[]; loading: boolean } {
  const [results, setResults] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const trimmed = query.trim();
  const active = Boolean(trimmed && enabled);

  useEffect(() => {
    if (!active) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(withSearchQuery(endpoint, trimmed), { signal: ctrl.signal });
        const json = await res.json();
        setResults(json.results ?? []);
      } catch (e) {
        if ((e as { name?: string }).name !== "AbortError") console.error(e);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [trimmed, endpoint, active]);

  return { results: active ? results : [], loading: active ? loading : false };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CharacterPicker({
  size,
  selected,
  onChange,
  freeMode = false,
  tabs = ["character", "anime"],
}: Props) {
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [query, setQuery] = useState("");
  const [openedAnime, setOpenedAnime] = useState<ContentItem | null>(null);
  const [openedAnimeForArcs, setOpenedAnimeForArcs] = useState<ContentItem | null>(null);
  const [animeThemes, setAnimeThemes] = useState<ThemeResult[]>([]);
  const [animeArcs, setAnimeArcs] = useState<ContentCollection[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [arcsLoading, setArcsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: animeResults, loading: animeLoading } = useDebouncedSearch(
    "/api/content/search?kind=anime",
    query,
    tab === "anime" || tab === "theme" || (tab === "arc" && !openedAnimeForArcs),
  );
  const { results: charResults, loading: charLoading } = useDebouncedSearch(
    "/api/content/search?kind=character",
    query,
    tab === "character",
  );
  const { results: arcSearchResults, loading: arcSearchLoading } = useDebouncedSearch(
    "/api/content/search?kind=arc",
    query,
    tab === "arc" && !openedAnimeForArcs,
  );

  const max = freeMode ? Infinity : size;
  const isSelectedAnime = (id: string) => selected.some((s) => s.external_id === id);
  const isSelectedChar = (id: string) => selected.some((s) => s.external_id === id);
  const isSelectedTheme = (id: string) => selected.some((s) => s.external_id === id);
  // Arc items stored as arc-${numericId}; ContentItem.id is the bare numeric string
  const isSelectedArc = (id: string) => selected.some((s) => s.external_id === `arc-${id}`);

  const addAnime = (item: ContentItem) => {
    if (selected.length >= max) return;
    onChange([...selected, {
      external_id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      cover_url: item.coverUrl ?? null,
      preview_url: null,
      source: "anilist",
      metadata: {
        itemKind: "anime",
        anilistId: num(item.id),
        popularity: num(item.metadata?.popularity) ?? 0,
      },
    }]);
  };

  const addCharacter = (item: ContentItem) => {
    if (selected.length >= max) return;
    onChange([...selected, {
      external_id: item.id, // already "char-123" from characterToItem
      title: item.title,
      subtitle: item.subtitle,
      cover_url: item.coverUrl ?? null,
      preview_url: null,
      source: "anilist",
      metadata: {
        itemKind: "character",
        anilistCharacterId: num(item.metadata?.anilistCharacterId),
      },
    }]);
  };

  /** Add an arc from direct search results (ContentItem with id = bare numeric string). */
  const addArcItem = (item: ContentItem) => {
    if (selected.length >= max) return;
    const pt = str(item.metadata?.parentTitle);
    onChange([...selected, {
      external_id: `arc-${item.id}`,
      title: item.title,
      subtitle: pt,
      cover_url: item.coverUrl ?? null,
      preview_url: null,
      source: "anilist",
      metadata: {
        itemKind: "arc",
        anilistMediaId: num(item.id),
        parentAnimeTitle: pt,
      },
    }]);
  };

  /** Add an arc from a series drill-down (ContentCollection). */
  const addArcCollection = (arc: ContentCollection, parentTitle: string) => {
    if (selected.length >= max) return;
    onChange([...selected, {
      external_id: `arc-${arc.id}`,
      title: arc.title,
      subtitle: parentTitle,
      cover_url: arc.coverUrl ?? null,
      preview_url: null,
      source: "anilist",
      metadata: {
        itemKind: "arc",
        anilistMediaId: num(arc.id),
        parentAnimeTitle: parentTitle,
      },
    }]);
  };

  const addTheme = (t: ThemeResult) => {
    if (selected.length >= max) return;
    onChange([...selected, {
      external_id: t.id,
      title: t.title,
      subtitle: `${t.type} — ${t.animeTitle}`,
      cover_url: t.coverUrl,
      preview_url: t.videoUrl,
      source: "animethemes",
      metadata: { itemKind: "theme", themeType: t.type, animeTitle: t.animeTitle },
    }]);
  };

  const remove = (id: string) => onChange(selected.filter((s) => s.external_id !== id));

  const openAnimeForThemes = async (anime: ContentItem) => {
    setOpenedAnime(anime);
    setOpenedAnimeForArcs(null);
    setThemesLoading(true);
    setAnimeThemes([]);
    try {
      const res = await fetch(`/api/content/collection/${anime.id}/items`);
      const json = (await res.json()) as { items?: ContentItem[] };
      setAnimeThemes(
        (json.items ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          type: str(item.metadata?.themeType) ?? "",
          videoUrl: item.previewUrl ?? null,
          coverUrl: item.coverUrl ?? null,
          animeTitle: str(item.metadata?.animeTitle) ?? anime.title,
        })),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setThemesLoading(false);
    }
  };

  const openAnimeForArcs = async (anime: ContentItem) => {
    setOpenedAnimeForArcs(anime);
    setOpenedAnime(null);
    setArcsLoading(true);
    setAnimeArcs([]);
    try {
      const res = await fetch(`/api/content/entity/${anime.id}/collections`);
      const json = (await res.json()) as { collections?: ContentCollection[] };
      setAnimeArcs(json.collections ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setArcsLoading(false);
    }
  };

  const loading =
    tab === "anime"
      ? animeLoading
      : tab === "character"
        ? charLoading
        : tab === "arc" && !openedAnimeForArcs
          ? arcSearchLoading
          : animeLoading;

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setQuery("");
                setOpenedAnime(null);
                setOpenedAnimeForArcs(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tab === t ? "bg-primary text-primary-content" : "bg-base-200 hover:bg-base-300"
              }`}
            >
              {t === "anime" && <Tv size={14} />}
              {t === "character" && <User size={14} />}
              {t === "arc" && <Layers size={14} />}
              {t === "theme" && <span className="text-xs">♪</span>}
              {t === "anime"
                ? "Titre d'animé"
                : t === "character"
                  ? "Perso d'animé"
                  : t === "arc"
                    ? "Arc d'animé"
                    : "Opening/Ending"}
            </button>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpenedAnime(null);
            setOpenedAnimeForArcs(null);
          }}
          placeholder={
            tab === "anime"
              ? "Rechercher un titre d'animé…"
              : tab === "character"
                ? "Rechercher un perso d'animé…"
                : tab === "arc"
                  ? openedAnimeForArcs
                    ? "Arcs de la série…"
                    : "Rechercher un arc ou une série…"
                  : "Rechercher un animé pour ses openings…"
          }
          className="input input-bordered w-full pl-9"
        />
      </div>

      {/* Theme mode: drill into anime's themes */}
      {tab === "theme" && openedAnime && (
        <div>
          <button
            type="button"
            onClick={() => setOpenedAnime(null)}
            className="flex items-center gap-1 text-sm text-base-content/70 hover:text-base-content mb-2"
          >
            <ChevronLeft size={14} /> Retour
          </button>
          <p className="text-sm font-medium mb-2">{openedAnime.title}</p>
          {themesLoading && <p className="text-sm text-base-content/50">Chargement…</p>}
          {!themesLoading && animeThemes.length === 0 && (
            <p className="text-sm text-base-content/50">Aucun opening/ending trouvé.</p>
          )}
          <ul className="flex flex-col gap-1">
            {animeThemes.map((t) => {
              const already = isSelectedTheme(t.id);
              return (
                <li key={t.id} className="card flex items-center gap-3 p-2">
                  {t.coverUrl && (
                    <div className="w-10 h-10 flex-shrink-0 relative">
                      <Image src={t.coverUrl} alt="" fill className="object-cover rounded" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-base-content/60">{t.type}</p>
                  </div>
                  <button
                    type="button"
                    disabled={already || selected.length >= max}
                    onClick={() => addTheme(t)}
                    className="btn btn-sm btn-ghost"
                  >
                    {already ? <Check size={14} className="text-success" /> : <Plus size={14} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Anime results */}
      {tab === "anime" && !openedAnime && (
        <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
          {loading && <li className="text-sm text-base-content/50 p-2">Chargement…</li>}
          {!loading && query.trim() && animeResults.length === 0 && (
            <li className="text-sm text-base-content/50 p-2">Aucun résultat.</li>
          )}
          {animeResults.map((item) => {
            const already = isSelectedAnime(item.id);
            const episodes = num(item.metadata?.episodes);
            const status = str(item.metadata?.status);
            return (
              <li key={item.id} className="card flex items-center gap-3 p-2 hover:bg-base-200 transition-colors">
                {item.coverUrl && (
                  <div className="w-10 h-10 flex-shrink-0 relative">
                    <Image src={item.coverUrl} alt="" fill className="object-cover rounded" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {(status || episodes) && (
                    <p className="text-xs text-base-content/60">
                      {status}{episodes ? ` · ${episodes} éps` : ""}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={already || selected.length >= max}
                  onClick={() => addAnime(item)}
                  className="btn btn-sm btn-ghost"
                >
                  {already ? <Check size={14} className="text-success" /> : <Plus size={14} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Arc drill-down */}
      {tab === "arc" && openedAnimeForArcs && (
        <div>
          <button
            type="button"
            onClick={() => setOpenedAnimeForArcs(null)}
            className="flex items-center gap-1 text-sm text-base-content/70 hover:text-base-content mb-2"
          >
            <ChevronLeft size={14} /> Retour
          </button>
          <p className="text-sm font-medium mb-2">Arcs — {openedAnimeForArcs.title}</p>
          {arcsLoading && <p className="text-sm text-base-content/50">Chargement…</p>}
          {!arcsLoading && animeArcs.length === 0 && (
            <p className="text-sm text-base-content/50">
              Aucun arc listé sur AniList pour cette série. Essaie la recherche directe d&apos;un arc par son nom.
            </p>
          )}
          <ul className="flex flex-col gap-1">
            {animeArcs.map((arc) => {
              const already = isSelectedArc(arc.id);
              const episodes = num(arc.metadata?.episodes);
              return (
                <li key={arc.id} className="card flex items-center gap-3 p-2">
                  {arc.coverUrl && (
                    <div className="w-10 h-10 flex-shrink-0 relative">
                      <Image src={arc.coverUrl} alt="" fill className="object-cover rounded" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{arc.title}</p>
                    <p className="text-xs text-base-content/60 truncate">
                      {openedAnimeForArcs.title}
                      {episodes ? ` · ${episodes} éps` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={already || selected.length >= max}
                    onClick={() => addArcCollection(arc, openedAnimeForArcs.title)}
                    className="btn btn-sm btn-ghost"
                  >
                    {already ? <Check size={14} className="text-success" /> : <Plus size={14} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Arc tab — direct search + pick series */}
      {tab === "arc" && !openedAnimeForArcs && (
        <>
          {query.trim().length >= 2 && (
            <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto mb-3">
              <li className="text-xs font-semibold uppercase tracking-wide text-base-content/50 px-1 pb-1">
                Arcs correspondants
              </li>
              {arcSearchLoading && <li className="text-sm text-base-content/50 p-2">Chargement…</li>}
              {!arcSearchLoading && arcSearchResults.length === 0 && (
                <li className="text-sm text-base-content/50 p-2">Aucun arc direct — choisis une série ci-dessous.</li>
              )}
              {arcSearchResults.map((item) => {
                const already = isSelectedArc(item.id);
                const parentTitle = str(item.metadata?.parentTitle);
                return (
                  <li key={item.id} className="card flex items-center gap-3 p-2 hover:bg-base-200 transition-colors">
                    {item.coverUrl && (
                      <div className="w-10 h-10 flex-shrink-0 relative">
                        <Image src={item.coverUrl} alt="" fill className="object-cover rounded" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {parentTitle && (
                        <p className="text-xs text-base-content/60 truncate">{parentTitle}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={already || selected.length >= max}
                      onClick={() => addArcItem(item)}
                      className="btn btn-sm btn-ghost"
                    >
                      {already ? <Check size={14} className="text-success" /> : <Plus size={14} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50 px-1 pb-1">
            Par série
          </p>
          <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {loading && <li className="text-sm text-base-content/50 p-2">Chargement…</li>}
            {!loading && query.trim() && animeResults.length === 0 && (
              <li className="text-sm text-base-content/50 p-2">Aucune série trouvée.</li>
            )}
            {animeResults.map((item) => (
              <li
                key={item.id}
                className="card flex items-center gap-3 p-2 hover:bg-base-200 transition-colors cursor-pointer"
                onClick={() => openAnimeForArcs(item)}
              >
                {item.coverUrl && (
                  <div className="w-10 h-10 flex-shrink-0 relative">
                    <Image src={item.coverUrl} alt="" fill className="object-cover rounded" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                </div>
                <ChevronLeft size={14} className="rotate-180 text-base-content/40" />
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Theme mode — show anime search results to pick from */}
      {tab === "theme" && !openedAnime && (
        <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
          {loading && <li className="text-sm text-base-content/50 p-2">Chargement…</li>}
          {!loading && query.trim() && animeResults.length === 0 && (
            <li className="text-sm text-base-content/50 p-2">Aucun résultat.</li>
          )}
          {animeResults.map((item) => (
            <li
              key={item.id}
              className="card flex items-center gap-3 p-2 hover:bg-base-200 transition-colors cursor-pointer"
              onClick={() => openAnimeForThemes(item)}
            >
              {item.coverUrl && (
                <div className="w-10 h-10 flex-shrink-0 relative">
                  <Image src={item.coverUrl} alt="" fill className="object-cover rounded" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
              </div>
              <ChevronLeft size={14} className="rotate-180 text-base-content/40" />
            </li>
          ))}
        </ul>
      )}

      {/* Character results */}
      {tab === "character" && (
        <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
          {charLoading && <li className="text-sm text-base-content/50 p-2">Chargement…</li>}
          {!charLoading && query.trim() && charResults.length === 0 && (
            <li className="text-sm text-base-content/50 p-2">Aucun résultat.</li>
          )}
          {charResults.map((item) => {
            const already = isSelectedChar(item.id);
            return (
              <li key={item.id} className="card flex items-center gap-3 p-2 hover:bg-base-200 transition-colors">
                {item.coverUrl && (
                  <div className="w-10 h-10 flex-shrink-0 relative">
                    <Image src={item.coverUrl} alt="" fill className="object-cover rounded-full" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.subtitle && <p className="text-xs text-base-content/60 truncate">{item.subtitle}</p>}
                </div>
                <button
                  type="button"
                  disabled={already || selected.length >= max}
                  onClick={() => addCharacter(item)}
                  className="btn btn-sm btn-ghost"
                >
                  {already ? <Check size={14} className="text-success" /> : <Plus size={14} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Selected items */}
      {selected.length > 0 && (
        <div>
          <p className="text-xs text-base-content/60 mb-1.5">
            {selected.length}/{freeMode ? "∞" : size} sélectionnés
          </p>
          <ul className="flex flex-col gap-1">
            {selected.map((item) => (
              <li key={item.external_id} className="card flex items-center gap-3 p-2">
                {item.cover_url && (
                  <div className="w-8 h-8 flex-shrink-0 relative">
                    <Image src={item.cover_url} alt="" fill className="object-cover rounded" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.subtitle && <p className="text-xs text-base-content/60 truncate">{item.subtitle}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.external_id)}
                  className="btn btn-sm btn-ghost text-error"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
