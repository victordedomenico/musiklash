"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Plus, X, ChevronLeft, Check, BookOpen, Star, MoonStar, Building2 } from "lucide-react";
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

type Tab = "sourate" | "juz" | "prophete" | "mosquee";

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
    source: "islamklash",
    metadata: item.metadata,
  };
}

export default function IslamPicker({ size, selected, onChange, freeMode = false }: Props) {
  const [tab, setTab] = useState<Tab>("sourate");
  const [query, setQuery] = useState("");
  const [openedJuz, setOpenedJuz] = useState<ContentCollection | null>(null);
  const [juzSurahs, setJuzSurahs] = useState<ContentItem[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: surateResults, loading: surateLoading } = useDebouncedSearch(
    "/api/content/search?kind=sourate",
    query,
    tab === "sourate",
  );

  const { results: juzResults, loading: juzLoading } = useDebouncedSearch(
    "/api/content/search?kind=collections",
    query,
    tab === "juz" && !openedJuz,
  );

  const { results: propheteResults, loading: propheteLoading } = useDebouncedSearch(
    "/api/content/search?kind=prophete",
    query,
    tab === "prophete",
  );

  const { results: mosqueeResults, loading: mosqueeLoading } = useDebouncedSearch(
    "/api/content/search?kind=mosquee",
    query,
    tab === "mosquee",
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
    if (!openedJuz) return;
    setDrillLoading(true);
    setJuzSurahs([]);
    fetch(`/api/content/collection/${openedJuz.id}/items`)
      .then((r) => r.json())
      .then((json) => setJuzSurahs(json.items ?? json.results ?? []))
      .catch(console.error)
      .finally(() => setDrillLoading(false));
  }, [openedJuz]);

  const tabs: { key: Tab; label: string; icon: typeof BookOpen }[] = [
    { key: "sourate", label: "Sourates", icon: BookOpen },
    { key: "juz", label: "Juz'", icon: MoonStar },
    { key: "prophete", label: "Prophètes", icon: Star },
    { key: "mosquee", label: "Mosquées", icon: Building2 },
  ];

  const placeholders: Record<Tab, string> = {
    sourate: "Rechercher une sourate (ex: Al-Fatiha, La Vache…)",
    juz: "Rechercher un Juz' (ex: Juz' 30)…",
    prophete: "Rechercher un prophète (ex: Musa, Ibrahim…)",
    mosquee: "Rechercher une mosquée (ex: Kaaba, Al-Aqsa…)",
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
              setOpenedJuz(null);
              setJuzSurahs([]);
              setQuery("");
            }}
          >
            <Icon size={14} className="inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {openedJuz && (
        <button
          type="button"
          className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => {
            setOpenedJuz(null);
            setJuzSurahs([]);
          }}
        >
          <ChevronLeft size={16} />
          Retour aux Juz'
        </button>
      )}

      {!openedJuz && (
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

      <div className="min-h-[200px] space-y-2">
        {tab === "sourate" &&
          surateResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "prophete" &&
          propheteResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "mosquee" &&
          mosqueeResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "juz" && !openedJuz &&
          (juzResults as unknown as ContentCollection[]).map((juz) => (
            <button
              key={juz.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => {
                setDrillLoading(true);
                setOpenedJuz(juz);
              }}
            >
              <div className="w-12 h-12 rounded-md bg-[color:var(--surface-2)] flex items-center justify-center">
                <MoonStar size={20} className="text-[color:var(--muted)]" />
              </div>
              <div>
                <p className="font-semibold">{juz.title}</p>
                <p className="text-xs text-[color:var(--muted)]">Voir les sourates du {juz.title}</p>
              </div>
              <ChevronLeft size={16} className="rotate-180 text-[color:var(--muted)] ml-auto shrink-0" />
            </button>
          ))}

        {tab === "juz" && openedJuz && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedJuz.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {!drillLoading && juzSurahs.length === 0 && (
              <p className="text-sm text-[color:var(--muted)]">Aucune sourate trouvée.</p>
            )}
            {juzSurahs.map((item) => (
              <ResultRow
                key={item.id}
                title={item.title}
                subtitle={item.subtitle}
                selected={isSelected(item.id)}
                onAdd={() => addItem(item)}
              />
            ))}
          </>
        )}

        {(surateLoading || juzLoading || propheteLoading || mosqueeLoading) && (
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
      <div className="w-10 h-10 rounded bg-[color:var(--surface-2)] shrink-0 flex items-center justify-center">
        <BookOpen size={16} className="text-[color:var(--muted)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{title}</p>
        {subtitle && <p className="text-xs text-[color:var(--muted)] truncate">{subtitle}</p>}
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
