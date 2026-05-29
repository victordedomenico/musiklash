"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search, Plus, X, ChevronLeft, Check, BookOpen, Library, User, Zap, Users, Flame } from "lucide-react";
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

type Tab = "manga" | "collection" | "author" | "character" | "arc" | "transformation" | "power";

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
    source: "mangadex",
    metadata: { itemKind: item.metadata?.itemKind ?? "manga", ...item.metadata },
  };
}

export default function MangaPicker({ size, selected, onChange, freeMode = false }: Props) {
  const [tab, setTab] = useState<Tab>("manga");
  const [query, setQuery] = useState("");
  const [openedCollection, setOpenedCollection] = useState<ContentCollection | null>(null);
  const [openedAuthor, setOpenedAuthor] = useState<ContentEntity | null>(null);
  const [collectionChapters, setCollectionChapters] = useState<ContentItem[]>([]);
  const [authorManga, setAuthorManga] = useState<ContentItem[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: mangaResults, loading: mangaLoading } = useDebouncedSearch(
    "/api/content/search?kind=items",
    query,
    tab === "manga",
  );

  const { results: collectionResults, loading: collectionLoading } = useDebouncedSearch(
    "/api/content/search?kind=collections",
    query,
    tab === "collection" && !openedCollection,
  );

  const { results: authorResults, loading: authorLoading } = useDebouncedSearch(
    "/api/content/search?kind=entities",
    query,
    tab === "author" && !openedAuthor,
  );

  const { results: characterResults, loading: characterLoading } = useDebouncedSearch(
    "/api/content/search?kind=character",
    query,
    tab === "character",
  );

  const { results: arcResults, loading: arcLoading } = useDebouncedSearch(
    "/api/content/search?kind=arc",
    query,
    tab === "arc",
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

  const addItem = (item: ContentItem) => {
    if (selected.length >= max || isSelected(item.id)) return;
    onChange([...selected, itemToSelected(item)]);
  };

  const removeItem = (id: string) => {
    onChange(selected.filter((s) => s.external_id !== id));
  };

  const openCollection = async (col: ContentCollection) => {
    setOpenedCollection(col);
    setOpenedAuthor(null);
    setDrillLoading(true);
    setCollectionChapters([]);
    try {
      const res = await fetch(`/api/content/collection/${col.id}/items`);
      const json = await res.json();
      setCollectionChapters(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const openAuthor = async (author: ContentEntity) => {
    setOpenedAuthor(author);
    setOpenedCollection(null);
    setDrillLoading(true);
    setAuthorManga([]);
    try {
      const res = await fetch(`/api/content/entity/${author.id}/items?limit=50`);
      const json = await res.json();
      setAuthorManga(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ComponentType<any> }[] = [
    { key: "manga", label: "Mangas", icon: BookOpen },
    { key: "collection", label: "Séries", icon: Library },
    { key: "character", label: "Personnages", icon: Users },
    { key: "arc", label: "Arcs", icon: Zap },
    { key: "transformation", label: "Transformations", icon: Flame },
    { key: "power", label: "Pouvoirs", icon: Zap },
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
              setOpenedCollection(null);
              setOpenedAuthor(null);
              setCollectionChapters([]);
              setAuthorManga([]);
              setQuery("");
            }}
          >
            <Icon size={14} className="inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {(openedCollection || openedAuthor) && (
        <button
          type="button"
          className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => {
            setOpenedCollection(null);
            setOpenedAuthor(null);
            setCollectionChapters([]);
            setAuthorManga([]);
          }}
        >
          <ChevronLeft size={16} />
          Retour à la recherche
        </button>
      )}

      {!openedCollection && !openedAuthor && (
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
              tab === "manga"
                ? "Rechercher un manga…"
                : tab === "collection"
                  ? "Rechercher une série…"
                  : tab === "character"
                    ? "Rechercher un personnage…"
                    : tab === "arc"
                      ? "Rechercher ou créer un arc…"
                      : tab === "transformation"
                        ? "Rechercher une transformation…"
                        : tab === "power"
                          ? "Rechercher un pouvoir…"
                          : "Rechercher un auteur…"
            }
            className="input w-full pl-10"
          />
        </div>
      )}

      <div className="min-h-[200px] space-y-2">
        {tab === "manga" &&
          mangaResults.map((item) => (
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
                <p className="text-xs text-[color:var(--muted)]">Voir les chapitres</p>
              </div>
            </button>
          ))}

        {tab === "collection" && openedCollection && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedCollection.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {collectionChapters.map((item) => (
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

        {tab === "character" &&
          characterResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "arc" &&
          arcResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "transformation" &&
          transformationResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "power" &&
          powerResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "author" && !openedAuthor &&
          (authorResults as unknown as ContentEntity[]).map((author) => (
            <button
              key={author.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openAuthor(author)}
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
                <p className="text-xs text-[color:var(--muted)]">Œuvres</p>
              </div>
            </button>
          ))}

        {tab === "author" && openedAuthor && (
          <>
            <p className="text-sm font-medium">{openedAuthor.name}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {authorManga.map((item) => (
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

        {(mangaLoading || collectionLoading || authorLoading || characterLoading || arcLoading || transformationLoading || powerLoading) && (
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
