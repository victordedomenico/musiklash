"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Plus, X, ChevronLeft, Check, Tv, User, Layers, Music2, Music, Zap, Flame, PenLine } from "lucide-react";
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

export type Tab = "anime" | "opening" | "ending" | "arc" | "character" | "transformation" | "power" | "theme";

/** Local display type for opened anime's themes (drill-down mode) */
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

// ─── Tab metadata ─────────────────────────────────────────────────────────────

const TAB_LABEL: Record<Tab, string> = {
  anime: "Titre d'animé",
  opening: "Opening",
  ending: "Ending",
  arc: "Arc d'animé",
  character: "Personnage",
  transformation: "Transformation",
  power: "Pouvoir",
  theme: "Opening/Ending",
};

const TAB_PLACEHOLDER: Record<Tab, string> = {
  anime: "Rechercher un titre d'animé…",
  opening: "Rechercher un opening par titre…",
  ending: "Rechercher un ending par titre…",
  arc: "Rechercher un arc ou une série…",
  character: "Rechercher un personnage…",
  transformation: "Rechercher une transformation…",
  power: "Rechercher un pouvoir ou une technique…",
  theme: "Rechercher un animé pour ses openings…",
};

function TabIcon({ tab }: { tab: Tab }) {
  if (tab === "anime") return <Tv size={14} />;
  if (tab === "character") return <User size={14} />;
  if (tab === "arc") return <Layers size={14} />;
  if (tab === "theme" || tab === "opening") return <Music2 size={14} />;
  if (tab === "ending") return <Music size={14} />;
  if (tab === "transformation") return <Zap size={14} />;
  if (tab === "power") return <Flame size={14} />;
  return null;
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

// ─── Generic item list ────────────────────────────────────────────────────────

function ItemList({
  items,
  loading,
  query,
  isSelected,
  onAdd,
  maxReached,
  roundedCover = false,
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
  return (
    <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
      {loading && <li className="text-sm text-base-content/50 p-2">Chargement…</li>}
      {!loading && query.trim() && items.length === 0 && (
        <li className="text-sm text-base-content/50 p-2">{noResultMessage}</li>
      )}
      {items.map((item) => {
        const already = isSelected(item.id);
        return (
          <li key={item.id} className="card flex items-center gap-3 p-2 hover:bg-base-200 transition-colors">
            {item.coverUrl && (
              <div className="w-10 h-10 flex-shrink-0 relative">
                <Image
                  src={item.coverUrl}
                  alt=""
                  fill
                  className={`object-cover ${roundedCover ? "rounded-full" : "rounded"}`}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              {item.subtitle && <p className="text-xs text-base-content/60 truncate">{item.subtitle}</p>}
            </div>
            <button
              type="button"
              disabled={already || maxReached}
              onClick={() => onAdd(item)}
              className="btn btn-sm btn-ghost"
            >
              {already ? <Check size={14} className="text-success" /> : <Plus size={14} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnimePicker({
  size,
  selected,
  onChange,
  freeMode = false,
  tabs = ["anime", "character"],
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

  // Tabs that use direct anime search
  const needsAnimeSearch =
    tab === "anime" ||
    tab === "theme" ||
    (tab === "arc" && !openedAnimeForArcs);

  const { results: animeResults, loading: animeLoading } = useDebouncedSearch(
    "/api/content/search?kind=anime",
    query,
    needsAnimeSearch,
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
  const { results: openingResults, loading: openingLoading } = useDebouncedSearch(
    "/api/content/search?kind=opening",
    query,
    tab === "opening",
  );
  const { results: endingResults, loading: endingLoading } = useDebouncedSearch(
    "/api/content/search?kind=ending",
    query,
    tab === "ending",
  );
  const { results: transformationResults, loading: transformationLoading } = useDebouncedSearch(
    "/api/content/search?kind=transformation",
    query,
    tab === "transformation",
  );
  const { results: powerResults, loading: powerLoading } = useDebouncedSearch(
    "/api/content/search?kind=power",
    query,
    tab === "power",
  );

  const max = freeMode ? Infinity : size;
  const isSelected = (id: string) => selected.some((s) => s.external_id === id);
  // Arc items stored as arc-${numericId}; ContentItem.id is the bare numeric string
  const isSelectedArc = (id: string) => selected.some((s) => s.external_id === `arc-${id}`);
  const maxReached = selected.length >= max;

  // ─── Add handlers ───────────────────────────────────────────────────────────

  const addAnime = (item: ContentItem) => {
    if (maxReached) return;
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
    if (maxReached) return;
    onChange([...selected, {
      external_id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      cover_url: item.coverUrl ?? null,
      preview_url: null,
      source: item.source ?? "anilist",
      metadata: {
        itemKind: "character",
        anilistCharacterId: item.id.startsWith("char-")
          ? num(item.metadata?.anilistCharacterId)
          : undefined,
        malId: item.id.startsWith("jchar-") ? num(item.metadata?.malId) : undefined,
      },
    }]);
  };

  const addThemeItem = (item: ContentItem) => {
    if (maxReached) return;
    const themeType = str(item.metadata?.themeType) ?? "";
    const animeTitle = str(item.metadata?.animeTitle) ?? "";
    onChange([...selected, {
      external_id: item.id,
      title: item.title,
      subtitle: item.subtitle ?? `${themeType} — ${animeTitle}`,
      cover_url: item.coverUrl ?? null,
      preview_url: item.previewUrl ?? null,
      source: "animethemes",
      metadata: { itemKind: "theme", themeType, animeTitle },
    }]);
  };

  const addTransformation = (item: ContentItem) => {
    if (maxReached) return;
    onChange([...selected, {
      external_id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      cover_url: item.coverUrl ?? null,
      preview_url: null,
      source: "jikan",
      metadata: {
        itemKind: "transformation",
        malId: num(item.metadata?.malId),
        animeTitle: str(item.metadata?.animeTitle),
      },
    }]);
  };

  const addPower = (item: ContentItem) => {
    if (maxReached) return;
    onChange([...selected, {
      external_id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      cover_url: item.coverUrl ?? null,
      preview_url: null,
      source: "jikan",
      metadata: {
        itemKind: "power",
        malId: num(item.metadata?.malId),
        animeTitle: str(item.metadata?.animeTitle),
      },
    }]);
  };

  /** Add a manually typed arc (no external API entry exists). */
  const addCustomArc = (name: string) => {
    if (!name.trim() || maxReached) return;
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const id = `arc-free-${slug}`;
    if (selected.some((s) => s.external_id === id)) return;
    onChange([...selected, {
      external_id: id,
      title: name.trim(),
      subtitle: undefined,
      cover_url: null,
      preview_url: null,
      source: "manual",
      metadata: { itemKind: "arc", custom: true },
    }]);
  };

  /** Add an arc from direct search results (ContentItem with id = bare numeric string). */
  const addArcItem = (item: ContentItem) => {
    if (maxReached) return;
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
    if (maxReached) return;
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
    if (maxReached) return;
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

  const resetTab = (t: Tab) => {
    setTab(t);
    setQuery("");
    setOpenedAnime(null);
    setOpenedAnimeForArcs(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
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
            tab === "arc" && openedAnimeForArcs
              ? "Arcs de la série…"
              : TAB_PLACEHOLDER[tab]
          }
          className="input input-bordered w-full pl-9"
        />
      </div>

      {/* ── Theme drill-down (legacy "theme" tab) ── */}
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
              const already = isSelected(t.id);
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
                    disabled={already || maxReached}
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

      {/* ── Anime tab ── */}
      {tab === "anime" && (
        <ItemList
          items={animeResults}
          loading={animeLoading}
          query={query}
          isSelected={isSelected}
          onAdd={addAnime}
          maxReached={maxReached}
        />
      )}

      {/* ── Opening tab (direct song-title search) ── */}
      {tab === "opening" && (
        <ItemList
          items={openingResults}
          loading={openingLoading}
          query={query}
          isSelected={isSelected}
          onAdd={addThemeItem}
          maxReached={maxReached}
          noResultMessage="Aucun opening trouvé."
        />
      )}

      {/* ── Ending tab (direct song-title search) ── */}
      {tab === "ending" && (
        <ItemList
          items={endingResults}
          loading={endingLoading}
          query={query}
          isSelected={isSelected}
          onAdd={addThemeItem}
          maxReached={maxReached}
          noResultMessage="Aucun ending trouvé."
        />
      )}

      {/* ── Character tab ── */}
      {tab === "character" && (
        <ItemList
          items={charResults}
          loading={charLoading}
          query={query}
          isSelected={isSelected}
          onAdd={addCharacter}
          maxReached={maxReached}
          roundedCover
          noResultMessage="Aucun personnage trouvé."
        />
      )}

      {/* ── Transformation tab ── */}
      {tab === "transformation" && (
        <ItemList
          items={transformationResults}
          loading={transformationLoading}
          query={query}
          isSelected={isSelected}
          onAdd={addTransformation}
          maxReached={maxReached}
          roundedCover
          noResultMessage="Aucune transformation trouvée. Essaie un nom de personnage ou de forme (ex: Super Saiyan, Bankai…)."
        />
      )}

      {/* ── Power tab ── */}
      {tab === "power" && (
        <ItemList
          items={powerResults}
          loading={powerLoading}
          query={query}
          isSelected={isSelected}
          onAdd={addPower}
          maxReached={maxReached}
          roundedCover
          noResultMessage="Aucun pouvoir trouvé. Essaie un nom de technique ou d'attaque (ex: Kamehameha, Rasengan…)."
        />
      )}

      {/* ── Arc drill-down ── */}
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
                    disabled={already || maxReached}
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

      {/* ── Arc tab — direct search + pick series ── */}
      {tab === "arc" && !openedAnimeForArcs && (
        <>
          {query.trim().length >= 2 && (
            <>
              <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto mb-1">
                <li className="text-xs font-semibold uppercase tracking-wide text-base-content/50 px-1 pb-1">
                  Arcs AniList
                </li>
                {arcSearchLoading && <li className="text-sm text-base-content/50 p-2">Chargement…</li>}
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
                        disabled={already || maxReached}
                        onClick={() => addArcItem(item)}
                        className="btn btn-sm btn-ghost"
                      >
                        {already ? <Check size={14} className="text-success" /> : <Plus size={14} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {/* Free-text fallback — always shown when user has typed something */}
              {(() => {
                const name = query.trim();
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                const alreadyAdded = selected.some((s) => s.external_id === `arc-free-${slug}`);
                return (
                  <button
                    type="button"
                    disabled={alreadyAdded || maxReached}
                    onClick={() => addCustomArc(name)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-dashed border-base-content/20 text-sm text-base-content/70 hover:border-primary hover:text-primary transition-colors disabled:opacity-40 mb-3"
                  >
                    <PenLine size={14} />
                    {alreadyAdded
                      ? `« ${name} » déjà ajouté`
                      : `Créer l'arc « ${name} » manuellement`}
                  </button>
                );
              })()}
            </>
          )}
          <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50 px-1 pb-1">
            Par série
          </p>
          <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {animeLoading && <li className="text-sm text-base-content/50 p-2">Chargement…</li>}
            {!animeLoading && query.trim() && animeResults.length === 0 && (
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

      {/* ── Theme tab — anime drill-down (legacy) ── */}
      {tab === "theme" && !openedAnime && (
        <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
          {animeLoading && <li className="text-sm text-base-content/50 p-2">Chargement…</li>}
          {!animeLoading && query.trim() && animeResults.length === 0 && (
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
