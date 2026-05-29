"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search, Plus, X, ChevronLeft, Check, Film, Clapperboard, User } from "lucide-react";
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

type Tab = "movie" | "collection" | "person" | "character";

type MovieCharacter = {
  id: string;
  characterName: string;
  actorName: string;
  coverUrl: string | null;
};

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
    source: "tmdb",
    metadata: { itemKind: item.metadata?.itemKind ?? "movie", ...item.metadata },
  };
}

export default function MoviePicker({ size, selected, onChange, freeMode = false }: Props) {
  const [tab, setTab] = useState<Tab>("movie");
  const [query, setQuery] = useState("");
  const [openedCollection, setOpenedCollection] = useState<ContentCollection | null>(null);
  const [openedPerson, setOpenedPerson] = useState<ContentEntity | null>(null);
  const [openedMovieForChars, setOpenedMovieForChars] = useState<ContentItem | null>(null);
  const [collectionMovies, setCollectionMovies] = useState<ContentItem[]>([]);
  const [personMovies, setPersonMovies] = useState<ContentItem[]>([]);
  const [movieCharacters, setMovieCharacters] = useState<MovieCharacter[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: movieResults, loading: movieLoading } = useDebouncedSearch(
    "/api/content/search?kind=items",
    query,
    tab === "movie",
  );

  const { results: collectionResults, loading: collectionLoading } = useDebouncedSearch(
    "/api/content/search?kind=collections",
    query,
    tab === "collection" && !openedCollection,
  );

  const { results: personResults, loading: personLoading } = useDebouncedSearch(
    "/api/content/search?kind=entities",
    query,
    tab === "person" && !openedPerson,
  );

  const { results: charMovieResults, loading: charMovieLoading } = useDebouncedSearch(
    "/api/content/search?kind=items",
    query,
    tab === "character" && !openedMovieForChars,
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

  const openCollection = async (col: ContentCollection) => {
    setOpenedCollection(col);
    setOpenedPerson(null);
    setDrillLoading(true);
    setCollectionMovies([]);
    try {
      const res = await fetch(`/api/content/collection/${col.id}/items`);
      const json = await res.json();
      setCollectionMovies(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const openMovieForChars = async (movie: ContentItem) => {
    setOpenedMovieForChars(movie);
    setDrillLoading(true);
    setMovieCharacters([]);
    try {
      const res = await fetch(
        `/api/content/movie/${movie.id}/characters?title=${encodeURIComponent(movie.title)}`,
      );
      const json = (await res.json()) as { items?: Array<{ id: string; title: string; subtitle?: string; coverUrl?: string }> };
      setMovieCharacters(
        (json.items ?? []).map((item) => ({
          id: item.id,
          characterName: item.title,
          actorName: item.subtitle?.split(" · ")[0] ?? "",
          coverUrl: item.coverUrl ?? null,
        })),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const addCharacter = (char: MovieCharacter, movieTitle: string) => {
    if (selected.length >= max || isSelected(char.id)) return;
    onChange([...selected, {
      external_id: char.id,
      title: char.characterName,
      subtitle: `${char.actorName} · ${movieTitle}`,
      cover_url: char.coverUrl,
      preview_url: null,
      source: "tmdb",
      metadata: {
        itemKind: "character",
        actorName: char.actorName,
        movieTitle,
      },
    }]);
  };

  const openPerson = async (person: ContentEntity) => {
    setOpenedPerson(person);
    setOpenedCollection(null);
    setDrillLoading(true);
    setPersonMovies([]);
    try {
      const res = await fetch(`/api/content/entity/${person.id}/items?limit=50`);
      const json = await res.json();
      setPersonMovies(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Film }[] = [
    { key: "movie", label: "Films", icon: Film },
    { key: "collection", label: "Sagas", icon: Clapperboard },
    { key: "character", label: "Personnages", icon: User },
    { key: "person", label: "Par acteur", icon: Clapperboard },
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
              setOpenedCollection(null);
              setOpenedPerson(null);
              setOpenedMovieForChars(null);
              setCollectionMovies([]);
              setPersonMovies([]);
              setMovieCharacters([]);
              setQuery("");
            }}
          >
            <Icon size={14} className="inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {(openedCollection || openedPerson || openedMovieForChars) && (
        <button
          type="button"
          className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => {
            setOpenedCollection(null);
            setOpenedPerson(null);
            setOpenedMovieForChars(null);
            setCollectionMovies([]);
            setPersonMovies([]);
            setMovieCharacters([]);
          }}
        >
          <ChevronLeft size={16} />
          Retour à la recherche
        </button>
      )}

      {!openedCollection && !openedPerson && !openedMovieForChars && (
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
              tab === "movie"
                ? "Rechercher un film…"
                : tab === "collection"
                  ? "Rechercher une saga…"
                  : tab === "character"
                    ? "Rechercher un film pour ses personnages…"
                    : "Rechercher un acteur ou réalisateur…"
            }
            className="input w-full pl-10"
          />
        </div>
      )}

      <div className="min-h-[200px] space-y-2">
        {tab === "movie" &&
          movieResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "collection" && !openedCollection &&
          (collectionResults as unknown as ContentCollection[]).map((col) => (
            <button
              key={col.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openCollection(col)}
            >
              {col.coverUrl ? (
                <Image src={col.coverUrl} alt="" width={48} height={72} className="rounded-md object-cover" />
              ) : (
                <div className="w-12 h-[72px] rounded-md bg-[color:var(--surface-2)]" />
              )}
              <div>
                <p className="font-semibold">{col.title}</p>
                <p className="text-xs text-[color:var(--muted)]">Voir les films de la saga</p>
              </div>
            </button>
          ))}

        {tab === "collection" && openedCollection && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedCollection.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {collectionMovies.map((item) => (
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

        {tab === "character" && !openedMovieForChars &&
          charMovieResults.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openMovieForChars(item)}
            >
              {item.coverUrl ? (
                <Image src={item.coverUrl} alt="" width={40} height={60} className="rounded object-cover shrink-0" />
              ) : (
                <div className="w-10 h-[60px] rounded bg-[color:var(--surface-2)] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{item.title}</p>
                <p className="text-xs text-[color:var(--muted)]">Voir les personnages</p>
              </div>
              <ChevronLeft size={16} className="rotate-180 text-[color:var(--muted)] shrink-0" />
            </button>
          ))}

        {tab === "character" && charMovieLoading && !openedMovieForChars && (
          <p className="text-sm text-[color:var(--muted)]">Recherche…</p>
        )}

        {tab === "character" && openedMovieForChars && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedMovieForChars.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {!drillLoading && movieCharacters.length === 0 && (
              <p className="text-sm text-[color:var(--muted)]">Aucun personnage trouvé.</p>
            )}
            {movieCharacters.map((char) => (
              <ResultRow
                key={char.id}
                title={char.characterName}
                subtitle={char.actorName}
                coverUrl={char.coverUrl}
                selected={isSelected(char.id)}
                onAdd={() => addCharacter(char, openedMovieForChars.title)}
                round
              />
            ))}
          </>
        )}

        {tab === "person" && !openedPerson &&
          (personResults as unknown as ContentEntity[]).map((person) => (
            <button
              key={person.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openPerson(person)}
            >
              {person.pictureUrl ? (
                <Image
                  src={person.pictureUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[color:var(--surface-2)]" />
              )}
              <div>
                <p className="font-semibold">{person.name}</p>
                <p className="text-xs text-[color:var(--muted)]">Filmographie</p>
              </div>
            </button>
          ))}

        {tab === "person" && openedPerson && (
          <>
            <p className="text-sm font-medium">{openedPerson.name}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {personMovies.map((item) => (
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

        {(movieLoading || collectionLoading || personLoading) && tab !== "character" && (
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
  round = false,
}: {
  title: string;
  subtitle?: string;
  coverUrl?: string | null;
  selected: boolean;
  onAdd: () => void;
  round?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3">
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt=""
          width={40}
          height={round ? 40 : 60}
          className={`object-cover shrink-0 ${round ? "rounded-full" : "rounded"}`}
        />
      ) : (
        <div className={`w-10 bg-[color:var(--surface-2)] shrink-0 ${round ? "h-10 rounded-full" : "h-[60px] rounded"}`} />
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
