"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  Check,
  Layers3,
  Library,
  Sparkles,
  Zap,
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

type Tab = "card" | "set" | "deck" | "pokemon" | "pokemon-set";

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
    source: "scryfall",
    metadata: { itemKind: item.metadata?.itemKind ?? "card", ...item.metadata },
  };
}

export default function CardPicker({ size, selected, onChange, freeMode = false }: Props) {
  const [tab, setTab] = useState<Tab>("card");
  const [query, setQuery] = useState("");
  const [openedSet, setOpenedSet] = useState<ContentCollection | null>(null);
  const [openedDeck, setOpenedDeck] = useState<ContentEntity | null>(null);
  const [openedPokemonSet, setOpenedPokemonSet] = useState<ContentItem | null>(null);
  const [setCards, setSetCards] = useState<ContentItem[]>([]);
  const [deckCards, setDeckCards] = useState<ContentItem[]>([]);
  const [pokemonSetCards, setPokemonSetCards] = useState<ContentItem[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: cardResults, loading: cardLoading } = useDebouncedSearch(
    "/api/content/search?kind=items",
    query,
    tab === "card",
  );

  const { results: setResults, loading: setLoading } = useDebouncedSearch(
    "/api/content/search?kind=collections",
    query,
    tab === "set" && !openedSet,
  );

  const { results: deckResults, loading: deckLoading } = useDebouncedSearch(
    "/api/content/search?kind=entities",
    query,
    tab === "deck" && !openedDeck,
  );

  const { results: pokemonResults, loading: pokemonLoading } = useDebouncedSearch(
    "/api/content/pokemon/search",
    query,
    tab === "pokemon",
  );

  const { results: pokemonSetResults, loading: pokemonSetLoading } = useDebouncedSearch(
    "/api/content/pokemon/sets",
    query,
    tab === "pokemon-set" && !openedPokemonSet,
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

  const openPokemonSet = async (setItem: ContentItem) => {
    setOpenedPokemonSet(setItem);
    setDrillLoading(true);
    setPokemonSetCards([]);
    const setId = String(setItem.metadata?.setId ?? setItem.id.replace(/^ptcgset-/, ""));
    try {
      const res = await fetch(`/api/content/pokemon/set/${setId}/cards`);
      const json = await res.json();
      setPokemonSetCards(json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const openSet = async (col: ContentCollection) => {
    setOpenedSet(col);
    setOpenedDeck(null);
    setDrillLoading(true);
    setSetCards([]);
    try {
      const res = await fetch(`/api/content/collection/${col.id}/items`);
      const json = await res.json();
      setSetCards(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const openDeck = async (entity: ContentEntity) => {
    setOpenedDeck(entity);
    setOpenedSet(null);
    setDrillLoading(true);
    setDeckCards([]);
    try {
      const res = await fetch(`/api/content/entity/${entity.id}/items?limit=50`);
      const json = await res.json();
      setDeckCards(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Sparkles }[] = [
    { key: "card", label: "Magic", icon: Sparkles },
    { key: "set", label: "Sets Magic", icon: Layers3 },
    { key: "deck", label: "Decks", icon: Library },
    { key: "pokemon", label: "Pokémon", icon: Zap },
    { key: "pokemon-set", label: "Sets Pokémon", icon: Layers3 },
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
              setOpenedSet(null);
              setOpenedDeck(null);
              setOpenedPokemonSet(null);
              setSetCards([]);
              setDeckCards([]);
              setPokemonSetCards([]);
              setQuery("");
            }}
          >
            <Icon size={14} className="inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {(openedSet || openedDeck || openedPokemonSet) && (
        <button
          type="button"
          className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => {
            setOpenedSet(null);
            setOpenedDeck(null);
            setOpenedPokemonSet(null);
            setSetCards([]);
            setDeckCards([]);
            setPokemonSetCards([]);
          }}
        >
          <ChevronLeft size={16} />
          Retour à la recherche
        </button>
      )}

      {!openedSet && !openedDeck && !openedPokemonSet && (
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
              tab === "card"
                ? "Rechercher une carte Magic…"
                : tab === "set"
                  ? "Rechercher un set Magic…"
                  : tab === "deck"
                    ? "Rechercher un deck…"
                    : tab === "pokemon"
                      ? "Rechercher une carte Pokémon…"
                      : "Rechercher un set Pokémon…"
            }
            className="input w-full pl-10"
          />
        </div>
      )}

      <div className="min-h-[200px] space-y-2">
        {tab === "card" &&
          cardResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "set" && !openedSet &&
          (setResults as unknown as ContentCollection[]).map((col) => (
            <button
              key={col.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openSet(col)}
            >
              {col.coverUrl ? (
                <Image src={col.coverUrl} alt="" width={48} height={48} className="rounded-md object-contain bg-[color:var(--surface-2)] p-1" />
              ) : (
                <div className="w-12 h-12 rounded-md bg-[color:var(--surface-2)]" />
              )}
              <div>
                <p className="font-semibold">{col.title}</p>
                <p className="text-xs text-[color:var(--muted)]">Voir les cartes du set</p>
              </div>
            </button>
          ))}

        {tab === "set" && openedSet && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedSet.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {setCards.map((item) => (
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

        {tab === "deck" && !openedDeck &&
          (deckResults as unknown as ContentEntity[]).map((entity) => (
            <button
              key={entity.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openDeck(entity)}
            >
              <div className="w-12 h-12 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center">
                <Library size={20} className="text-[color:var(--muted)]" />
              </div>
              <div>
                <p className="font-semibold">{entity.name}</p>
                <p className="text-xs text-[color:var(--muted)]">Cartes du deck</p>
              </div>
            </button>
          ))}

        {tab === "deck" && openedDeck && (
          <>
            <p className="text-sm font-medium">{openedDeck.name}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {deckCards.map((item) => (
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

        {tab === "pokemon" &&
          pokemonResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "pokemon-set" && !openedPokemonSet &&
          pokemonSetResults.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openPokemonSet(item)}
            >
              {item.coverUrl ? (
                <Image src={item.coverUrl} alt="" width={72} height={36} className="rounded object-contain bg-[color:var(--surface-2)] p-1 shrink-0" />
              ) : (
                <div className="w-[72px] h-9 rounded bg-[color:var(--surface-2)] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{item.title}</p>
                {item.subtitle && <p className="text-xs text-[color:var(--muted)]">{item.subtitle}</p>}
              </div>
              <ChevronLeft size={16} className="rotate-180 text-[color:var(--muted)] shrink-0" />
            </button>
          ))}

        {tab === "pokemon-set" && openedPokemonSet && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedPokemonSet.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {!drillLoading && pokemonSetCards.length === 0 && (
              <p className="text-sm text-[color:var(--muted)]">Aucune carte trouvée.</p>
            )}
            {pokemonSetCards.map((item) => (
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

        {(cardLoading || setLoading || deckLoading || pokemonLoading || pokemonSetLoading) && (
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
        <Image src={coverUrl} alt="" width={40} height={56} className="rounded object-cover shrink-0" />
      ) : (
        <div className="w-10 h-14 rounded bg-[color:var(--surface-2)] shrink-0" />
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
