"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  Check,
  Dices,
  Tags,
  Puzzle,
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

type Tab = "game" | "category" | "mechanic";

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
    source: "bgg",
    metadata: { itemKind: item.metadata?.itemKind ?? "boardgame", ...item.metadata },
  };
}

export default function BoardPicker({ size, selected, onChange, freeMode = false }: Props) {
  const [tab, setTab] = useState<Tab>("game");
  const [query, setQuery] = useState("");
  const [openedCollection, setOpenedCollection] = useState<ContentCollection | null>(null);
  const [openedMechanic, setOpenedMechanic] = useState<ContentEntity | null>(null);
  const [collectionGames, setCollectionGames] = useState<ContentItem[]>([]);
  const [mechanicGames, setMechanicGames] = useState<ContentItem[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: gameResults, loading: gameLoading } = useDebouncedSearch(
    "/api/content/search?kind=items",
    query,
    tab === "game",
  );

  const { results: collectionResults, loading: collectionLoading } = useDebouncedSearch(
    "/api/content/search?kind=collections",
    query,
    tab === "category" && !openedCollection,
  );

  const { results: mechanicResults, loading: mechanicLoading } = useDebouncedSearch(
    "/api/content/search?kind=entities",
    query,
    tab === "mechanic" && !openedMechanic,
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
    setOpenedMechanic(null);
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

  const openMechanic = async (entity: ContentEntity) => {
    setOpenedMechanic(entity);
    setOpenedCollection(null);
    setDrillLoading(true);
    setMechanicGames([]);
    try {
      const res = await fetch(`/api/content/entity/${entity.id}/items?limit=50`);
      const json = await res.json();
      setMechanicGames(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Dices }[] = [
    { key: "game", label: "Jeux", icon: Dices },
    { key: "category", label: "Catégories", icon: Tags },
    { key: "mechanic", label: "Mécaniques", icon: Puzzle },
  ];

  const mechanicEntities = (mechanicResults as unknown as ContentEntity[]).filter((e) =>
    e.id.startsWith("mechanic-"),
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
              setOpenedMechanic(null);
              setCollectionGames([]);
              setMechanicGames([]);
              setQuery("");
            }}
          >
            <Icon size={14} className="inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {(openedCollection || openedMechanic) && (
        <button
          type="button"
          className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => {
            setOpenedCollection(null);
            setOpenedMechanic(null);
            setCollectionGames([]);
            setMechanicGames([]);
          }}
        >
          <ChevronLeft size={16} />
          Retour à la recherche
        </button>
      )}

      {!openedCollection && !openedMechanic && (
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
              tab === "game"
                ? "Rechercher un jeu…"
                : tab === "category"
                  ? "Rechercher une catégorie…"
                  : "Rechercher une mécanique…"
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

        {tab === "category" && !openedCollection &&
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
                <p className="text-xs text-[color:var(--muted)]">Voir les jeux</p>
              </div>
            </button>
          ))}

        {tab === "category" && openedCollection && (
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

        {tab === "mechanic" && !openedMechanic &&
          mechanicEntities.map((entity) => (
            <button
              key={entity.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openMechanic(entity)}
            >
              <div className="w-12 h-12 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center shrink-0">
                <Puzzle size={20} className="text-[color:var(--accent)]" />
              </div>
              <div>
                <p className="font-semibold">{entity.name}</p>
                <p className="text-xs text-[color:var(--muted)]">Jeux avec cette mécanique</p>
              </div>
            </button>
          ))}

        {tab === "mechanic" && openedMechanic && (
          <>
            <p className="text-sm font-medium">{openedMechanic.name}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {mechanicGames.map((item) => (
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

        {(gameLoading || collectionLoading || mechanicLoading) && (
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
