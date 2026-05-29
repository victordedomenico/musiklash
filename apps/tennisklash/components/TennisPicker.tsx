"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  X,
  ChevronLeft,
  Check,
  Swords,
  Trophy,
  User,
  Layers,
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

type Tab = "match" | "tournament" | "player" | "surface";

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
  const active = enabled && (trimmed.length > 0 || endpoint.includes("kind=surface"));

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
    source: "thesportsdb",
    metadata: { itemKind: item.metadata?.itemKind ?? "match", ...item.metadata },
  };
}

export default function TennisPicker({ size, selected, onChange, freeMode = false }: Props) {
  const [tab, setTab] = useState<Tab>("player");
  const [query, setQuery] = useState("");
  const [openedTournament, setOpenedTournament] = useState<ContentCollection | null>(null);
  const [openedPlayer, setOpenedPlayer] = useState<ContentEntity | null>(null);
  const [tournamentMatches, setTournamentMatches] = useState<ContentItem[]>([]);
  const [playerMatches, setPlayerMatches] = useState<ContentItem[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results: matchResults, loading: matchLoading } = useDebouncedSearch(
    "/api/content/search?kind=match",
    query,
    tab === "match",
  );

  const { results: tournamentResults, loading: tournamentLoading } = useDebouncedSearch(
    "/api/content/search?kind=collections",
    query,
    tab === "tournament" && !openedTournament,
  );

  const { results: playerResults, loading: playerLoading } = useDebouncedSearch(
    "/api/content/search?kind=player",
    query,
    tab === "player" && !openedPlayer,
  );

  const { results: surfaceResults, loading: surfaceLoading } = useDebouncedSearch(
    "/api/content/search?kind=surface",
    query,
    tab === "surface",
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

  const openTournament = async (col: ContentCollection) => {
    setOpenedTournament(col);
    setOpenedPlayer(null);
    setDrillLoading(true);
    setTournamentMatches([]);
    try {
      const res = await fetch(`/api/content/collection/${col.id}/items`);
      const json = await res.json();
      setTournamentMatches(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const openPlayer = async (entity: ContentEntity) => {
    setOpenedPlayer(entity);
    setOpenedTournament(null);
    setDrillLoading(true);
    setPlayerMatches([]);
    try {
      const res = await fetch(`/api/content/entity/${entity.id}/items?limit=50`);
      const json = await res.json();
      setPlayerMatches(json.items ?? json.results ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setDrillLoading(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Swords }[] = [
    { key: "player", label: "Joueurs", icon: User },
    { key: "match", label: "Matchs", icon: Swords },
    { key: "tournament", label: "Tournois", icon: Trophy },
    { key: "surface", label: "Surfaces", icon: Layers },
  ];

  const playerEntities = playerResults;

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
              setOpenedTournament(null);
              setOpenedPlayer(null);
              setTournamentMatches([]);
              setPlayerMatches([]);
              setQuery("");
            }}
          >
            <Icon size={14} className="inline mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {(openedTournament || openedPlayer) && (
        <button
          type="button"
          className="btn-ghost text-sm inline-flex items-center gap-1"
          onClick={() => {
            setOpenedTournament(null);
            setOpenedPlayer(null);
            setTournamentMatches([]);
            setPlayerMatches([]);
          }}
        >
          <ChevronLeft size={16} />
          Retour à la recherche
        </button>
      )}

      {!openedTournament && !openedPlayer && tab !== "surface" && (
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
              tab === "match"
                ? "Rechercher un match…"
                : tab === "tournament"
                  ? "Rechercher un tournoi (ATP, WTA…)…"
                  : "Rechercher un joueur…"
            }
            className="input w-full pl-10"
          />
        </div>
      )}

      <div className="min-h-[200px] space-y-2">
        {tab === "match" &&
          matchResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {tab === "player" && !openedPlayer &&
          playerEntities.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() =>
                void openPlayer({
                  id: item.id,
                  name: item.title,
                  pictureUrl: item.coverUrl,
                  source: "thesportsdb",
                })
              }
            >
              {item.coverUrl ? (
                <Image
                  src={item.coverUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[color:var(--surface-2)]" />
              )}
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-[color:var(--muted)]">{item.subtitle ?? "Voir les matchs"}</p>
              </div>
            </button>
          ))}

        {tab === "player" && openedPlayer && (
          <>
            <p className="text-sm font-medium">{openedPlayer.name}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {playerMatches.map((item) => (
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

        {tab === "tournament" && !openedTournament &&
          (tournamentResults as unknown as ContentCollection[]).map((col) => (
            <button
              key={col.id}
              type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openTournament(col)}
            >
              {col.coverUrl ? (
                <Image src={col.coverUrl} alt="" width={48} height={48} className="rounded-md object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-md bg-[color:var(--surface-2)] flex items-center justify-center">
                  <Trophy size={20} className="text-[color:var(--muted)]" />
                </div>
              )}
              <div>
                <p className="font-semibold">{col.title}</p>
                <p className="text-xs text-[color:var(--muted)]">Voir les matchs</p>
              </div>
            </button>
          ))}

        {tab === "tournament" && openedTournament && (
          <>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedTournament.title}</p>
            {drillLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {tournamentMatches.map((item) => (
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

        {tab === "surface" &&
          surfaceResults.map((item) => (
            <ResultRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              coverUrl={item.coverUrl}
              selected={isSelected(item.id)}
              onAdd={() => addItem(item)}
            />
          ))}

        {(matchLoading || tournamentLoading || playerLoading || surfaceLoading) && (
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
        <Image src={coverUrl} alt="" width={40} height={40} className="rounded object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded bg-[color:var(--surface-2)] shrink-0" />
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
