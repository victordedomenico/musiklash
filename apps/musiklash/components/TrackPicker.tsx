"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search, Plus, X, Play, Pause, ChevronLeft, Check,
  Music, Disc3, User, ListMusic,
} from "lucide-react";
import type { ContentItem, ContentCollection, ContentEntity } from "@klash/content-adapter";
import type { SelectedContentItem } from "@klash/klash-app/lib/content-item";
import { usePreviewVolume } from "@/lib/audio-volume";

type Props = {
  size: number;
  selected: SelectedContentItem[];
  onChange: (next: SelectedContentItem[]) => void;
  freeMode?: boolean;
};

type Tab = "track" | "album" | "artist" | "mb-track" | "mb-album" | "mb-artist";

function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function useDebouncedSearch<T>(
  endpoint: string,
  query: string,
  enabled: boolean,
): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !enabled) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${endpoint}&q=${encodeURIComponent(trimmed)}`,
          { signal: ctrl.signal },
        );
        const json = await res.json();
        setData(json.results ?? []);
      } catch (e) {
        if ((e as { name?: string }).name !== "AbortError") console.error(e);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [query, endpoint, enabled]);

  return { data: query.trim() ? data : [], loading };
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
      <input
        className="input pl-9"
        placeholder={placeholder ?? "Rechercher…"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function StatusLine({ loading, count }: { loading: boolean; count: number }) {
  return (
    <p className="mt-2 text-xs text-[color:var(--muted)]">
      {loading ? "Recherche…" : count > 0 ? `${count} résultats` : ""}
    </p>
  );
}

function AlbumCard({
  album,
  onClick,
  action,
}: {
  album: ContentCollection;
  onClick: () => void;
  action?: React.ReactNode;
}) {
  const artistName = str(album.metadata?.artistName);
  const nbTracks = num(album.metadata?.nbTracks);
  const releaseDate = str(album.metadata?.releaseDate);
  return (
    <li className="card flex items-center gap-3 p-2 cursor-pointer hover:bg-[color:var(--surface-2)] transition-colors" onClick={onClick}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={album.coverUrl ?? ""}
        alt=""
        className="h-12 w-12 rounded-md object-cover bg-[color:var(--surface-2)] shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{album.title}</p>
        <p className="truncate text-xs text-[color:var(--muted)]">
          {artistName}
          {nbTracks ? ` · ${nbTracks} titres` : ""}
          {releaseDate ? ` · ${releaseDate.slice(0, 4)}` : ""}
        </p>
      </div>
      {action}
      <ChevronLeft size={16} className="rotate-180 text-[color:var(--muted)] shrink-0" />
    </li>
  );
}

function AlbumTracksView({
  album,
  tracks,
  loading,
  onBack,
  isSelected,
  canAdd,
  onAddTrack,
  onAddAll,
  playingId,
  onTogglePlay,
}: {
  album: ContentCollection;
  tracks: ContentItem[];
  loading: boolean;
  onBack: () => void;
  isSelected: (id: string) => boolean;
  canAdd: boolean;
  onAddTrack: (t: ContentItem) => void;
  onAddAll: () => void;
  playingId: string | null;
  onTogglePlay: (id: string, url: string) => void;
}) {
  const addableCount = tracks.filter((t) => !isSelected(t.id)).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBack} className="btn-ghost btn-xs px-2">
          <ChevronLeft size={16} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={album.coverUrl ?? ""}
          alt=""
          className="h-8 w-8 rounded object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{album.title}</p>
          <p className="truncate text-xs text-[color:var(--muted)]">{str(album.metadata?.artistName)}</p>
        </div>
        {addableCount > 0 && canAdd && (
          <button
            type="button"
            onClick={onAddAll}
            className="btn-primary w-full justify-center text-xs sm:w-auto sm:shrink-0"
          >
            <ListMusic size={13} />
            Tout ajouter
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-[color:var(--muted)] py-4 text-center">Chargement…</p>
      ) : (
        <ul className="max-h-[400px] overflow-y-auto space-y-1.5 pr-1">
          {tracks.map((t) => {
            const picked = isSelected(t.id);
            const playing = playingId === t.id;
            const duration = num(t.metadata?.duration) ?? 0;
            return (
              <li key={t.id} className="card flex items-center gap-2 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="truncate text-xs text-[color:var(--muted)]">
                    {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onTogglePlay(t.id, t.previewUrl ?? "")}
                  className="btn-ghost btn-xs px-2"
                  disabled={!t.previewUrl}
                >
                  {playing ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() => onAddTrack(t)}
                  disabled={picked || !canAdd || !t.previewUrl}
                  className="btn-primary btn-xs px-2 disabled:opacity-40"
                >
                  {picked ? <Check size={13} /> : <Plus size={13} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TrackPicker({ size, selected, onChange, freeMode = false }: Props) {
  const [tab, setTab] = useState<Tab>("track");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { volume } = usePreviewVolume();

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    return () => {
      if (!audioRef.current) return;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    };
  }, []);

  // Track tab
  const [trackQuery, setTrackQuery] = useState("");
  const { data: trackResults, loading: trackLoading } = useDebouncedSearch<ContentItem>(
    "/api/content/search?kind=items", trackQuery, tab === "track",
  );

  // Album tab
  const [albumQuery, setAlbumQuery] = useState("");
  const { data: albumResults, loading: albumLoading } = useDebouncedSearch<ContentCollection>(
    "/api/content/search?kind=collections", albumQuery, tab === "album",
  );

  // Artist tab
  const [artistQuery, setArtistQuery] = useState("");
  const { data: artistResults, loading: artistLoading } = useDebouncedSearch<ContentEntity>(
    "/api/content/search?kind=entities", artistQuery, tab === "artist",
  );

  // Shared album-tracks view (used by both album & artist tabs)
  const [openedAlbum, setOpenedAlbum] = useState<ContentCollection | null>(null);
  const [albumTracks, setAlbumTracks] = useState<ContentItem[]>([]);
  const [albumTracksLoading, setAlbumTracksLoading] = useState(false);

  // Artist tab – discography view
  const [openedArtist, setOpenedArtist] = useState<ContentEntity | null>(null);
  const [artistAlbums, setArtistAlbums] = useState<ContentCollection[]>([]);
  const [artistAlbumsLoading, setArtistAlbumsLoading] = useState(false);

  // MusicBrainz tabs
  const [mbTrackQuery, setMbTrackQuery] = useState("");
  const [mbAlbumQuery, setMbAlbumQuery] = useState("");
  const [mbArtistQuery, setMbArtistQuery] = useState("");
  const { data: mbTrackResults, loading: mbTrackLoading } = useDebouncedSearch<ContentItem>(
    "/api/musicbrainz/search?kind=track", mbTrackQuery, tab === "mb-track",
  );
  const { data: mbAlbumResults, loading: mbAlbumLoading } = useDebouncedSearch<ContentCollection>(
    "/api/musicbrainz/search?kind=album", mbAlbumQuery, tab === "mb-album",
  );
  const { data: mbArtistResults, loading: mbArtistLoading } = useDebouncedSearch<ContentEntity>(
    "/api/musicbrainz/search?kind=artist", mbArtistQuery, tab === "mb-artist",
  );
  const [openedMbAlbum, setOpenedMbAlbum] = useState<ContentCollection | null>(null);
  const [mbAlbumTracks, setMbAlbumTracks] = useState<ContentItem[]>([]);
  const [mbAlbumTracksLoading, setMbAlbumTracksLoading] = useState(false);
  const [openedMbArtist, setOpenedMbArtist] = useState<ContentEntity | null>(null);
  const [mbArtistAlbums, setMbArtistAlbums] = useState<ContentCollection[]>([]);
  const [mbArtistAlbumsLoading, setMbArtistAlbumsLoading] = useState(false);

  const openMbAlbum = async (col: ContentCollection) => {
    const mbid = col.id.replace(/^mb-rel-/, "");
    setOpenedMbAlbum(col);
    setMbAlbumTracksLoading(true);
    setMbAlbumTracks([]);
    try {
      const res = await fetch(`/api/musicbrainz/release/${mbid}/tracks`);
      const json = await res.json();
      setMbAlbumTracks(json.results ?? []);
    } catch (e) { console.error(e); }
    finally { setMbAlbumTracksLoading(false); }
  };

  const openMbArtist = async (entity: ContentEntity) => {
    const mbid = entity.id.replace(/^mb-art-/, "");
    setOpenedMbArtist(entity);
    setMbArtistAlbumsLoading(true);
    setMbArtistAlbums([]);
    try {
      const res = await fetch(`/api/musicbrainz/artist/${mbid}/releases`);
      const json = await res.json();
      setMbArtistAlbums(json.results ?? []);
    } catch (e) { console.error(e); }
    finally { setMbArtistAlbumsLoading(false); }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const maxTracks = freeMode ? 50 : size;
  const canAdd = selected.length < maxTracks;
  const isSelected = (id: string) => selected.some((s) => s.external_id === id);

  const togglePlay = (id: string, url: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => setPlayingId(null);
      audioRef.current.volume = volume;
    }
    const a = audioRef.current;
    if (playingId === id) { a.pause(); setPlayingId(null); return; }
    a.pause();
    a.volume = volume;
    a.src = url;
    a.load();
    setPlayingId(id);
    a.play().catch((err: unknown) => {
      console.warn("Audio playback failed:", err);
      setPlayingId(null);
    });
  };

  const itemToSelected = (t: ContentItem, coverFallback?: string | null): SelectedContentItem => ({
    external_id: t.id,
    title: t.title,
    subtitle: t.subtitle ?? undefined,
    cover_url: t.coverUrl ?? coverFallback ?? null,
    preview_url: t.previewUrl ?? null,
    source: t.source,
    metadata: t.metadata,
  });

  const addTrack = (t: ContentItem) => {
    if (isSelected(t.id) || !canAdd) return;
    onChange([...selected, itemToSelected(t)]);
  };

  const addAlbumTrack = (t: ContentItem) => {
    if (!openedAlbum || isSelected(t.id) || !canAdd || !t.previewUrl) return;
    onChange([...selected, {
      ...itemToSelected(t, openedAlbum.coverUrl ?? null),
      subtitle: t.subtitle ?? str(openedAlbum.metadata?.artistName) ?? "",
    }]);
  };

  const addAllAlbumTracks = () => {
    if (!openedAlbum) return;
    const remaining = maxTracks - selected.length;
    const albumArtist = str(openedAlbum.metadata?.artistName) ?? "";
    const batch = albumTracks
      .filter((t) => t.previewUrl && !isSelected(t.id))
      .slice(0, remaining)
      .map((t) => ({
        ...itemToSelected(t, openedAlbum.coverUrl ?? null),
        subtitle: albumArtist || undefined || (t.subtitle ?? ""),
        rank: 0,
      }));
    if (batch.length > 0) onChange([...selected, ...batch]);
  };

  const remove = (id: string) => onChange(selected.filter((s) => s.external_id !== id));

  const openAlbum = async (album: ContentCollection) => {
    setOpenedAlbum(album);
    setAlbumTracks([]);
    setAlbumTracksLoading(true);
    try {
      const res = await fetch(`/api/content/collection/${album.id}/items`);
      const json = await res.json();
      setAlbumTracks(json.items ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setAlbumTracksLoading(false);
    }
  };

  const openArtist = async (artist: ContentEntity) => {
    setOpenedArtist(artist);
    setArtistAlbums([]);
    setArtistAlbumsLoading(true);
    try {
      const res = await fetch(`/api/content/entity/${artist.id}/collections`);
      const json = await res.json();
      setArtistAlbums(json.collections ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setArtistAlbumsLoading(false);
    }
  };

  const backFromAlbumTracks = () => {
    setOpenedAlbum(null);
    setAlbumTracks([]);
  };

  const backFromArtistAlbums = () => {
    setOpenedArtist(null);
    setArtistAlbums([]);
    setOpenedAlbum(null);
    setAlbumTracks([]);
  };

  // ── Tab content ──────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "track",    label: "Morceaux",    icon: <Music size={14} /> },
    { id: "album",    label: "Album",       icon: <Disc3 size={14} /> },
    { id: "artist",   label: "Artiste",     icon: <User size={14} /> },
    { id: "mb-track", label: "MB Titres",   icon: <Music size={14} /> },
    { id: "mb-album", label: "MB Albums",   icon: <Disc3 size={14} /> },
    { id: "mb-artist",label: "MB Artistes", icon: <User size={14} /> },
  ];

  const renderLeft = () => {
    // ── Shared album tracks view
    if (openedAlbum && (tab === "album" || tab === "artist")) {
      return (
        <AlbumTracksView
          album={openedAlbum}
          tracks={albumTracks}
          loading={albumTracksLoading}
          onBack={backFromAlbumTracks}
          isSelected={isSelected}
          canAdd={canAdd}
          onAddTrack={addAlbumTrack}
          onAddAll={addAllAlbumTracks}
          playingId={playingId}
          onTogglePlay={togglePlay}
        />
      );
    }

    if (tab === "track") {
      return (
        <div>
          <SearchInput
            value={trackQuery}
            onChange={(v) => setTrackQuery(v)}
            placeholder="Artiste, titre…"
          />
          <StatusLine loading={trackLoading} count={trackResults.length} />
          <ul className="mt-2 max-h-[440px] overflow-y-auto space-y-2 pr-1">
            {trackResults.map((t) => {
              const picked = isSelected(t.id);
              const playing = playingId === t.id;
              return (
                <li key={t.id} className="card flex items-center gap-3 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.coverUrl ?? ""}
                    alt=""
                    className="h-12 w-12 rounded-md object-cover bg-[color:var(--surface-2)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.title}</p>
                    <p className="truncate text-xs text-[color:var(--muted)]">{t.subtitle}</p>
                  </div>
                  <button type="button" onClick={() => togglePlay(t.id, t.previewUrl ?? "")} className="btn-ghost btn-xs px-2">
                    {playing ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => addTrack(t)}
                    disabled={picked || !canAdd}
                    className="btn-primary btn-xs px-2 disabled:opacity-40"
                  >
                    {picked ? <Check size={14} /> : <Plus size={14} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      );
    }

    if (tab === "album") {
      return (
        <div>
          <SearchInput
            value={albumQuery}
            onChange={(v) => setAlbumQuery(v)}
            placeholder="Nom d'album, artiste…"
          />
          <StatusLine loading={albumLoading} count={albumResults.length} />
          <ul className="mt-2 max-h-[440px] overflow-y-auto space-y-2 pr-1">
            {albumResults.map((album) => (
              <AlbumCard key={album.id} album={album} onClick={() => openAlbum(album)} />
            ))}
          </ul>
        </div>
      );
    }

    if (tab === "artist") {
      // Artist discography (albums list)
      if (openedArtist) {
        return (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <button type="button" onClick={backFromArtistAlbums} className="btn-ghost btn-xs px-2">
                <ChevronLeft size={16} />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={openedArtist.pictureUrl ?? ""}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
              <p className="truncate font-semibold text-sm">{openedArtist.name}</p>
            </div>
            {artistAlbumsLoading ? (
              <p className="text-xs text-[color:var(--muted)] py-4 text-center">Chargement…</p>
            ) : (
              <ul className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
                {artistAlbums.map((album) => (
                  <AlbumCard
                    key={album.id}
                    album={album}
                    onClick={() => openAlbum(album)}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      }

      // Artist search
      return (
        <div>
          <SearchInput
            value={artistQuery}
            onChange={(v) => setArtistQuery(v)}
            placeholder="Nom d'artiste…"
          />
          <StatusLine loading={artistLoading} count={artistResults.length} />
          <ul className="mt-2 max-h-[440px] overflow-y-auto space-y-2 pr-1">
            {artistResults.map((artist) => {
              const albumCount = num(artist.metadata?.albumCount);
              return (
                <li
                  key={artist.id}
                  onClick={() => openArtist(artist)}
                  className="card flex items-center gap-3 p-2 cursor-pointer hover:bg-[color:var(--surface-2)] transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={artist.pictureUrl ?? ""}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover bg-[color:var(--surface-2)] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{artist.name}</p>
                    <p className="truncate text-xs text-[color:var(--muted)]">
                      {albumCount ? `${albumCount} albums` : ""}
                      {artist.fanCount ? ` · ${artist.fanCount.toLocaleString()} fans` : ""}
                    </p>
                  </div>
                  <ChevronLeft size={16} className="rotate-180 text-[color:var(--muted)] shrink-0" />
                </li>
              );
            })}
          </ul>
        </div>
      );
    }

    // ── MusicBrainz tabs ──────────────────────────────────────────────────────

    if (tab === "mb-track") {
      return (
        <MbSearchPanel
          query={mbTrackQuery} onQuery={setMbTrackQuery}
          placeholder="Titre, artiste…" loading={mbTrackLoading}
          results={mbTrackResults as ContentItem[]}
          renderRow={(item) => (
            <MbItemRow key={item.id} item={item} selected={isSelected(item.id)}
              onAdd={() => addTrack(item)} />
          )}
        />
      );
    }

    if (tab === "mb-album") {
      if (openedMbAlbum) {
        return (
          <div className="space-y-2">
            <button type="button" className="btn-ghost text-sm flex items-center gap-1"
              onClick={() => { setOpenedMbAlbum(null); setMbAlbumTracks([]); }}>
              <ChevronLeft size={14} /> Retour
            </button>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedMbAlbum.title}</p>
            {mbAlbumTracksLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {mbAlbumTracks.map((item) => (
              <MbItemRow key={item.id} item={item} selected={isSelected(item.id)} onAdd={() => addTrack(item)} />
            ))}
          </div>
        );
      }
      return (
        <MbSearchPanel
          query={mbAlbumQuery} onQuery={setMbAlbumQuery}
          placeholder="Nom d'album…" loading={mbAlbumLoading}
          results={mbAlbumResults as ContentItem[]}
          renderRow={(col) => (
            <button key={col.id} type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openMbAlbum(col as unknown as ContentCollection)}>
              <div className="w-10 h-10 rounded bg-[color:var(--surface-2)] shrink-0 flex items-center justify-center"><Disc3 size={16} className="text-[color:var(--muted)]" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{col.title}</p>
                {col.subtitle && <p className="text-xs text-[color:var(--muted)] truncate">{col.subtitle}</p>}
              </div>
              <ChevronLeft size={14} className="rotate-180 shrink-0 text-[color:var(--muted)]" />
            </button>
          )}
        />
      );
    }

    if (tab === "mb-artist") {
      if (openedMbArtist) {
        return (
          <div className="space-y-2">
            <button type="button" className="btn-ghost text-sm flex items-center gap-1"
              onClick={() => { setOpenedMbArtist(null); setMbArtistAlbums([]); }}>
              <ChevronLeft size={14} /> Retour
            </button>
            <p className="text-sm font-medium text-[color:var(--muted)]">{openedMbArtist.name}</p>
            {mbArtistAlbumsLoading && <p className="text-sm text-[color:var(--muted)]">Chargement…</p>}
            {mbArtistAlbums.map((col) => (
              <button key={col.id} type="button"
                className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
                onClick={() => void openMbAlbum(col)}>
                <div className="w-10 h-10 rounded bg-[color:var(--surface-2)] shrink-0 flex items-center justify-center"><Disc3 size={16} className="text-[color:var(--muted)]" /></div>
                <div className="min-w-0 flex-1"><p className="font-medium truncate">{col.title}</p></div>
                <ChevronLeft size={14} className="rotate-180 shrink-0 text-[color:var(--muted)]" />
              </button>
            ))}
          </div>
        );
      }
      return (
        <MbSearchPanel
          query={mbArtistQuery} onQuery={setMbArtistQuery}
          placeholder="Nom d'artiste…" loading={mbArtistLoading}
          results={mbArtistResults}
          renderRow={(entity) => (
            <button key={entity.id} type="button"
              className="w-full flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-hover)]"
              onClick={() => void openMbArtist(entity as unknown as ContentEntity)}>
              <div className="w-10 h-10 rounded-full bg-[color:var(--surface-2)] shrink-0 flex items-center justify-center"><User size={16} className="text-[color:var(--muted)]" /></div>
              <div className="min-w-0 flex-1"><p className="font-medium truncate">{entity.title}</p></div>
              <ChevronLeft size={14} className="rotate-180 shrink-0 text-[color:var(--muted)]" />
            </button>
          )}
        />
      );
    }

    return null;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
      {/* Left: search panel */}
      <div>
        {/* Tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex min-w-max items-center gap-1.5 justify-center whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:flex-1 sm:min-w-0 ${
                tab === t.id
                  ? "bg-[color:var(--surface)] shadow-sm text-[color:var(--foreground)]"
                  : "text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {renderLeft()}
      </div>

      {/* Right: selection */}
      <div>
        <div className="flex items-baseline justify-between">
          <label className="text-sm font-medium">
            {freeMode
              ? `Sélection (${selected.length})`
              : `Sélection (${selected.length}/${size})`}
          </label>
        </div>

        <ul className="mt-2 max-h-[520px] overflow-y-auto space-y-2 pr-1">
          {selected.map((t, i) => (
            <li key={t.external_id} className="card flex items-center gap-3 p-2">
              <div className="w-6 text-center text-sm font-bold text-[color:var(--muted)]">
                #{i + 1}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.cover_url ?? ""}
                alt=""
                className="h-12 w-12 rounded-md object-cover bg-[color:var(--surface-2)]"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.title}</p>
                <p className="truncate text-xs text-[color:var(--muted)]">{t.subtitle ?? ""}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(t.external_id)}
                className="btn-ghost btn-xs px-2"
                aria-label="Retirer"
              >
                <X size={14} />
              </button>
            </li>
          ))}
          {!freeMode &&
            Array.from({ length: Math.max(0, size - selected.length) }).map((_, i) => (
              <li key={`empty-${i}`} className="card flex items-center gap-3 p-2 opacity-50">
                <div className="w-6 text-center text-sm font-bold text-[color:var(--muted)]">
                  #{selected.length + i + 1}
                </div>
                <div className="h-12 w-12 rounded-md bg-[color:var(--surface-2)]" />
                <p className="text-sm text-[color:var(--muted)]">Emplacement libre</p>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

// ─── MusicBrainz helpers ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MbSearchPanel({
  query, onQuery, placeholder, loading, results, renderRow,
}: {
  query: string;
  onQuery: (v: string) => void;
  placeholder: string;
  loading: boolean;
  results: any[];
  renderRow: (item: any) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
        <input type="search" value={query} onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder} className="input w-full pl-9 text-sm" />
      </div>
      {loading && <p className="text-sm text-[color:var(--muted)]">Recherche…</p>}
      <div className="space-y-1">{results.map(renderRow)}</div>
    </div>
  );
}

function MbItemRow({
  item, selected, onAdd,
}: {
  item: { id: string; title: string; subtitle?: string };
  selected: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] p-2">
      <div className="w-10 h-10 rounded bg-[color:var(--surface-2)] shrink-0 flex items-center justify-center">
        <Music size={14} className="text-[color:var(--muted)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.subtitle && <p className="text-xs text-[color:var(--muted)] truncate">{item.subtitle}</p>}
      </div>
      <button type="button" disabled={selected} onClick={onAdd}
        className="btn-ghost shrink-0 p-2"
        aria-label={selected ? "Déjà sélectionné" : `Ajouter ${item.title}`}>
        {selected ? <Check size={16} className="text-[color:var(--accent)]" /> : <Plus size={16} />}
      </button>
    </div>
  );
}
