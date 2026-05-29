"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search, Plus, X, ChevronLeft, Check, BookOpen, Tag, User, Library } from "lucide-react";
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

type Tab = "book" | "genre" | "author" | "series";

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

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !enabled) return;
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
  }, [query, endpoint, enabled]);

  const visibleResults = query.trim() && enabled ? results : [];
  return { results: visibleResults, loading: query.trim() && enabled ? loading : false };
}

function itemToSelected(item: ContentItem): SelectedItem {
  return {
    external_id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    cover_url: item.coverUrl ?? null,
    preview_url: null,
    source: "openlibrary",
    metadata: { itemKind: item.metadata?.itemKind ?? "book", ...item.metadata },
  };
}

export default function BookPicker({ size, selected, onChange, freeMode = false }: Props) {
  const [tab, setTab] = useState<Tab>("book");
  const [query, setQuery] = useState("");
  const [openedGenre, setOpenedGenre] = useState<ContentCollection | null>(null);
  const [openedAuthor, setOpenedAuthor] = useState<ContentEntity | null>(null);
  const [openedSeries, setOpenedSeries] = useState<ContentItem | null>(null);
  const [genreBooks, setGenreBooks] = useState<ContentItem[]>([]);
  const [authorBooks, setAuthorBooks] = useState<ContentItem[]>([]);
  const [seriesBooks, setSeriesBooks] = useState<ContentItem[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: bookResults, loading: bookLoading } = useDebouncedSearch(
    "/api/content/search?kind=book",
    query,
    tab === "book",
  );

  const { results: genreResults, loading: genreLoading } = useDebouncedSearch(
    "/api/content/search?kind=collections",
    query,
    tab === "genre" && !openedGenre,
  );

  const { results: authorResults, loading: authorLoading } = useDebouncedSearch(
    "/api/content/search?kind=entities",
    query,
    tab === "author" && !openedAuthor,
  );

  const { results: seriesResults, loading: seriesLoading } = useDebouncedSearch(
    "/api/content/search?kind=series",
    query,
    tab === "series" && !openedSeries,
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

  useEffect(() => {
    if (!openedGenre) return;
    fetch(`/api/content/collection/${openedGenre.id}/items`)
      .then((r) => r.json())
      .then((json) => setGenreBooks(json.items ?? json.results ?? []))
      .catch(console.error)
      .finally(() => setDrillLoading(false));
  }, [openedGenre]);

  useEffect(() => {
    if (!openedSeries) return;
    const seriesName = String(openedSeries.metadata?.seriesName ?? openedSeries.title);
    setDrillLoading(true);
    setSeriesBooks([]);
    fetch(withSearchQuery("/api/content/search?kind=series-books", seriesName))
      .then((r) => r.json())
      .then((json) => setSeriesBooks(json.results ?? []))
      .catch(console.error)
      .finally(() => setDrillLoading(false));
  }, [openedSeries]);

  useEffect(() => {
    if (!openedAuthor) return;
    fetch(`/api/content/entity/${openedAuthor.id}/items?limit=50`)
      .then((r) => r.json())
      .then((json) => setAuthorBooks(json.items ?? json.results ?? []))
      .catch(console.error)
      .finally(() => setDrillLoading(false));
  }, [openedAuthor]);

  const tabs: { key: Tab; label: string; icon: typeof BookOpen }[] = [
    { key: "book", label: "Livres", icon: BookOpen },
    { key: "series", label: "Sagas", icon: Library },
    { key: "genre", label: "Genres", icon: Tag },
    { key: "author", label: "Auteurs", icon: User },
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
              setOpenedGenre(null);
              setOpenedAuthor(null);
              setOpenedSeries(null);
              setSeriesBooks([]);
              setQuery("");
            }}
          >
            <Icon size={14} className="inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {(openedGenre || openedAuthor || openedSeries) && (
        <button
          type="button"
          className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => {
            setOpenedGenre(null);
            setOpenedAuthor(null);
            setOpenedSeries(null);
            setSeriesBooks([]);
          }}
        >
          <ChevronLeft size={16} />
          Retour à la recherche
        </button>
      )}

      {!openedGenre && !openedAuthor && !openedSeries && (
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
              tab === "book"
                ? "Rechercher un livre…"
                : tab === "genre"
                  ? "Rechercher un genre…"
                  : tab === "series"
                    ? "Rechercher une saga ou série…"
                    : "Rechercher un auteur…"
            }
            className="input w-full pl-10"
          />
        </div>
      )}

      <div className="min-h-[200px] space-y-2">
        {tab === "book" &&
          bookResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "series" && !openedSeries &&
          seriesResults.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => setOpenedSeries(item)}
            >
              {item.coverUrl ? (
                <Image src={item.coverUrl} alt="" width={40} height={60} className="rounded object-cover shrink-0" />
              ) : (
                <div className="w-10 h-[60px] rounded bg-[color:var(--surface-2)] flex items-center justify-center shrink-0">
                  <Library size={18} className="text-[color:var(--muted)]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{item.title}</p>
                {item.subtitle && <p className="text-xs text-[color:var(--muted)]">{item.subtitle}</p>}
              </div>
              <ChevronLeft size={16} className="rotate-180 text-[color:var(--muted)] shrink-0" />
            </button>
          ))}

        {tab === "series" && !openedSeries && seriesLoading && (
          <p className="text-sm text-[color:var(--muted)]">Recherche…</p>
        )}

        {tab === "series" && openedSeries && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">
              {openedSeries.title}
            </p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {!drillLoading && seriesBooks.length === 0 && (
              <p className="text-sm text-[color:var(--muted)]">Aucun livre trouvé dans cette saga.</p>
            )}
            {seriesBooks.map((item) => (
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
          (genreResults as unknown as ContentCollection[]).map((genre) => (
            <button
              key={genre.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => {
                setDrillLoading(true);
                setOpenedGenre(genre);
              }}
            >
              <div className="w-12 h-[72px] rounded-md bg-[color:var(--surface-2)] flex items-center justify-center">
                <Tag size={20} className="text-[color:var(--muted)]" />
              </div>
              <div>
                <p className="font-semibold">{genre.title}</p>
                <p className="text-xs text-[color:var(--muted)]">Voir les livres du genre</p>
              </div>
            </button>
          ))}

        {tab === "genre" && openedGenre && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedGenre.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {genreBooks.map((item) => (
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

        {tab === "author" && !openedAuthor &&
          (authorResults as unknown as ContentEntity[]).map((author) => (
            <button
              key={author.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => {
                setDrillLoading(true);
                setOpenedAuthor(author);
              }}
            >
              {author.pictureUrl ? (
                <Image
                  src={author.pictureUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[color:var(--surface-2)]" />
              )}
              <div>
                <p className="font-semibold">{author.name}</p>
                <p className="text-xs text-[color:var(--muted)]">Bibliographie</p>
              </div>
            </button>
          ))}

        {tab === "author" && openedAuthor && (
          <>
            <p className="text-sm font-medium">{openedAuthor.name}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {authorBooks.map((item) => (
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

        {(bookLoading || genreLoading || authorLoading) && (
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
