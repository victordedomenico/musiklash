"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Plus, X, ChevronLeft, Check, User, Sparkles, Film, Globe, Tv } from "lucide-react";
import Image from "next/image";
import type { ContentItem } from "@klash/content-adapter";
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

type Tab = "hero" | "character" | "pokemon" | "movie" | "series" | "universe";

type Props = {
  size: number;
  selected: SelectedItem[];
  onChange: (next: SelectedItem[]) => void;
  freeMode?: boolean;
  tabs?: Tab[];
};

const TAB_META: Record<Tab, { label: string; icon: typeof User; placeholder: string; kind?: string }> = {
  hero:      { label: "Héros / Comics", icon: Sparkles, placeholder: "Superman, Thanos, Spider-Man…", kind: "hero" },
  character: { label: "Perso d'animé",  icon: User,     placeholder: "Goku, Naruto, Luffy…",          kind: "character" },
  pokemon:   { label: "Pokémon",        icon: Sparkles, placeholder: "Pikachu, Dracaufeu…",           kind: "pokemon" },
  movie:     { label: "Films",          icon: Film,     placeholder: "Harry Potter, Star Wars…",      kind: "movie" },
  series:    { label: "Séries",         icon: Tv,       placeholder: "Breaking Bad, Game of Thrones…", kind: "series" },
  universe:  { label: "Univers",        icon: Globe,    placeholder: "Marvel, DC, Star Wars…" },
};

