"use client";

import { useEffect, useState } from "react";
import { Search, Plus, X, Disc3, User, Music } from "lucide-react";
import type { DeezerTrack, DeezerAlbum, DeezerArtist } from "@/lib/deezer";
import type { SmashPassItemType } from "@/lib/smash-pass";
import type { SmashPassItemInput } from "@/app/create-smash-pass/actions";

const MIN_ITEMS = 5;
const MAX_ITEMS = 100;

function useDebouncedSearch<T>(
  endpoint: string,
  query: string,
  enabled: boolean,
): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !enabled) {
      setData([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${endpoint}?q=${encodeURIComponent(trimmed)}`,
          { signal: ctrl.signal },
        );
        const json = await res.json();
        setData(json.data ?? []);
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

  return { data: query.trim() ? data : [], loading };
}

type Props = {
  itemType: SmashPassItemType;
  selected: SmashPassItemInput[];
  onChange: (next: SmashPassItemInput[]) => void;
};

export default function SmashPassItemPicker({ itemType, selected, onChange }: Props) {
  const [query, setQuery] = useState("");
  const canAdd = selected.length < MAX_ITEMS;

  const trackSearch = useDebouncedSearch<DeezerTrack>(
    "/api/deezer/search",
    query,
    itemType === "track",
  );
  const albumSearch = useDebouncedSearch<DeezerAlbum>(
    "/api/deezer/search/album",
    query,
    itemType === "album",
  );
  const artistSearch = useDebouncedSearch<DeezerArtist>(
    "/api/deezer/search/artist",
    query,
    itemType === "artist",
  );

  const loading =
    itemType === "track"
      ? trackSearch.loading
      : itemType === "album"
        ? albumSearch.loading
        : artistSearch.loading;

  const isSelected = (deezerId: number) =>
    selected.some((s) => s.deezer_id === deezerId);

  const addItem = (item: SmashPassItemInput) => {
    if (!canAdd || isSelected(item.deezer_id)) return;
    onChange([...selected, item]);
  };

  const remove = (deezerId: number) =>
    onChange(selected.filter((s) => s.deezer_id !== deezerId));

  const addTrack = (t: DeezerTrack) => {
    addItem({
      deezer_id: t.id,
      title: t.title,
      subtitle: t.artist.name,
      cover_url: t.album.cover_medium ?? t.album.cover_small ?? null,
      preview_url: t.preview || null,
      tags: [],
      description: null,
    });
  };

  const addAlbum = (a: DeezerAlbum) => {
    const tags: string[] = [];
    if (a.nb_tracks) tags.push(`${a.nb_tracks} titres`);
    if (a.release_date) tags.push(a.release_date.slice(0, 4));
    addItem({
      deezer_id: a.id,
      title: a.title,
      subtitle: a.artist?.name ?? null,
      cover_url: a.cover_medium ?? a.cover_small ?? null,
      preview_url: null,
      tags,
      description: null,
    });
  };

  const addArtist = (a: DeezerArtist) => {
    const tags: string[] = [];
    if (a.nb_fan) tags.push(`${Math.round(a.nb_fan / 1000)}K fans`);
    if (a.nb_album) tags.push(`${a.nb_album} albums`);
    addItem({
      deezer_id: a.id,
      title: a.name,
      subtitle: null,
      cover_url: a.picture_medium ?? a.picture_small ?? null,
      preview_url: null,
      tags,
      description: null,
    });
  };

  const typeLabel =
    itemType === "track" ? "morceau" : itemType === "album" ? "album" : "artiste";

  const icon =
    itemType === "track" ? Music : itemType === "album" ? Disc3 : User;

  const Icon = icon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <label className="text-sm font-medium flex items-center gap-2">
          <Icon size={16} />
          Rechercher un {typeLabel}
        </label>
        <div className="relative mt-2">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Nom du ${typeLabel}…`}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] py-2.5 pl-9 pr-3 text-sm"
          />
        </div>

        <ul className="mt-3 max-h-[400px] overflow-y-auto space-y-2">
          {loading && (
            <li className="text-sm text-[color:var(--muted)] py-4 text-center">
              Recherche…
            </li>
          )}
          {!loading && itemType === "track" &&
            trackSearch.data.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={!canAdd || isSelected(t.id)}
                  onClick={() => addTrack(t)}
                  className="card w-full flex items-center gap-3 p-2 text-left disabled:opacity-50 hover:border-[color:var(--accent)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.album.cover_small ?? ""}
                    alt=""
                    className="h-12 w-12 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.title}</p>
                    <p className="truncate text-xs text-[color:var(--muted)]">
                      {t.artist.name}
                    </p>
                  </div>
                  <Plus size={18} className="shrink-0 text-[color:var(--accent)]" />
                </button>
              </li>
            ))}
          {!loading && itemType === "album" &&
            albumSearch.data.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  disabled={!canAdd || isSelected(a.id)}
                  onClick={() => addAlbum(a)}
                  className="card w-full flex items-center gap-3 p-2 text-left disabled:opacity-50 hover:border-[color:var(--accent)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.cover_small ?? ""}
                    alt=""
                    className="h-12 w-12 rounded-md object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="truncate text-xs text-[color:var(--muted)]">
                      {a.artist?.name}
                    </p>
                  </div>
                  <Plus size={18} className="shrink-0 text-[color:var(--accent)]" />
                </button>
              </li>
            ))}
          {!loading && itemType === "artist" &&
            artistSearch.data.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  disabled={!canAdd || isSelected(a.id)}
                  onClick={() => addArtist(a)}
                  className="card w-full flex items-center gap-3 p-2 text-left disabled:opacity-50 hover:border-[color:var(--accent)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.picture_small ?? ""}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.name}</p>
                  </div>
                  <Plus size={18} className="shrink-0 text-[color:var(--accent)]" />
                </button>
              </li>
            ))}
        </ul>
      </div>

      <div>
        <label className="text-sm font-medium">
          Sélection ({selected.length}) — min. {MIN_ITEMS}
        </label>
        <ul className="mt-2 max-h-[520px] overflow-y-auto space-y-2">
          {selected.map((item, i) => (
            <li key={item.deezer_id} className="card flex items-center gap-3 p-2">
              <div className="w-6 text-center text-sm font-bold text-[color:var(--muted)]">
                #{i + 1}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.cover_url ?? ""}
                alt=""
                className={`h-12 w-12 object-cover bg-[color:var(--surface-2)] ${
                  itemType === "artist" ? "rounded-full" : "rounded-md"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.title}</p>
                {item.subtitle ? (
                  <p className="truncate text-xs text-[color:var(--muted)]">
                    {item.subtitle}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => remove(item.deezer_id)}
                className="btn-ghost btn-xs px-2"
                aria-label="Retirer"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
