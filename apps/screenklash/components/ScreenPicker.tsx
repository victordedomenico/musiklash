"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  Check,
  Film,
  Tv,
  Layers,
  User,
  Users,
  Music2,
  Music,
} from "lucide-react";
import Image from "next/image";
import type { ContentCollection, ContentItem } from "@klash/content-adapter";
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

export type Tab =
  | "movie"
  | "series"
  | "movie-character"
  | "series-character"
  | "saga"
  | "series-arc"
  | "opening"
  | "ending";

type Props = {
  size: number;
  selected: SelectedItem[];
  onChange: (next: SelectedItem[]) => void;
  freeMode?: boolean;
  tabs?: Tab[];
};

const TAB_LABEL: Record<Tab, string> = {
  movie: "Titre de film",
  series: "Titre de série",
  "movie-character": "Personnage de film",
  "series-character": "Personnage de série",
  saga: "Saga (films)",
  "series-arc": "Arc séries",
  opening: "Générique début",
  ending: "Générique fin",
};

const TAB_PLACEHOLDER: Record<Tab, string> = {
  movie: "Rechercher un film…",
  series: "Rechercher une série…",
  "movie-character": "Rechercher un film pour ses personnages…",
  "series-character": "Rechercher une série pour ses personnages…",
  saga: "Rechercher une saga (Star Wars, Marvel…)…",
  "series-arc": "Rechercher une série pour ses arcs…",
  opening: "Rechercher un générique de début (série ou film)…",
  ending: "Rechercher un générique de fin (série ou film)…",
};

const SEARCH_KIND: Record<Tab, string> = {
  movie: "movie",
  series: "series",
  "movie-character": "movie-cast",
  "series-character": "series-cast",
  saga: "collections",
  "series-arc": "series",
  opening: "opening",
  ending: "ending",
};

function TabIcon({ tab }: { tab: Tab }) {
  if (tab === "movie") return <Film size={14} />;
  if (tab === "series" || tab === "series-arc") return <Tv size={14} />;
  if (tab === "saga") return <Layers size={14} />;
  if (tab === "movie-character") return <User size={14} />;
  if (tab === "series-character") return <Users size={14} />;
  if (tab === "opening") return <Music2 size={14} />;
  if (tab === "ending") return <Music size={14} />;
  return null;
}

function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function str(v: unknown): string | undefined {
  return v != null && v !== "" ? String(v) : undefined;
}

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
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [trimmed, endpoint, active]);

  return { results: active ? results : [], loading: active ? loading : false };
}

