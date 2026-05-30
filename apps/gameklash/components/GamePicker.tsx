"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  Check,
  Gamepad2,
  Layers,
  Building2,
  Tag,
  Clock,
  Sparkles,
  Users,
} from "lucide-react";
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

type Tab =
  | "game"
  | "retro"
  | "indie"
  | "collection"
  | "retro-console"
  | "indie-tag"
  | "genre"
  | "studio"
  | "retro-era"
  | "indie-dev";

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
    source: item.source ?? "rawg",
    metadata: { itemKind: item.metadata?.itemKind ?? "game", ...item.metadata },
  };
}

export default function GamePicker({ size, selected, onChange, freeMode = false }: Props) {
  const [tab, setTab] = useState<Tab>("game");
  const [query, setQuery] = useState("");
  const [openedCollection, setOpenedCollection] = useState<ContentCollection | null>(null);
  const [openedStudio, setOpenedStudio] = useState<ContentEntity | null>(null);
  const [openedGenre, setOpenedGenre] = useState<ContentItem | null>(null);
  const [collectionGames, setCollectionGames] = useState<ContentItem[]>([]);
  const [studioGames, setStudioGames] = useState<ContentItem[]>([]);
  const [genreGames, setGenreGames] = useState<ContentItem[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: retroResults, loading: retroLoading } = useDebouncedSearch(
    "/api/content/search?kind=retro",
    query,
    tab === "retro",
  );

  const { results: indieResults, loading: indieLoading } = useDebouncedSearch(
    "/api/content/search?kind=indie",
    query,
    tab === "indie",
  );

  const { results: retroConsoleResults, loading: retroConsoleLoading } = useDebouncedSearch(
    "/api/content/search?kind=retro-collections",
    query,
    tab === "retro-console" && !openedCollection,
  );

  const { results: indieTagResults, loading: indieTagLoading } = useDebouncedSearch(
    "/api/content/search?kind=indie-collections",
    query,
    tab === "indie-tag" && !openedCollection,
  );

  const { results: retroEraResults, loading: retroEraLoading } = useDebouncedSearch(
    "/api/content/search?kind=retro-entities",
    query,
    tab === "retro-era" && !openedStudio,
  );

  const { results: indieDevResults, loading: indieDevLoading } = useDebouncedSearch(
    "/api/content/search?kind=indie-entities",
    query,
    tab === "indie-dev" && !openedStudio,
  );

  const { results: gameResults, loading: gameLoading } = useDebouncedSearch(
    "/api/content/search?kind=items",
    query,
    tab === "game",
  );

  const { results: collectionResults, loading: collectionLoading } = useDebouncedSearch(
    "/api/content/search?kind=collections",
    query,
    tab === "collection" && !openedCollection,
  );

  const { results: studioResults, loading: studioLoading } = useDebouncedSearch(
    "/api/content/search?kind=entities",
    query,
    tab === "studio" && !openedStudio,
  );

  const { results: genreResults, loading: genreLoading } = useDebouncedSearch(
    "/api/content/search?kind=genre",
    query,
    tab === "genre" && !openedGenre,
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

  const openGenre = async (genre: ContentItem) => {
    setOpenedGenre(genre);
    setDrillLoading(true);
    setGenreGames([]);
    try {
      const res = await fetch(`/api/content/collection/${genre.id}/items`);
      const json = await res.json();
      setGenreGames(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const openCollection = async (col: ContentCollection) => {
    setOpenedCollection(col);
    setOpenedStudio(null);
    setDrillLoading(true);
    setCollectionGames([]);
    try {
      const res = await fetch(`/api/content/collection/${col.id}/items`);
      const json = await res.json();
      setCollectionGames(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const openStudio = async (entity: ContentEntity) => {
    if (entity.id.startsWith("genre-")) {
      setOpenedStudio(entity);
      setOpenedCollection(null);
      setDrillLoading(true);
      setStudioGames([]);
      try {
        const res = await fetch(`/api/content/entity/${entity.id}/items?limit=50`);
        const json = await res.json();
        setStudioGames(json.items ?? json.results ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setDrillLoading(false);
      }
      return;
    }
    setOpenedStudio(entity);
    setOpenedCollection(null);
    setDrillLoading(true);
    setStudioGames([]);
    try {
      const res = await fetch(`/api/content/entity/${entity.id}/items?limit=50`);
      const json = await res.json();
      setStudioGames(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Gamepad2 }[] = [
    { key: "game", label: "Jeux", icon: Gamepad2 },
    { key: "retro", label: "Rétro", icon: Clock },
    { key: "indie", label: "Indés", icon: Sparkles },
    { key: "collection", label: "Franchises", icon: Layers },
    { key: "retro-console", label: "Consoles", icon: Layers },
    { key: "indie-tag", label: "Tags indés", icon: Tag },
    { key: "genre", label: "Genres", icon: Tag },
    { key: "studio", label: "Studios", icon: Building2 },
    { key: "retro-era", label: "Ères", icon: Clock },
    { key: "indie-dev", label: "Devs indés", icon: Users },
  ];

  const studioEntities = (studioResults as unknown as ContentEntity[]).filter(
    (e) => !e.id.startsWith("genre-") || tab === "studio",
  );

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
              setOpenedCollection(null);
              setOpenedStudio(null);
              setOpenedGenre(null);
              setCollectionGames([]);
              setStudioGames([]);
              setGenreGames([]);
              setQuery("");
            }}
          >
            <Icon size={14} className="inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {(openedCollection || openedStudio || openedGenre) && (
        <button
          type="button"
          className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => {
            setOpenedCollection(null);
            setOpenedStudio(null);
            setOpenedGenre(null);
            setCollectionGames([]);
            setStudioGames([]);
            setGenreGames([]);
          }}
        >
          <ChevronLeft size={16} />
          Retour à la recherche
        </button>
      )}

      {!openedCollection && !openedStudio && !openedGenre && (
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
              tab === "game" || tab === "retro" || tab === "indie"
                ? "Rechercher un jeu…"
                : tab === "collection"
                  ? "Rechercher une franchise (Mario Kart, FIFA…)"
                  : tab === "retro-console"
                    ? "Rechercher une console (NES, SNES…)"
                    : tab === "indie-tag"
                      ? "Rechercher un tag indé…"
                      : tab === "genre"
                        ? "Rechercher un genre (RPG, Horreur…)"
                        : tab === "retro-era"
                          ? "Rechercher une ère (80s, 90s…)"
                          : tab === "indie-dev"
                            ? "Rechercher un studio indé…"
                            : "Rechercher un studio…"
            }
            className="input w-full pl-10"
          />
        </div>
      )}

      <div className="min-h-[200px] space-y-2">
        {tab === "game" &&
          gameResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "retro" &&
          retroResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "indie" &&
          indieResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {(tab === "collection" || tab === "retro-console" || tab === "indie-tag") && !openedCollection &&
          (tab === "collection"
            ? (collectionResults as unknown as ContentCollection[])
            : tab === "retro-console"
              ? retroConsoleResults
              : indieTagResults
          ).map((col) => {
            const collection = col as ContentCollection & ContentItem;
            return (
            <button
              key={collection.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openCollection({ id: collection.id, title: collection.title, coverUrl: collection.coverUrl, source: collection.source, metadata: collection.metadata })}
            >
              {collection.coverUrl ? (
                <Image src={collection.coverUrl} alt="" width={48} height={72} className="rounded-md object-cover" />
              ) : (
                <div className="w-12 h-[72px] rounded-md bg-[color:var(--surface-2)]" />
              )}
              <div>
                <p className="font-semibold">{collection.title}</p>
                <p className="text-xs text-[color:var(--muted)]">
                  {tab === "retro-console" ? "Voir les jeux rétro" : tab === "indie-tag" ? "Voir les jeux indés" : "Voir les jeux de la franchise"}
                </p>
              </div>
            </button>
            );
          })}

        {(tab === "collection" || tab === "retro-console" || tab === "indie-tag") && openedCollection && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedCollection.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {collectionGames.map((item) => (
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

        {tab === "genre" && !openedGenre &&
          genreResults.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openGenre(item)}
            >
              {item.coverUrl ? (
                <Image src={item.coverUrl} alt="" width={48} height={48} className="rounded-md object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-md bg-[color:var(--surface-2)] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{item.title}</p>
                <p className="text-xs text-[color:var(--muted)]">
                  {item.metadata?.gamesCount ? `${item.metadata.gamesCount as number} jeux` : "Voir les jeux"}
                </p>
              </div>
              <ChevronLeft size={16} className="rotate-180 text-[color:var(--muted)] shrink-0" />
            </button>
          ))}

        {tab === "genre" && !openedGenre && genreLoading && (
          <p className="text-sm text-[color:var(--muted)]">Recherche…</p>
        )}

        {tab === "genre" && openedGenre && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedGenre.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {!drillLoading && genreGames.length === 0 && (
              <p className="text-sm text-[color:var(--muted)]">Aucun jeu trouvé.</p>
            )}
            {genreGames.map((item) => (
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

        {(tab === "studio" || tab === "retro-era" || tab === "indie-dev") && !openedStudio &&
          (tab === "studio"
            ? studioEntities
            : tab === "retro-era"
              ? retroEraResults
              : indieDevResults
          ).map((entry) => {
            const entity = entry as ContentEntity & ContentItem;
            const name = entity.name ?? entity.title;
            const picture = entity.pictureUrl ?? entity.coverUrl;
            return (
            <button
              key={entity.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openStudio({ id: entity.id, name, pictureUrl: picture ?? null } as ContentEntity)}
            >
              {picture ? (
                <Image
                  src={picture}
                  alt=""
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[color:var(--surface-2)]" />
              )}
              <div>
                <p className="font-semibold">{name}</p>
                <p className="text-xs text-[color:var(--muted)]">
                  {entity.id.startsWith("genre-") ? "Jeux du genre" : tab === "retro-era" ? "Jeux de l'ère" : tab === "indie-dev" ? "Jeux du dev" : "Catalogue du studio"}
                </p>
              </div>
            </button>
            );
          })}

        {(tab === "studio" || tab === "retro-era" || tab === "indie-dev") && openedStudio && (
          <>
            <p className="text-sm font-medium">{openedStudio.name}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {studioGames.map((item) => (
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

        {(gameLoading ||
          retroLoading ||
          indieLoading ||
          collectionLoading ||
          retroConsoleLoading ||
          indieTagLoading ||
          studioLoading ||
          retroEraLoading ||
          indieDevLoading) && (
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
