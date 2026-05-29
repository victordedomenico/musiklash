"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search, Plus, X, ChevronLeft, Check, Tv, Layers, ListVideo, Users } from "lucide-react";
import type { ContentCollection, ContentEntity, ContentItem } from "@klash/content-adapter";
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

type Tab = "show" | "season" | "episode" | "character";

type Props = {
  size: number;
  selected: SelectedItem[];
  onChange: (next: SelectedItem[]) => void;
  freeMode?: boolean;
};

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

function itemToSelected(item: ContentItem): SelectedItem {
  return {
    external_id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    cover_url: item.coverUrl ?? null,
    preview_url: null,
    source: "tvmaze",
    metadata: { itemKind: item.metadata?.itemKind ?? "show", ...item.metadata },
  };
}

export default function SeriesPicker({ size, selected, onChange, freeMode = false }: Props) {
  const [tab, setTab] = useState<Tab>("show");
  const [query, setQuery] = useState("");
  const [openedSeason, setOpenedSeason] = useState<ContentCollection | null>(null);
  const [openedShow, setOpenedShow] = useState<ContentEntity | null>(null);
  const [openedShowForChars, setOpenedShowForChars] = useState<ContentItem | null>(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState<ContentItem[]>([]);
  const [showEpisodes, setShowEpisodes] = useState<ContentItem[]>([]);
  const [showCharacters, setShowCharacters] = useState<ContentItem[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: showResults, loading: showLoading } = useDebouncedSearch(
    "/api/content/search?kind=items",
    query,
    tab === "show",
  );

  const { results: seasonResults, loading: seasonLoading } = useDebouncedSearch(
    "/api/content/search?kind=collections",
    query,
    tab === "season" && !openedSeason,
  );

  const { results: episodeResults, loading: episodeLoading } = useDebouncedSearch(
    "/api/content/search?kind=items&subtype=episode",
    query,
    tab === "episode" && !openedShow,
  );

  const { results: showEntityResults, loading: showEntityLoading } = useDebouncedSearch(
    "/api/content/search?kind=entities",
    query,
    tab === "episode" && !openedShow,
  );

  const { results: charShowResults, loading: charShowLoading } = useDebouncedSearch(
    "/api/content/search?kind=items",
    query,
    tab === "character" && !openedShowForChars,
  );

  const max = freeMode ? Infinity : size;
  const isSelected = (id: string) => selected.some((s) => s.external_id === id);

  const addItem = (item: ContentItem) => {
    if (selected.length >= max || isSelected(item.id)) return;
    onChange([...selected, itemToSelected(item)]);
  };

  const removeItem = (id: string) => {
    onChange(selected.filter((s) => s.external_id !== id));
  };

  const openShowForChars = async (show: ContentItem) => {
    setOpenedShowForChars(show);
    setDrillLoading(true);
    setShowCharacters([]);
    try {
      const res = await fetch(withSearchQuery("/api/content/search?kind=show-cast", show.id));
      const json = await res.json();
      setShowCharacters(json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const openSeason = async (col: ContentCollection) => {
    setOpenedSeason(col);
    setOpenedShow(null);
    setDrillLoading(true);
    setSeasonEpisodes([]);
    try {
      const res = await fetch(`/api/content/collection/${col.id}/items`);
      const json = await res.json();
      setSeasonEpisodes(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const openShow = async (show: ContentEntity) => {
    setOpenedShow(show);
    setOpenedSeason(null);
    setDrillLoading(true);
    setShowEpisodes([]);
    try {
      const res = await fetch(`/api/content/entity/${show.id}/items?limit=50`);
      const json = await res.json();
      setShowEpisodes(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Tv }[] = [
    { key: "show", label: "Séries", icon: Tv },
    { key: "season", label: "Saisons", icon: Layers },
    { key: "episode", label: "Épisodes", icon: ListVideo },
    { key: "character", label: "Personnages", icon: Users },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className="btn-chip"
            data-active={tab === key}
            onClick={() => {
              setTab(key);
              setOpenedSeason(null);
              setOpenedShow(null);
              setOpenedShowForChars(null);
              setShowCharacters([]);
              setQuery("");
            }}
          >
            <Icon size={14} className="inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {(openedSeason || openedShow || openedShowForChars) && (
        <button
          type="button"
          className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => {
            setOpenedSeason(null);
            setOpenedShow(null);
            setOpenedShowForChars(null);
            setShowCharacters([]);
          }}
        >
          <ChevronLeft size={16} />
          Retour à la recherche
        </button>
      )}

      {!openedSeason && !openedShow && !openedShowForChars && (
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === "show"
                ? "Rechercher une série…"
                : tab === "season"
                  ? "Rechercher une saison…"
                  : tab === "character"
                    ? "Rechercher une série pour ses personnages…"
                    : "Rechercher un épisode ou une série…"
            }
            className="input w-full pl-10"
          />
        </div>
      )}

      <div className="min-h-[200px] space-y-2">
        {tab === "show" &&
          showResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "season" && !openedSeason &&
          (seasonResults as unknown as ContentCollection[]).map((col) => (
            <button
              key={col.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => openSeason(col)}
            >
              {col.coverUrl ? (
                <Image src={col.coverUrl} alt="" width={48} height={72} className="rounded-md object-cover" />
              ) : (
                <div className="w-12 h-[72px] rounded-md bg-[color:var(--surface-2)]" />
              )}
              <div>
                <p className="font-semibold">{col.title}</p>
                <p className="text-xs text-[color:var(--muted)]">Voir les épisodes de la saison</p>
              </div>
            </button>
          ))}

        {tab === "season" && openedSeason && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedSeason.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {seasonEpisodes.map((item) => (
              <ResultRow
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                coverUrl={item.coverUrl}
                selected={isSelected(item.id)}
                onAdd={() => addItem(item)}
              />
            ))}
          </>
        )}

        {tab === "episode" && !openedShow && (
          <>
            {episodeResults.map((item) => (
              <ResultRow
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                coverUrl={item.coverUrl}
                selected={isSelected(item.id)}
                onAdd={() => addItem(item)}
              />
            ))}
            {(showEntityResults as unknown as ContentEntity[]).map((show) => (
              <button
                key={show.id}
                type="button"
                className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
                onClick={() => openShow(show)}
              >
                {show.pictureUrl ? (
                  <Image
                    src={show.pictureUrl}
                    alt=""
                    width={48}
                    height={72}
                    className="rounded-md object-cover"
                  />
                ) : (
                  <div className="w-12 h-[72px] rounded-md bg-[color:var(--surface-2)]" />
                )}
                <div>
                  <p className="font-semibold">{show.name}</p>
                  <p className="text-xs text-[color:var(--muted)]">Parcourir les épisodes</p>
                </div>
              </button>
            ))}
          </>
        )}

        {tab === "episode" && openedShow && (
          <>
            <p className="text-sm font-medium">{openedShow.name}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {showEpisodes.map((item) => (
              <ResultRow
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                coverUrl={item.coverUrl}
                selected={isSelected(item.id)}
                onAdd={() => addItem(item)}
              />
            ))}
          </>
        )}

        {tab === "character" && !openedShowForChars &&
          charShowResults.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openShowForChars(item)}
            >
              {item.coverUrl ? (
                <Image src={item.coverUrl} alt="" width={48} height={72} className="rounded-md object-cover shrink-0" />
              ) : (
                <div className="w-12 h-[72px] rounded-md bg-[color:var(--surface-2)] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{item.title}</p>
                <p className="text-xs text-[color:var(--muted)]">Voir les personnages</p>
              </div>
              <ChevronLeft size={16} className="rotate-180 text-[color:var(--muted)] shrink-0" />
            </button>
          ))}

        {tab === "character" && !openedShowForChars && charShowLoading && (
          <p className="text-sm text-[color:var(--muted)]">Recherche…</p>
        )}

        {tab === "character" && openedShowForChars && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedShowForChars.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {!drillLoading && showCharacters.length === 0 && (
              <p className="text-sm text-[color:var(--muted)]">Aucun personnage trouvé.</p>
            )}
            {showCharacters.map((item) => (
              <ResultRow
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                coverUrl={item.coverUrl}
                selected={isSelected(item.id)}
                onAdd={() => addItem(item)}
              />
            ))}
          </>
        )}

        {(showLoading || seasonLoading || episodeLoading || showEntityLoading) && (
          <p className="text-sm text-[color:var(--muted)]">Recherche…</p>
        )}
      </div>

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
                  onClick={() => removeItem(item.external_id)}
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

function ResultRow({
  title,
  subtitle,
  coverUrl,
  selected,
  onAdd,
}: {
  title: string;
  subtitle?: string;
  coverUrl?: string | null;
  selected: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3">
      {coverUrl ? (
        <Image src={coverUrl} alt="" width={40} height={60} className="rounded object-cover shrink-0" />
      ) : (
        <div className="w-10 h-[60px] rounded bg-[color:var(--surface-2)] shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{title}</p>
        {subtitle && <p className="text-xs text-[color:var(--muted)]">{subtitle}</p>}
      </div>
      <button
        type="button"
        disabled={selected}
        onClick={onAdd}
        className="btn-ghost shrink-0 p-2"
        aria-label={selected ? "Déjà sélectionné" : `Ajouter ${title}`}
      >
        {selected ? <Check size={18} className="text-[color:var(--accent)]" /> : <Plus size={18} />}
      </button>
    </div>
  );
}