function useDebouncedSearch(endpoint: string, query: string, enabled: boolean) {
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

function itemToSelected(item: ContentItem): SelectedItem {
  return {
    external_id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    cover_url: item.coverUrl ?? null,
    preview_url: null,
    source: item.source,
    metadata: { itemKind: item.metadata?.itemKind ?? "character", ...item.metadata },
  };
}

export default function CharacterPicker({
  size, selected, onChange, freeMode = false,
  tabs = ["hero", "character", "pokemon", "movie", "series", "universe"],
}: Props) {
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Drill-down state (movie → cast, universe → publisher roster)
  const [opened, setOpened] = useState<ContentItem | null>(null);
  const [drillItems, setDrillItems] = useState<ContentItem[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  const searchKind = TAB_META[tab].kind;
  const { results, loading } = useDebouncedSearch(
    `/api/content/search?kind=${searchKind ?? "items"}`,
    query,
    Boolean(searchKind) && !opened,
  );

  // Universe tab: publisher list fetched via collections
  const { results: universeResults, loading: universeLoading } = useDebouncedSearch(
    "/api/content/search?kind=collections",
    tab === "universe" ? (query || "comics") : "",
    tab === "universe" && !opened,
  );

  const max = freeMode ? Infinity : size;
  const isSelected = (id: string) => selected.some((s) => s.external_id === id);
  const addItem = (item: ContentItem) => {
    if (selected.length >= max || isSelected(item.id)) return;
    onChange([...selected, itemToSelected(item)]);
  };
  const removeItem = (id: string) => onChange(selected.filter((s) => s.external_id !== id));

  const openDrill = async (item: ContentItem, collectionId: string) => {
    setOpened(item);
    setDrillLoading(true);
    setDrillItems([]);
    try {
      const res = await fetch(`/api/content/collection/${encodeURIComponent(collectionId)}/items`);
      const json = await res.json();
      setDrillItems(json.items ?? json.results ?? []);
    } catch (e) { console.error(e); }
    finally { setDrillLoading(false); }
  };

  const meta = TAB_META[tab];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = TAB_META[t].icon;
          return (
            <button key={t} type="button" className="btn-chip" data-active={tab === t}
              onClick={() => { setTab(t); setQuery(""); setOpened(null); setDrillItems([]); }}>
              <Icon size={14} className="inline mr-1.5 -mt-0.5" />
              {TAB_META[t].label}
            </button>
          );
        })}
      </div>

      {opened && (
        <button type="button" className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => { setOpened(null); setDrillItems([]); }}>
          <ChevronLeft size={16} /> Retour à la recherche
        </button>
      )}

      {!opened && (
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
          <input ref={inputRef} type="search" value={query}
            onChange={(e) => setQuery(e.target.value)} placeholder={meta.placeholder}
            className="input w-full pl-10" />
        </div>
      )}

      <div className="min-h-[200px] space-y-2">
        {!opened && (tab === "hero" || tab === "character" || tab === "pokemon") &&
          results.map((item) => (
            <ResultRow key={item.id} item={item} selected={isSelected(item.id)} onAdd={() => addItem(item)} round />
          ))}

        {!opened && tab === "movie" &&
          results.map((item) => (
            <DrillRow key={item.id} item={item} subtitle="Voir les personnages"
              onClick={() => void openDrill(item, item.id)} icon={<Film size={18} />} />
          ))}

        {!opened && tab === "series" &&
          results.map((item) => (
            <DrillRow key={item.id} item={item} subtitle="Voir les personnages"
              onClick={() => void openDrill(item, item.id)} icon={<Tv size={18} />} />
          ))}

        {!opened && tab === "universe" &&
          (universeResults as ContentItem[]).map((item) => (
            <DrillRow key={item.id} item={item} subtitle="Voir les personnages"
              onClick={() => void openDrill(item, item.id)} icon={<Globe size={18} />} />
          ))}

        {opened && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{opened.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {!drillLoading && drillItems.length === 0 && (
              <p className="text-sm text-[color:var(--muted)]">Aucun personnage trouvé.</p>
            )}
            {drillItems.map((item) => (
              <ResultRow key={item.id} item={item} selected={isSelected(item.id)} onAdd={() => addItem(item)} round />
            ))}
          </>
        )}

        {(loading || universeLoading) && !opened && (
          <p className="text-sm text-[color:var(--muted)]">Recherche…</p>
        )}
      </div>

      {selected.length > 0 && (
        <div className="space-y-2 border-t border-[color:var(--border)] pt-4">
          <p className="text-sm font-medium">Sélection ({selected.length}{!freeMode ? ` / ${size}` : ""})</p>
          <ul className="flex flex-wrap gap-2">
            {selected.map((item) => (
              <li key={item.external_id}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-sm">
                <span className="max-w-[180px] truncate">{item.title}</span>
                <button type="button" aria-label={`Retirer ${item.title}`}
                  onClick={() => removeItem(item.external_id)}
                  className="text-[color:var(--muted)] hover:text-[color:var(--foreground)]">
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

function ResultRow({ item, selected, onAdd, round }: {
  item: ContentItem; selected: boolean; onAdd: () => void; round?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3">
      {item.coverUrl ? (
        <Image src={item.coverUrl} alt="" width={44} height={44}
          className={`${round ? "rounded-full" : "rounded"} object-cover shrink-0 w-11 h-11`} />
      ) : (
        <div className={`w-11 h-11 ${round ? "rounded-full" : "rounded"} bg-[color:var(--surface-2)] shrink-0`} />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{item.title}</p>
        {item.subtitle && <p className="text-xs text-[color:var(--muted)] truncate">{item.subtitle}</p>}
      </div>
      <button type="button" disabled={selected} onClick={onAdd} className="btn-ghost shrink-0 p-2"
        aria-label={selected ? "Déjà sélectionné" : `Ajouter ${item.title}`}>
        {selected ? <Check size={18} className="text-[color:var(--accent)]" /> : <Plus size={18} />}
      </button>
    </div>
  );
}

function DrillRow({ item, subtitle, onClick, icon }: {
  item: ContentItem; subtitle: string; onClick: () => void; icon?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]">
      {item.coverUrl ? (
        <Image src={item.coverUrl} alt="" width={40} height={56} className="rounded object-cover shrink-0" />
      ) : (
        <div className="w-10 h-14 rounded bg-[color:var(--surface-2)] shrink-0 flex items-center justify-center text-[color:var(--muted)]">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{item.title}</p>
        <p className="text-xs text-[color:var(--muted)]">{subtitle}</p>
      </div>
      <ChevronLeft size={16} className="rotate-180 text-[color:var(--muted)] shrink-0" />
    </button>
  );
}
