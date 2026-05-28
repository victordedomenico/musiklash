"use client";

import { useEffect, useState } from "react";
import { Search, Plus, X, Tv, User } from "lucide-react";
import Image from "next/image";
import type { SmashPassItemType } from "@/lib/smash-pass";
import type { SmashPassItemInput } from "@/app/create-smash-pass/actions";
import { withSearchQuery } from "@/lib/api-url";

const MIN_ITEMS = 5;
const MAX_ITEMS = 100;

type AnimeResult = { id: number; title: string; coverUrl: string | null; format?: string };
type CharResult = { id: number; name: string; imageUrl: string | null; animes: string[] };

function useDebouncedSearch<T>(endpoint: string, query: string, enabled: boolean) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !enabled) { setData([]); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(withSearchQuery(endpoint, trimmed), { signal: ctrl.signal });
        const json = await res.json();
        setData(json.data ?? []);
      } catch (e) {
        if ((e as { name?: string }).name !== "AbortError") console.error(e);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [query, endpoint, enabled]);

  return { data, loading };
}

type Props = {
  itemType: SmashPassItemType;
  selected: SmashPassItemInput[];
  onChange: (next: SmashPassItemInput[]) => void;
};

export default function SmashPassItemPicker({ itemType, selected, onChange }: Props) {
  const [query, setQuery] = useState("");
  const canAdd = selected.length < MAX_ITEMS;

  const animeSearch = useDebouncedSearch<AnimeResult>(
    "/api/anilist/search?type=anime",
    query,
    itemType === "anime",
  );
  const charSearch = useDebouncedSearch<CharResult>(
    "/api/anilist/search?type=character",
    query,
    itemType === "character",
  );

  const loading = itemType === "anime" ? animeSearch.loading : charSearch.loading;

  const isSelected = (id: string) => selected.some((s) => s.external_id === id);

  const addAnime = (a: AnimeResult) => {
    const id = String(a.id);
    if (!canAdd || isSelected(id)) return;
    onChange([...selected, {
      external_id: id,
      title: a.title,
      subtitle: a.format ?? undefined,
      cover_url: a.coverUrl,
      preview_url: null,
      source: "anilist",
      metadata: { itemKind: "anime", anilistId: a.id },
      tags: [],
      description: null,
    }]);
  };

  const addChar = (c: CharResult) => {
    const id = `char-${c.id}`;
    if (!canAdd || isSelected(id)) return;
    onChange([...selected, {
      external_id: id,
      title: c.name,
      subtitle: c.animes[0] ?? undefined,
      cover_url: c.imageUrl,
      preview_url: null,
      source: "anilist",
      metadata: { itemKind: "character", anilistCharacterId: c.id },
      tags: [],
      description: null,
    }]);
  };

  const remove = (id: string) => onChange(selected.filter((s) => s.external_id !== id));

  const Icon = itemType === "anime" ? Tv : User;
  const label = itemType === "anime" ? "animé" : "personnage";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <label className="text-sm font-medium flex items-center gap-2">
          <Icon size={16} />
          Rechercher un {label}
        </label>
        <div className="relative mt-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Nom du ${label}…`}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] py-2.5 pl-9 pr-3 text-sm"
          />
        </div>

        <ul className="mt-3 max-h-[400px] overflow-y-auto space-y-2">
          {loading && <li className="text-sm text-[color:var(--muted)] py-4 text-center">Recherche…</li>}
          {!loading && itemType === "anime" && animeSearch.data.map((a) => {
            const id = String(a.id);
            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={!canAdd || isSelected(id)}
                  onClick={() => addAnime(a)}
                  className="card w-full flex items-center gap-3 p-2 text-left disabled:opacity-50 hover:border-[color:var(--accent)]"
                >
                  {a.coverUrl && (
                    <div className="h-12 w-10 flex-shrink-0 relative">
                      <Image src={a.coverUrl} alt="" fill className="object-cover rounded-md" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.title}</p>
                    {a.format && <p className="truncate text-xs text-[color:var(--muted)]">{a.format}</p>}
                  </div>
                  <Plus size={18} className="shrink-0 text-[color:var(--accent)]" />
                </button>
              </li>
            );
          })}
          {!loading && itemType === "character" && charSearch.data.map((c) => {
            const id = `char-${c.id}`;
            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={!canAdd || isSelected(id)}
                  onClick={() => addChar(c)}
                  className="card w-full flex items-center gap-3 p-2 text-left disabled:opacity-50 hover:border-[color:var(--accent)]"
                >
                  {c.imageUrl && (
                    <div className="h-12 w-12 flex-shrink-0 relative">
                      <Image src={c.imageUrl} alt="" fill className="object-cover rounded-full" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    {c.animes[0] && <p className="truncate text-xs text-[color:var(--muted)]">{c.animes[0]}</p>}
                  </div>
                  <Plus size={18} className="shrink-0 text-[color:var(--accent)]" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <label className="text-sm font-medium">
          Sélection ({selected.length}) — min. {MIN_ITEMS}
        </label>
        <ul className="mt-2 max-h-[520px] overflow-y-auto space-y-2">
          {selected.map((item, i) => (
            <li key={item.external_id} className="card flex items-center gap-3 p-2">
              <div className="w-6 text-center text-sm font-bold text-[color:var(--muted)]">#{i + 1}</div>
              {item.cover_url && (
                <div className={`h-12 w-12 flex-shrink-0 relative`}>
                  <Image
                    src={item.cover_url}
                    alt=""
                    fill
                    className={`object-cover bg-[color:var(--surface-2)] ${itemType === "character" ? "rounded-full" : "rounded-md"}`}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.title}</p>
                {item.subtitle && <p className="truncate text-xs text-[color:var(--muted)]">{item.subtitle}</p>}
              </div>
              <button type="button" onClick={() => remove(item.external_id)} className="btn-ghost btn-xs px-2" aria-label="Retirer">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
