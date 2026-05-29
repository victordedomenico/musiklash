"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  Check,
  Dumbbell,
  ListOrdered,
  Activity,
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

type Tab = "exercise" | "program" | "muscle";

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
    source: "wger",
    metadata: { itemKind: item.metadata?.itemKind ?? "exercise", ...item.metadata },
  };
}

export default function FitnessPicker({ size, selected, onChange, freeMode = false }: Props) {
  const [tab, setTab] = useState<Tab>("exercise");
  const [query, setQuery] = useState("");
  const [openedProgram, setOpenedProgram] = useState<ContentCollection | null>(null);
  const [openedMuscle, setOpenedMuscle] = useState<ContentEntity | null>(null);
  const [programExercises, setProgramExercises] = useState<ContentItem[]>([]);
  const [muscleExercises, setMuscleExercises] = useState<ContentItem[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: exerciseResults, loading: exerciseLoading } = useDebouncedSearch(
    "/api/content/search?kind=items",
    query,
    tab === "exercise",
  );

  const { results: programResults, loading: programLoading } = useDebouncedSearch(
    "/api/content/search?kind=collections",
    query,
    tab === "program" && !openedProgram,
  );

  const { results: muscleResults, loading: muscleLoading } = useDebouncedSearch(
    "/api/content/search?kind=entities",
    query,
    tab === "muscle" && !openedMuscle,
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
    if (!openedProgram) return;
    setDrillLoading(true);
    fetch(`/api/content/collection/${openedProgram.id}/items`)
      .then((r) => r.json())
      .then((json) => setProgramExercises(json.items ?? json.results ?? []))
      .catch(console.error)
      .finally(() => setDrillLoading(false));
  }, [openedProgram]);

  useEffect(() => {
    if (!openedMuscle) return;
    setDrillLoading(true);
    fetch(`/api/content/entity/${openedMuscle.id}/items?limit=50`)
      .then((r) => r.json())
      .then((json) => setMuscleExercises(json.items ?? json.results ?? []))
      .catch(console.error)
      .finally(() => setDrillLoading(false));
  }, [openedMuscle]);

  const tabs: { key: Tab; label: string; icon: typeof Dumbbell }[] = [
    { key: "exercise", label: "Exercices", icon: Dumbbell },
    { key: "program", label: "Programmes", icon: ListOrdered },
    { key: "muscle", label: "Muscles", icon: Activity },
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
              setOpenedProgram(null);
              setOpenedMuscle(null);
              setQuery("");
            }}
          >
            <Icon size={14} className="inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {(openedProgram || openedMuscle) && (
        <button
          type="button"
          className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => {
            setOpenedProgram(null);
            setOpenedMuscle(null);
          }}
        >
          <ChevronLeft size={16} />
          Retour à la recherche
        </button>
      )}

      {!openedProgram && !openedMuscle && (
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
              tab === "exercise"
                ? "Rechercher un exercice…"
                : tab === "program"
                  ? "Rechercher un programme…"
                  : "Rechercher un muscle…"
            }
            className="input w-full pl-10"
          />
        </div>
      )}

      <div className="min-h-[200px] space-y-2">
        {tab === "exercise" &&
          exerciseResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "program" &&
          !openedProgram &&
          (programResults as unknown as ContentCollection[]).map((program) => (
            <button
              key={program.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => {
                setDrillLoading(true);
                setOpenedProgram(program);
              }}
            >
              <div className="w-12 h-12 rounded-md bg-[color:var(--surface-2)] flex items-center justify-center">
                <ListOrdered size={20} className="text-[color:var(--muted)]" />
              </div>
              <div>
                <p className="font-semibold">{program.title}</p>
                <p className="text-xs text-[color:var(--muted)]">Voir les exercices du programme</p>
              </div>
            </button>
          ))}

        {tab === "program" && openedProgram && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedProgram.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {programExercises.map((item) => (
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

        {tab === "muscle" &&
          !openedMuscle &&
          (muscleResults as unknown as ContentEntity[]).map((muscle) => (
            <button
              key={muscle.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => {
                setDrillLoading(true);
                setOpenedMuscle(muscle);
              }}
            >
              {muscle.pictureUrl ? (
                <Image
                  src={muscle.pictureUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="rounded object-contain bg-[color:var(--surface-2)]"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[color:var(--surface-2)] flex items-center justify-center">
                  <Activity size={20} className="text-[color:var(--muted)]" />
                </div>
              )}
              <div>
                <p className="font-semibold">{muscle.name}</p>
                <p className="text-xs text-[color:var(--muted)]">Exercices ciblant ce muscle</p>
              </div>
            </button>
          ))}

        {tab === "muscle" && openedMuscle && (
          <>
            <p className="text-sm font-medium">{openedMuscle.name}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {muscleExercises.map((item) => (
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

        {(exerciseLoading || programLoading || muscleLoading) && (
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
        <Image src={coverUrl} alt="" width={48} height={48} className="rounded object-cover shrink-0" />
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