function ItemList({
  items,
  loading,
  query,
  isSelected,
  onAdd,
  maxReached,
  roundedCover,
  noResultMessage = "Aucun résultat.",
}: {
  items: ContentItem[];
  loading: boolean;
  query: string;
  isSelected: (id: string) => boolean;
  onAdd: (item: ContentItem) => void;
  maxReached: boolean;
  roundedCover?: boolean;
  noResultMessage?: string;
}) {
  if (loading) return <p className="text-sm text-[color:var(--muted)]">Recherche…</p>;
  if (query.trim() && items.length === 0) {
    return <p className="text-sm text-[color:var(--muted)]">{noResultMessage}</p>;
  }
  return (
    <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
      {items.map((item) => {
        const already = isSelected(item.id);
        return (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3"
          >
            {item.coverUrl ? (
              <Image
                src={item.coverUrl}
                alt=""
                width={40}
                height={roundedCover ? 40 : 56}
                className={`shrink-0 object-cover ${roundedCover ? "rounded-full" : "rounded"}`}
              />
            ) : (
              <div
                className={`shrink-0 bg-[color:var(--surface-2)] ${roundedCover ? "w-10 h-10 rounded-full" : "w-10 h-14 rounded"}`}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{item.title}</p>
              {item.subtitle && (
                <p className="text-xs text-[color:var(--muted)] truncate">{item.subtitle}</p>
              )}
            </div>
            <button
              type="button"
              disabled={already || maxReached}
              onClick={() => onAdd(item)}
              className="btn-ghost shrink-0 p-2"
              aria-label={already ? "Déjà sélectionné" : `Ajouter ${item.title}`}
            >
              {already ? (
                <Check size={18} className="text-[color:var(--accent)]" />
              ) : (
                <Plus size={18} />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const DEFAULT_TABS: Tab[] = [
  "movie",
  "series",
  "movie-character",
  "series-character",
  "saga",
  "series-arc",
  "opening",
  "ending",
];

export default function ScreenPicker({
  size,
  selected,
  onChange,
  freeMode = false,
  tabs = DEFAULT_TABS,
}: Props) {
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [query, setQuery] = useState("");
  const [drillParent, setDrillParent] = useState<ContentItem | null>(null);
  const [drillItems, setDrillItems] = useState<ContentItem[]>([]);
  const [openedSeriesForArcs, setOpenedSeriesForArcs] = useState<ContentItem | null>(null);
  const [seriesArcs, setSeriesArcs] = useState<ContentCollection[]>([]);
  const [openedSeriesForThemes, setOpenedSeriesForThemes] = useState<ContentItem | null>(null);
  const [seriesThemes, setSeriesThemes] = useState<ContentItem[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [arcsLoading, setArcsLoading] = useState(false);
  const [themesLoading, setThemesLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isThemeTab = tab === "opening" || tab === "ending";
  const isDrillTab = tab === "saga" || tab === "movie-character" || tab === "series-character";
  const needsSeriesSearch =
    tab === "series" ||
    (tab === "series-arc" && !openedSeriesForArcs) ||
    (isThemeTab && !openedSeriesForThemes);

  const { results: movieResults, loading: movieLoading } = useDebouncedSearch(
    `/api/content/search?kind=${SEARCH_KIND.movie}`,
    query,
    tab === "movie",
  );
  const { results: seriesResults, loading: seriesLoading } = useDebouncedSearch(
    `/api/content/search?kind=${SEARCH_KIND.series}`,
    query,
    needsSeriesSearch,
  );
  const { results: sagaResults, loading: sagaLoading } = useDebouncedSearch(
    `/api/content/search?kind=${SEARCH_KIND.saga}`,
    query,
    tab === "saga" && !drillParent,
  );
  const { results: movieCastResults, loading: movieCastLoading } = useDebouncedSearch(
    `/api/content/search?kind=${SEARCH_KIND["movie-character"]}`,
    query,
    tab === "movie-character" && !drillParent,
  );
  const { results: seriesCastResults, loading: seriesCastLoading } = useDebouncedSearch(
    `/api/content/search?kind=${SEARCH_KIND["series-character"]}`,
    query,
    tab === "series-character" && !drillParent,
  );
  const { results: arcDirectResults, loading: arcDirectLoading } = useDebouncedSearch(
    `/api/content/search?kind=series-arc`,
    query,
    tab === "series-arc" && !openedSeriesForArcs,
  );
  const { results: openingResults, loading: openingLoading } = useDebouncedSearch(
    `/api/content/search?kind=opening`,
    query,
    tab === "opening" && !openedSeriesForThemes,
  );
  const { results: endingResults, loading: endingLoading } = useDebouncedSearch(
    `/api/content/search?kind=ending`,
    query,
    tab === "ending" && !openedSeriesForThemes,
  );

  const max = freeMode ? Infinity : size;
  const isSelected = (id: string) => selected.some((s) => s.external_id === id);
  const isSelectedArc = (id: string) => selected.some((s) => s.external_id === `arc-${id}`);
  const maxReached = selected.length >= max;

  const addMovie = (item: ContentItem) => {
    if (maxReached || isSelected(item.id)) return;
    onChange([
      ...selected,
      {
        external_id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        cover_url: item.coverUrl ?? null,
        source: "tmdb",
        metadata: { itemKind: "movie", tmdbMovieId: num(item.id) },
      },
    ]);
  };

  const addSeries = (item: ContentItem) => {
    if (maxReached || isSelected(item.id)) return;
    onChange([
      ...selected,
      {
        external_id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        cover_url: item.coverUrl ?? null,
        source: "tvmaze",
        metadata: {
          itemKind: "series",
          tvmazeShowId: num(item.id.replace(/^show-/, "")),
        },
      },
    ]);
  };

  const addCharacter = (item: ContentItem) => {
    if (maxReached || isSelected(item.id)) return;
    onChange([
      ...selected,
      {
        external_id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        cover_url: item.coverUrl ?? null,
        source: item.source ?? "tmdb",
        metadata: {
          itemKind: str(item.metadata?.itemKind) ?? "character",
          ...item.metadata,
        },
      },
    ]);
  };

  const addTheme = (item: ContentItem) => {
    if (maxReached || isSelected(item.id)) return;
    const themeType = str(item.metadata?.themeType) ?? "";
    const showName =
      str(item.metadata?.mediaTitle) ??
      str(item.metadata?.showName) ??
      "";
    onChange([
      ...selected,
      {
        external_id: item.id,
        title: item.title,
        subtitle: item.subtitle ?? `${themeType} — ${showName}`,
        cover_url: item.coverUrl ?? null,
        preview_url: item.previewUrl ?? null,
        source: item.source ?? "tmdb",
        metadata: { itemKind: "theme", themeType, showName, ...item.metadata },
      },
    ]);
  };

  const addArcCollection = (arc: ContentCollection, parentTitle: string) => {
    if (maxReached) return;
    onChange([
      ...selected,
      {
        external_id: `arc-${arc.id}`,
        title: arc.title,
        subtitle: parentTitle,
        cover_url: arc.coverUrl ?? null,
        source: "tmdb",
        metadata: {
          itemKind: "series-arc",
          arcId: arc.id,
          parentTitle,
          episodes: num(arc.metadata?.episodes),
          episodeRange: str(arc.metadata?.episodeRange),
          saga: str(arc.metadata?.saga),
        },
      },
    ]);
  };

  const addArcItem = (item: ContentItem) => {
    if (maxReached || isSelected(item.id)) return;
    onChange([
      ...selected,
      {
        external_id: item.id.startsWith("arc-") ? item.id : `arc-${item.id}`,
        title: item.title,
        subtitle: item.subtitle,
        cover_url: item.coverUrl ?? null,
        source: item.source ?? "tmdb",
        metadata: { itemKind: "series-arc", ...item.metadata },
      },
    ]);
  };

  const remove = (id: string) => onChange(selected.filter((s) => s.external_id !== id));

  const openDrill = async (item: ContentItem) => {
    setDrillParent(item);
    setDrillLoading(true);
    setDrillItems([]);
    try {
      const res = await fetch(`/api/content/collection/${encodeURIComponent(item.id)}/items`);
      const json = await res.json();
      setDrillItems(json.items ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const openSeriesForThemes = async (series: ContentItem) => {
    setOpenedSeriesForThemes(series);
    setThemesLoading(true);
    setSeriesThemes([]);
    try {
      const want = tab === "opening" ? "intro" : "outro";
      const res = await fetch(
        `/api/content/collection/${encodeURIComponent(series.id)}/items?themeKind=${want}`,
      );
      const json = await res.json();
      const items = (json.items ?? []) as ContentItem[];
      setSeriesThemes(
        items.filter((i) => str(i.metadata?.themeType) === want),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setThemesLoading(false);
    }
  };

  const openSeriesForArcs = async (series: ContentItem) => {
    setOpenedSeriesForArcs(series);
    setArcsLoading(true);
    setSeriesArcs([]);
    try {
      const showId = series.id.replace(/^show-/, "");
      const res = await fetch(`/api/content/entity/${encodeURIComponent(showId)}/collections`);
      const json = (await res.json()) as { collections?: ContentCollection[] };
      setSeriesArcs(json.collections ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setArcsLoading(false);
    }
  };

  const resetTab = (t: Tab) => {
    setTab(t);
    setQuery("");
    setDrillParent(null);
    setDrillItems([]);
    setOpenedSeriesForArcs(null);
    setSeriesArcs([]);
    setOpenedSeriesForThemes(null);
    setSeriesThemes([]);
  };

  const drillLoadingAny = drillLoading || arcsLoading || themesLoading;

  return (
    <div className="flex flex-col gap-4">
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => resetTab(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tab === t ? "bg-primary text-primary-content" : "bg-base-200 hover:bg-base-300"
              }`}
            >
              <TabIcon tab={t} />
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
      )}

      {(drillParent || openedSeriesForArcs || openedSeriesForThemes) && (
        <button
          type="button"
          onClick={() => {
            setDrillParent(null);
            setDrillItems([]);
            setOpenedSeriesForArcs(null);
            setSeriesArcs([]);
            setOpenedSeriesForThemes(null);
            setSeriesThemes([]);
          }}
          className="flex items-center gap-1 text-sm text-base-content/70 hover:text-base-content"
        >
          <ChevronLeft size={14} /> Retour
        </button>
      )}

      {!drillParent && !openedSeriesForArcs && !openedSeriesForThemes && (
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={TAB_PLACEHOLDER[tab]}
            className="input input-bordered w-full pl-9"
          />
        </div>
      )}

      {tab === "movie" && (
        <ItemList
          items={movieResults}
          loading={movieLoading}
          query={query}
          isSelected={isSelected}
          onAdd={addMovie}
          maxReached={maxReached}
          noResultMessage="Aucun film trouvé."
        />
      )}

      {tab === "series" && (
        <ItemList
          items={seriesResults}
          loading={seriesLoading}
          query={query}
          isSelected={isSelected}
          onAdd={addSeries}
          maxReached={maxReached}
          noResultMessage="Aucune série trouvée."
        />
      )}

      {isThemeTab && openedSeriesForThemes && (
        <div>
          <p className="text-sm font-medium mb-2">
            {tab === "opening" ? "Génériques début" : "Génériques fin"} — {openedSeriesForThemes.title}
          </p>
          {themesLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
          {!themesLoading && seriesThemes.length === 0 && (
            <p className="text-sm text-[color:var(--muted)]">
              Aucun générique trouvé pour cette série (TMDB + Deezer).
            </p>
          )}
          <ItemList
            items={seriesThemes}
            loading={false}
            query=" "
            isSelected={isSelected}
            onAdd={addTheme}
            maxReached={maxReached}
          />
        </div>
      )}

      {tab === "opening" && !openedSeriesForThemes && (
        <>
          {openingResults.length > 0 && (
            <ItemList
              items={openingResults}
              loading={openingLoading}
              query={query}
              isSelected={isSelected}
              onAdd={addTheme}
              maxReached={maxReached}
            />
          )}
          {openingLoading && openingResults.length === 0 && (
            <p className="text-sm text-[color:var(--muted)]">Recherche…</p>
          )}
          {!openingLoading && query.trim() && (
            <p className="text-xs text-[color:var(--muted)] mb-2">
              Ou choisis une série pour parcourir ses génériques TMDB :
            </p>
          )}
          <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
            {seriesLoading && (
              <li className="text-sm text-[color:var(--muted)] p-2">Chargement…</li>
            )}
            {!seriesLoading && query.trim() && seriesResults.length === 0 && openingResults.length === 0 && (
              <li className="text-sm text-[color:var(--muted)] p-2">
                Aucun générique de début trouvé. Essaie le nom exact de la série.
              </li>
            )}
            {seriesResults.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void openSeriesForThemes(item)}
                  className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
                >
                  {item.coverUrl ? (
                    <Image
                      src={item.coverUrl}
                      alt=""
                      width={40}
                      height={56}
                      className="rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-14 rounded bg-[color:var(--surface-2)] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-xs text-[color:var(--muted)]">Voir les génériques de début</p>
                  </div>
                  <ChevronLeft size={16} className="rotate-180 text-[color:var(--muted)] shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === "ending" && !openedSeriesForThemes && (
        <>
          {endingResults.length > 0 && (
            <ItemList
              items={endingResults}
              loading={endingLoading}
              query={query}
              isSelected={isSelected}
              onAdd={addTheme}
              maxReached={maxReached}
            />
          )}
          {endingLoading && endingResults.length === 0 && (
            <p className="text-sm text-[color:var(--muted)]">Recherche…</p>
          )}
          {!endingLoading && query.trim() && (
            <p className="text-xs text-[color:var(--muted)] mb-2">
              Ou choisis une série pour parcourir ses génériques TMDB :
            </p>
          )}
          <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
            {seriesLoading && (
              <li className="text-sm text-[color:var(--muted)] p-2">Chargement…</li>
            )}
            {!seriesLoading && query.trim() && seriesResults.length === 0 && endingResults.length === 0 && (
              <li className="text-sm text-[color:var(--muted)] p-2">
                Aucun générique de fin trouvé. Essaie le nom exact de la série.
              </li>
            )}
            {seriesResults.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void openSeriesForThemes(item)}
                  className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
                >
                  {item.coverUrl ? (
                    <Image
                      src={item.coverUrl}
                      alt=""
                      width={40}
                      height={56}
                      className="rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-14 rounded bg-[color:var(--surface-2)] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-xs text-[color:var(--muted)]">Voir les génériques de fin</p>
                  </div>
                  <ChevronLeft size={16} className="rotate-180 text-[color:var(--muted)] shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === "movie-character" && !drillParent && (
        <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
          {movieCastLoading && (
            <li className="text-sm text-[color:var(--muted)] p-2">Recherche…</li>
          )}
          {!movieCastLoading && query.trim() && movieCastResults.length === 0 && (
            <li className="text-sm text-[color:var(--muted)] p-2">Aucun film trouvé.</li>
          )}
          {movieCastResults.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void openDrill(item)}
                className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              >
                {item.coverUrl ? (
                  <Image
                    src={item.coverUrl}
                    alt=""
                    width={40}
                    height={56}
                    className="rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 rounded bg-[color:var(--surface-2)] shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-xs text-[color:var(--muted)]">{item.subtitle}</p>
                </div>
                <ChevronLeft size={16} className="rotate-180 text-[color:var(--muted)] shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === "series-character" && !drillParent && (
        <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
          {seriesCastLoading && (
            <li className="text-sm text-[color:var(--muted)] p-2">Recherche…</li>
          )}
          {!seriesCastLoading && query.trim() && seriesCastResults.length === 0 && (
            <li className="text-sm text-[color:var(--muted)] p-2">Aucune série trouvée.</li>
          )}
          {seriesCastResults.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void openDrill(item)}
                className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              >
                {item.coverUrl ? (
                  <Image
                    src={item.coverUrl}
                    alt=""
                    width={40}
                    height={56}
                    className="rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 rounded bg-[color:var(--surface-2)] shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-xs text-[color:var(--muted)]">{item.subtitle}</p>
                </div>
                <ChevronLeft size={16} className="rotate-180 text-[color:var(--muted)] shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {tab === "saga" && !drillParent && (
        <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
          {sagaLoading && <li className="text-sm text-[color:var(--muted)] p-2">Recherche…</li>}
          {!sagaLoading && query.trim() && sagaResults.length === 0 && (
            <li className="text-sm text-[color:var(--muted)] p-2">Aucune saga trouvée.</li>
          )}
          {sagaResults.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void openDrill(item)}
                className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              >
                {item.coverUrl ? (
                  <Image
                    src={item.coverUrl}
                    alt=""
                    width={40}
                    height={56}
                    className="rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 rounded bg-[color:var(--surface-2)] shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-xs text-[color:var(--muted)]">Films de la saga</p>
                </div>
                <ChevronLeft size={16} className="rotate-180 text-[color:var(--muted)] shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {isDrillTab && drillParent && (
        <div>
          <p className="text-sm font-medium mb-2">{drillParent.title}</p>
          {drillLoadingAny && (
            <p className="text-sm text-[color:var(--muted)]">Chargement…</p>
          )}
          {!drillLoadingAny && drillItems.length === 0 && (
            <p className="text-sm text-[color:var(--muted)]">Rien trouvé.</p>
          )}
          <ItemList
            items={drillItems}
            loading={false}
            query=" "
            isSelected={isSelected}
            onAdd={tab === "saga" ? addMovie : addCharacter}
            maxReached={maxReached}
            roundedCover={tab !== "saga"}
          />
        </div>
      )}

      {tab === "series-arc" && openedSeriesForArcs && (
        <div>
          <p className="text-sm font-medium mb-2">Arcs — {openedSeriesForArcs.title}</p>
          {arcsLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
          {!arcsLoading && seriesArcs.length === 0 && (
            <p className="text-sm text-[color:var(--muted)]">
              Aucun arc répertorié pour cette série.
            </p>
          )}
          <ul className="flex flex-col gap-1">
            {seriesArcs.map((arc) => {
              const already = isSelectedArc(arc.id);
              const range = str(arc.metadata?.episodeRange);
              const saga = str(arc.metadata?.saga);
              return (
                <li
                  key={arc.id}
                  className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3"
                >
                  {arc.coverUrl && (
                    <Image
                      src={arc.coverUrl}
                      alt=""
                      width={40}
                      height={56}
                      className="rounded object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{arc.title}</p>
                    <p className="text-xs text-[color:var(--muted)] truncate">
                      {saga ? `${saga} · ` : ""}
                      {openedSeriesForArcs.title}
                      {range ? ` · ép. ${range}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={already || maxReached}
                    onClick={() => addArcCollection(arc, openedSeriesForArcs.title)}
                    className="btn-ghost shrink-0 p-2"
                  >
                    {already ? (
                      <Check size={18} className="text-[color:var(--accent)]" />
                    ) : (
                      <Plus size={18} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tab === "series-arc" && !openedSeriesForArcs && (
        <>
          {query.trim() && arcDirectResults.length > 0 && (
            <ItemList
              items={arcDirectResults}
              loading={arcDirectLoading}
              query={query}
              isSelected={(id) => isSelected(id) || isSelectedArc(id.replace(/^arc-/, ""))}
              onAdd={addArcItem}
              maxReached={maxReached}
              noResultMessage=""
            />
          )}
          <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
            {seriesLoading && (
              <li className="text-sm text-[color:var(--muted)] p-2">Recherche…</li>
            )}
            {!seriesLoading && query.trim() && seriesResults.length === 0 && arcDirectResults.length === 0 && (
              <li className="text-sm text-[color:var(--muted)] p-2">Aucune série trouvée.</li>
            )}
            {seriesResults.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void openSeriesForArcs(item)}
                  className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
                >
                  {item.coverUrl ? (
                    <Image
                      src={item.coverUrl}
                      alt=""
                      width={40}
                      height={56}
                      className="rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-14 rounded bg-[color:var(--surface-2)] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-xs text-[color:var(--muted)]">Voir les arcs / saisons</p>
                  </div>
                  <ChevronLeft size={16} className="rotate-180 text-[color:var(--muted)] shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {selected.length > 0 && (
        <div className="space-y-2 border-t border-[color:var(--border)] pt-4">
          <p className="text-sm font-medium">
            Sélection ({selected.length}
            {!freeMode ? ` / ${size}` : ""})
          </p>
          <ul className="flex flex-wrap gap-2">
            {selected.map((item) => (
              <li
                key={item.external_id}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-sm"
              >
                <span className="max-w-[180px] truncate">{item.title}</span>
                <button
                  type="button"
                  aria-label={`Retirer ${item.title}`}
                  onClick={() => remove(item.external_id)}
                  className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
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
