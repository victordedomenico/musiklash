"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Plus, X, ChevronLeft, Check, Tv, User, Layers } from "lucide-react";
import Image from "next/image";
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

type AnimeResult = {
  id: number;
  title: string;
  coverUrl: string | null;
  bannerUrl: string | null;
  format?: string;
  episodes?: number;
  popularity?: number;
};

type CharacterResult = {
  id: number;
  name: string;
  imageUrl: string | null;
  animes: string[];
};

type ThemeResult = {
  id: string;
  title: string;
  type: string;
  videoUrl: string | null;
  coverUrl: string | null;
  animeTitle: string;
};

type ArcResult = {
  id: number;
  title: string;
  coverUrl: string | null;
  parentTitle?: string | null;
  format?: string | null;
  episodes?: number | null;
};

function useDebouncedSearch<T>(
  endpoint: string,
  query: string,
  enabled: boolean,
): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !enabled) { setData([]); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(withSearchQuery(endpoint, trimmed), { signal: ctrl.signal });
        const json = await res.json();
        setData(json.data ?? []);
      } catch (e) {
        if ((e as { name?: string }).name !== "AbortError") console.error(e);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [query, endpoint, enabled]);

  return { data, loading };
}

export default function AnimePicker({ size, selected, onChange, freeMode = false, tabs = ["anime", "character"] }: Props) {
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [query, setQuery] = useState("");
  const [openedAnime, setOpenedAnime] = useState<AnimeResult | null>(null);
  const [openedAnimeForArcs, setOpenedAnimeForArcs] = useState<AnimeResult | null>(null);
  const [animeThemes, setAnimeThemes] = useState<ThemeResult[]>([]);
  const [animeArcs, setAnimeArcs] = useState<ArcResult[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [arcsLoading, setArcsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: animeResults, loading: animeLoading } = useDebouncedSearch<AnimeResult>(
    "/api/anilist/search?type=anime",
    query,
    tab === "anime" || (tab === "arc" && !openedAnimeForArcs),
  );
  const { data: charResults, loading: charLoading } = useDebouncedSearch<CharacterResult>(
    "/api/anilist/search?type=character",
    query,
    tab === "character",
  );
  const { data: arcSearchResults, loading: arcSearchLoading } = useDebouncedSearch<ArcResult>(
    "/api/anilist/search?type=arc",
    query,
    tab === "arc" && !openedAnimeForArcs,
  );

  const max = freeMode ? Infinity : size;
  const isSelectedAnime = (id: number) => selected.some((s) => s.external_id === String(id));
  const isSelectedChar = (id: number) => selected.some((s) => s.external_id === `char-${id}`);
  const isSelectedTheme = (id: string) => selected.some((s) => s.external_id === id);
  const isSelectedArc = (id: number) => selected.some((s) => s.external_id === `arc-${id}`);

  const addAnime = (a: AnimeResult) => {
    if (selected.length >= max) return;
    onChange([...selected, {
      external_id: String(a.id),
      title: a.title,
      subtitle: a.format,
      cover_url: a.coverUrl,
      preview_url: null,
      source: "anilist",
      metadata: {
        itemKind: "anime",
        anilistId: a.id,
        popularity: a.popularity ?? 0,
      },
    }]);
  };

  const addCharacter = (c: CharacterResult) => {
    if (selected.length >= max) return;
    onChange([...selected, {
      external_id: `char-${c.id}`,
      title: c.name,
      subtitle: c.animes[0],
      cover_url: c.imageUrl,
      preview_url: null,
      source: "anilist",
      metadata: { itemKind: "character", anilistCharacterId: c.id },
    }]);
  };

  const addArc = (a: ArcResult, parentTitle?: string | null) => {
    if (selected.length >= max) return;
    onChange([...selected, {
      external_id: `arc-${a.id}`,
      title: a.title,
      subtitle: parentTitle ?? a.parentTitle ?? undefined,
      cover_url: a.coverUrl,
      preview_url: null,
      source: "anilist",
      metadata: {
        itemKind: "arc",
        anilistMediaId: a.id,
        parentAnimeTitle: parentTitle ?? a.parentTitle ?? undefined,
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

  const openAnimeForThemes = async (anime: AnimeResult) => {
    setOpenedAnime(anime);
    setOpenedAnimeForArcs(null);
    setThemesLoading(true);
    setAnimeThemes([]);
    try {
      const res = await fetch(`/api/anilist/anime/${anime.id}/themes`);
      const json = await res.json();
      setAnimeThemes(json.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setThemesLoading(false);
    }
  };

  const openAnimeForArcs = async (anime: AnimeResult) => {
    setOpenedAnimeForArcs(anime);
    setOpenedAnime(null);
    setArcsLoading(true);
    setAnimeArcs([]);
    try {
      const res = await fetch(`/api/anilist/anime/${anime.id}/arcs`);
      const json = await res.json();
      setAnimeArcs(json.data ?? []);
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
          {animeResults.map((a) => {
            const already = isSelectedAnime(a.id);
            return (
              <li key={a.id} className="card flex items-center gap-3 p-2 hover:bg-base-200 transition-colors">
                {a.coverUrl && (
                  <div className="w-10 h-10 flex-shrink-0 relative">
                    <Image src={a.coverUrl} alt="" fill className="object-cover rounded" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  {a.format && <p className="text-xs text-base-content/60">{a.format}{a.episodes ? ` · ${a.episodes} éps` : ""}</p>}
                </div>
                <button
                  type="button"
                  disabled={already || selected.length >= max}
                  onClick={() => addAnime(a)}
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
            {animeArcs.map((a) => {
              const already = isSelectedArc(a.id);
              return (
                <li key={a.id} className="card flex items-center gap-3 p-2">
                  {a.coverUrl && (
                    <div className="w-10 h-10 flex-shrink-0 relative">
                      <Image src={a.coverUrl} alt="" fill className="object-cover rounded" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    <p className="text-xs text-base-content/60 truncate">
                      {openedAnimeForArcs.title}
                      {a.episodes ? ` · ${a.episodes} éps` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={already || selected.length >= max}
                    onClick={() => addArc(a, openedAnimeForArcs.title)}
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
              {arcSearchResults.map((a) => {
                const already = isSelectedArc(a.id);
                return (
                  <li key={a.id} className="card flex items-center gap-3 p-2 hover:bg-base-200 transition-colors">
                    {a.coverUrl && (
                      <div className="w-10 h-10 flex-shrink-0 relative">
                        <Image src={a.coverUrl} alt="" fill className="object-cover rounded" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      {a.parentTitle && (
                        <p className="text-xs text-base-content/60 truncate">{a.parentTitle}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={already || selected.length >= max}
                      onClick={() => addArc(a)}
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
            {animeResults.map((a) => (
              <li
                key={a.id}
                className="card flex items-center gap-3 p-2 hover:bg-base-200 transition-colors cursor-pointer"
                onClick={() => openAnimeForArcs(a)}
              >
                {a.coverUrl && (
                  <div className="w-10 h-10 flex-shrink-0 relative">
                    <Image src={a.coverUrl} alt="" fill className="object-cover rounded" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.title}</p>
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
          {animeResults.map((a) => (
            <li
              key={a.id}
              className="card flex items-center gap-3 p-2 hover:bg-base-200 transition-colors cursor-pointer"
              onClick={() => openAnimeForThemes(a)}
            >
              {a.coverUrl && (
                <div className="w-10 h-10 flex-shrink-0 relative">
                  <Image src={a.coverUrl} alt="" fill className="object-cover rounded" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.title}</p>
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
          {charResults.map((c) => {
            const already = isSelectedChar(c.id);
            return (
              <li key={c.id} className="card flex items-center gap-3 p-2 hover:bg-base-200 transition-colors">
                {c.imageUrl && (
                  <div className="w-10 h-10 flex-shrink-0 relative">
                    <Image src={c.imageUrl} alt="" fill className="object-cover rounded-full" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  {c.animes[0] && <p className="text-xs text-base-content/60 truncate">{c.animes[0]}</p>}
                </div>
                <button
                  type="button"
                  disabled={already || selected.length >= max}
                  onClick={() => addCharacter(c)}
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
