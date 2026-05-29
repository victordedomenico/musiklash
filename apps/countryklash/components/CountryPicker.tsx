"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  Check,
  Globe2,
  Map,
  Flag,
  Landmark,
  Languages,
  MapPin,
} from "lucide-react";
import type { ContentCollection, ContentItem } from "@klash/content-adapter";
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

type Tab = "country" | "capital" | "flag" | "culture" | "region" | "place";

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
    source: item.source ?? "restcountries",
    metadata: { itemKind: item.metadata?.itemKind ?? "country", ...item.metadata },
  };
}

export default function CountryPicker({ size, selected, onChange, freeMode = false }: Props) {
  const [tab, setTab] = useState<Tab>("country");
  const [query, setQuery] = useState("");
  const [openedRegion, setOpenedRegion] = useState<ContentCollection | null>(null);
  const [regionCountries, setRegionCountries] = useState<ContentItem[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: countryResults, loading: countryLoading } = useDebouncedSearch(
    "/api/content/search?kind=items",
    query,
    tab === "country",
  );

  const { results: capitalResults, loading: capitalLoading } = useDebouncedSearch(
    "/api/content/search?kind=capital",
    query,
    tab === "capital",
  );

  const { results: flagResults, loading: flagLoading } = useDebouncedSearch(
    "/api/content/search?kind=flag",
    query,
    tab === "flag",
  );

  const { results: cultureResults, loading: cultureLoading } = useDebouncedSearch(
    "/api/content/search?kind=culture",
    query,
    tab === "culture",
  );

  const { results: regionResults, loading: regionLoading } = useDebouncedSearch(
    "/api/content/search?kind=collections",
    query,
    tab === "region" && !openedRegion,
  );

  const { results: placeResults, loading: placeLoading } = useDebouncedSearch(
    "/api/content/search?kind=place",
    query,
    tab === "place",
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

  const openRegion = async (col: ContentCollection) => {
    setOpenedRegion(col);
    setDrillLoading(true);
    setRegionCountries([]);
    try {
      const res = await fetch(`/api/content/collection/${col.id}/items`);
      const json = await res.json();
      setRegionCountries(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Globe2 }[] = [
    { key: "country", label: "Pays", icon: Globe2 },
    { key: "capital", label: "Capitales", icon: Landmark },
    { key: "flag", label: "Drapeaux", icon: Flag },
    { key: "culture", label: "Cultures", icon: Languages },
    { key: "region", label: "Régions", icon: Map },
    { key: "place", label: "Lieux", icon: MapPin },
  ];

  const activeResults =
    tab === "country"
      ? countryResults
      : tab === "capital"
        ? capitalResults
        : tab === "flag"
          ? flagResults
          : tab === "culture"
            ? cultureResults
            : tab === "place"
              ? placeResults
              : [];

  const loading =
    countryLoading || capitalLoading || flagLoading || cultureLoading || regionLoading || placeLoading;

  const regionCollections = regionResults as unknown as ContentCollection[];

  const placeholders: Record<Tab, string> = {
    country: "Rechercher un pays…",
    capital: "Rechercher une capitale…",
    flag: "Rechercher un drapeau (via pays)…",
    culture: "Rechercher une langue ou culture…",
    region: "Rechercher une région…",
    place: "Rechercher un lieu (Wikidata)…",
  };

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
              setOpenedRegion(null);
              setRegionCountries([]);
              setQuery("");
            }}
          >
            <Icon size={14} className="inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {openedRegion && (
        <button
          type="button"
          className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => {
            setOpenedRegion(null);
            setRegionCountries([]);
          }}
        >
          <ChevronLeft size={16} />
          Retour à la recherche
        </button>
      )}

      {!openedRegion && (
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
            placeholder={placeholders[tab]}
            className="input w-full pl-10"
          />
        </div>
      )}

      {tab === "place" && !query.trim() && (
        <p className="text-xs text-[color:var(--muted)]">
          Lieux enrichis via Wikidata (API ouverte, sans clé).
        </p>
      )}

      <div className="min-h-[200px] space-y-2">
        {tab !== "region" &&
          activeResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "region" && !openedRegion &&
          regionCollections.map((col) => (
            <button
              key={col.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openRegion(col)}
            >
              <div className="w-12 h-12 rounded-md bg-[color:var(--surface-2)] flex items-center justify-center text-xl">
                🌍
              </div>
              <div>
                <p className="font-semibold">{col.title}</p>
                <p className="text-xs text-[color:var(--muted)]">Voir les pays</p>
              </div>
            </button>
          ))}

        {tab === "region" && openedRegion && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedRegion.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {regionCountries.map((item) => (
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

        {loading && <p className="text-sm text-[color:var(--muted)]">Recherche…</p>}
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
          height={32}
          className="rounded object-cover shrink-0 bg-[color:var(--surface-2)]"
        />
      ) : (
        <div className="w-12 h-8 rounded bg-[color:var(--surface-2)] shrink-0" />
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
