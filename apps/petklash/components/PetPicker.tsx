"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  Check,
  PawPrint,
  Heart,
  Dog,
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

type Tab = "dog" | "cat" | "species" | "behavior" | "rabbit" | "bird" | "rodent" | "reptile" | "fish" | "horse";

const OTHER_SPECIES = [
  { key: "rabbit",  label: "Lapins",   emoji: "🐇" },
  { key: "bird",    label: "Oiseaux",  emoji: "🐦" },
  { key: "rodent",  label: "Rongeurs", emoji: "🐹" },
  { key: "reptile", label: "Reptiles", emoji: "🦎" },
  { key: "fish",    label: "Poissons", emoji: "🐠" },
  { key: "horse",   label: "Chevaux",  emoji: "🐴" },
] as const;

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
    source: "dogceo",
    metadata: { itemKind: item.metadata?.itemKind ?? "breed", ...item.metadata },
  };
}

export default function PetPicker({ size, selected, onChange, freeMode = false }: Props) {
  const [tab, setTab] = useState<Tab>("dog");
  const [query, setQuery] = useState("");
  const [openedCollection, setOpenedCollection] = useState<ContentCollection | null>(null);
  const [openedSpecies, setOpenedSpecies] = useState<ContentEntity | null>(null);
  const [collectionBreeds, setCollectionBreeds] = useState<ContentItem[]>([]);
  const [speciesBreeds, setSpeciesBreeds] = useState<ContentItem[]>([]);
  const [otherPets, setOtherPets] = useState<ContentItem[]>([]);
  const [otherPetsLoading, setOtherPetsLoading] = useState(false);
  const [drillLoading, setDrillLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: dogResults, loading: dogLoading } = useDebouncedSearch(
    "/api/content/search?kind=dog",
    query,
    tab === "dog",
  );

  const { results: catResults, loading: catLoading } = useDebouncedSearch(
    "/api/content/search?kind=cat",
    query,
    tab === "cat",
  );

  const { results: behaviorResults, loading: behaviorLoading } = useDebouncedSearch(
    "/api/content/search?kind=collections",
    query,
    tab === "behavior" && !openedCollection,
  );

  const { results: speciesResults, loading: speciesLoading } = useDebouncedSearch(
    "/api/content/search?kind=entities",
    query,
    tab === "species" && !openedSpecies,
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
    setOpenedSpecies(null);
    setDrillLoading(true);
    setCollectionBreeds([]);
    try {
      const res = await fetch(`/api/content/collection/${col.id}/items`);
      const json = await res.json();
      setCollectionBreeds(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const openSpecies = async (entity: ContentEntity) => {
    setOpenedSpecies(entity);
    setOpenedCollection(null);
    setDrillLoading(true);
    setSpeciesBreeds([]);
    try {
      const res = await fetch(`/api/content/entity/${entity.id}/items?limit=50`);
      const json = await res.json();
      setSpeciesBreeds(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const isOtherSpecies = (t: Tab) => OTHER_SPECIES.some((s) => s.key === t);

  // Load other species (rabbit, bird, etc.) whenever tab or query changes
  useEffect(() => {
    if (!isOtherSpecies(tab)) return;
    setOtherPetsLoading(true);
    setOtherPets([]);
    const q = query.trim();
    fetch(`/api/pets/${tab}${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then((r) => r.json())
      .then((json) => setOtherPets(json.results ?? []))
      .catch(console.error)
      .finally(() => setOtherPetsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, query]);

  const tabs: { key: Tab; label: string; icon: typeof PawPrint }[] = [
    { key: "dog",      label: "🐶 Chiens",          icon: Dog },
    { key: "cat",      label: "🐱 Chats",           icon: PawPrint },
    { key: "behavior", label: "Comportements",      icon: Heart },
    { key: "species",  label: "Espèces",            icon: PawPrint },
    ...OTHER_SPECIES.map((s) => ({ key: s.key as Tab, label: `${s.emoji} ${s.label}`, icon: PawPrint })),
  ];

  const behaviorCollections = (behaviorResults as unknown as ContentCollection[]).filter(
    (col) => col.id.startsWith("trait:") || col.id.startsWith("group:dog:"),
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
              setOpenedSpecies(null);
              setCollectionBreeds([]);
              setSpeciesBreeds([]);
              setOtherPets([]);
              setQuery("");
            }}
          >
            <Icon size={14} className="inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {(openedCollection || openedSpecies) && (
        <button
          type="button"
          className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => {
            setOpenedCollection(null);
            setOpenedSpecies(null);
            setCollectionBreeds([]);
            setSpeciesBreeds([]);
          }}
        >
          <ChevronLeft size={16} />
          Retour à la recherche
        </button>
      )}

      {!openedCollection && !openedSpecies && (
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
              tab === "dog"
                ? "Labrador, Berger, Husky…"
                : tab === "cat"
                  ? "Persan, Siamois, Maine Coon…"
                  : tab === "species"
                    ? "Rechercher une espèce…"
                    : tab === "behavior"
                      ? "Rechercher un comportement…"
                      : "Filtrer…"
            }
            className="input w-full pl-10"
          />
        </div>
      )}

      <div className="min-h-[200px] space-y-2">
        {tab === "dog" &&
          dogResults.map((item) => (
            <ResultRow key={item.id} title={item.title} subtitle={item.subtitle}
              coverUrl={item.coverUrl} selected={isSelected(item.id)} onAdd={() => addItem(item)} />
          ))}

        {tab === "cat" &&
          catResults.map((item) => (
            <ResultRow key={item.id} title={item.title} subtitle={item.subtitle}
              coverUrl={item.coverUrl} selected={isSelected(item.id)} onAdd={() => addItem(item)} />
          ))}

        {tab === "species" && !openedSpecies &&
          (speciesResults as unknown as ContentEntity[]).map((entity) => (
            <button
              key={entity.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openSpecies(entity)}
            >
              <div className="w-12 h-12 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center text-lg">
                {entity.metadata?.species === "cat" ? "🐱" : "🐶"}
              </div>
              <div>
                <p className="font-semibold">{entity.name}</p>
                <p className="text-xs text-[color:var(--muted)]">
                  {entity.fanCount ?? 0} races
                </p>
              </div>
            </button>
          ))}

        {tab === "species" && openedSpecies && (
          <>
            <p className="text-sm font-medium">{openedSpecies.name}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {speciesBreeds.map((item) => (
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

        {tab === "behavior" && !openedCollection &&
          behaviorCollections.map((col) => (
            <button
              key={col.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openCollection(col)}
            >
              <div className="w-12 h-12 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center text-lg">
                {col.id.startsWith("group:") ? "🐕" : "💛"}
              </div>
              <div>
                <p className="font-semibold">{col.title}</p>
                <p className="text-xs text-[color:var(--muted)]">Voir les races</p>
              </div>
            </button>
          ))}

        {tab === "behavior" && openedCollection && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedCollection.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {collectionBreeds.map((item) => (
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

        {isOtherSpecies(tab) && otherPetsLoading && (
          <p className="text-sm text-[color:var(--muted)]">Chargement…</p>
        )}
        {isOtherSpecies(tab) && !otherPetsLoading && otherPets.length === 0 && query && (
          <p className="text-sm text-[color:var(--muted)]">Aucun résultat.</p>
        )}
        {isOtherSpecies(tab) && otherPets.map((item) => (
          <ResultRow
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            coverUrl={item.coverUrl}
            selected={isSelected(item.id)}
            onAdd={() => addItem(item)}
          />
        ))}

        {(dogLoading || catLoading || behaviorLoading || speciesLoading) && (
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
        <Image
          src={coverUrl}
          alt=""
          width={48}
          height={48}
          className="rounded object-cover shrink-0 bg-[color:var(--surface-2)] h-12 w-12"
        />
      ) : (
        <div className="w-12 h-12 rounded bg-[color:var(--surface-2)] shrink-0" />
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
