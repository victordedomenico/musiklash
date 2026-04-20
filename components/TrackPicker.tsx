"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search, Plus, X, Play, Pause, ChevronLeft, Check,
  Music, Disc3, User, ListMusic,
} from "lucide-react";
import type { DeezerTrack, DeezerAlbum, DeezerArtist, DeezerAlbumTrack } from "@/lib/deezer";
import type { SelectedTrack } from "@/app/create-bracket/actions";
import { usePreviewVolume } from "@/lib/audio-volume";

type Props = {
  size: number;
  selected: SelectedTrack[];
  onChange: (next: SelectedTrack[]) => void;
  freeMode?: boolean;
};

type Tab = "track" | "album" | "artist";

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
  album: DeezerAlbum;
  onClick: () => void;
  action?: React.ReactNode;
}) {
  return (
    <li className="card flex items-center gap-3 p-2 cursor-pointer hover:bg-[color:var(--surface-2)] transition-colors" onClick={onClick}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={album.cover_small ?? album.cover_medium ?? ""}
        alt=""
        className="h-12 w-12 rounded-md object-cover bg-[color:var(--surface-2)] shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{album.title}</p>
        <p className="truncate text-xs text-[color:var(--muted)]">
          {album.artist?.name}
          {album.nb_tracks ? ` · ${album.nb_tracks} titres` : ""}
          {album.release_date ? ` · ${album.release_date.slice(0, 4)}` : ""}
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
  album: DeezerAlbum;
  tracks: DeezerAlbumTrack[];
  loading: boolean;
  onBack: () => void;
  isSelected: (id: number) => boolean;
  canAdd: boolean;
  onAddTrack: (t: DeezerAlbumTrack) => void;
  onAddAll: () => void;
  playingId: number | null;
  onTogglePlay: (id: number, url: string) => void;
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
          src={album.cover_small ?? ""}
          alt=""
          className="h-8 w-8 rounded object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{album.title}</p>
          <p className="truncate text-xs text-[color:var(--muted)]">{album.artist?.name}</p>
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
            return (
              <li key={t.id} className="card flex items-center gap-2 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="truncate text-xs text-[color:var(--muted)]">
                    {Math.floor(t.duration / 60)}:{String(t.duration % 60).padStart(2, "0")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onTogglePlay(t.id, t.preview)}
                  className="btn-ghost btn-xs px-2"
                  disabled={!t.preview}
                >
                  {playing ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() => onAddTrack(t)}
                  disabled={picked || !canAdd || !t.preview}
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
  const [playingId, setPlayingId] = useState<number | null>(null);
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
  const { data: trackResults, loading: trackLoading } = useDebouncedSearch<DeezerTrack>(
    "/api/deezer/search", trackQuery, tab === "track",
  );

  // Album tab
  const [albumQuery, setAlbumQuery] = useState("");
  const { data: albumResults, loading: albumLoading } = useDebouncedSearch<DeezerAlbum>(
    "/api/deezer/search/album", albumQuery, tab === "album",
  );

  // Artist tab
  const [artistQuery, setArtistQuery] = useState("");
  const { data: artistResults, loading: artistLoading } = useDebouncedSearch<DeezerArtist>(
    "/api/deezer/search/artist", artistQuery, tab === "artist",
  );

  // Shared album-tracks view (used by both album & artist tabs)
  const [openedAlbum, setOpenedAlbum] = useState<DeezerAlbum | null>(null);
  const [albumTracks, setAlbumTracks] = useState<DeezerAlbumTrack[]>([]);
  const [albumTracksLoading, setAlbumTracksLoading] = useState(false);

  // Artist tab – discography view
  const [openedArtist, setOpenedArtist] = useState<DeezerArtist | null>(null);
  const [artistAlbums, setArtistAlbums] = useState<DeezerAlbum[]>([]);
  const [artistAlbumsLoading, setArtistAlbumsLoading] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const maxTracks = freeMode ? 50 : size;
  const canAdd = selected.length < maxTracks;
  const isSelected = (id: number) => selected.some((s) => s.deezer_track_id === id);

  const togglePlay = (id: number, url: string) => {
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

  const addTrack = (t: DeezerTrack) => {
    if (isSelected(t.id) || !canAdd) return;
    onChange([...selected, {
      deezer_track_id: t.id,
      title: t.title,
      artist: t.artist.name,
      preview_url: t.preview,
      cover_url: t.album.cover_medium ?? t.album.cover_small ?? null,
    }]);
  };

  const addAlbumTrack = (t: DeezerAlbumTrack) => {
    if (!openedAlbum || isSelected(t.id) || !canAdd || !t.preview) return;
    onChange([...selected, {
      deezer_track_id: t.id,
      title: t.title,
      artist: openedAlbum.artist?.name ?? t.artist.name,
      preview_url: t.preview,
      cover_url: openedAlbum.cover_medium ?? openedAlbum.cover_small ?? null,
    }]);
  };

  const addAllAlbumTracks = () => {
    if (!openedAlbum) return;
    const remaining = maxTracks - selected.length;
    const albumArtist = openedAlbum.artist?.name ?? "";
    const batch = albumTracks
      .filter((t) => t.preview && !isSelected(t.id))
      .slice(0, remaining)
      .map((t) => ({
        deezer_track_id: t.id,
        title: t.title,
        artist: albumArtist || t.artist.name,
        preview_url: t.preview,
        cover_url: openedAlbum.cover_medium ?? openedAlbum.cover_small ?? null,
      }));
    if (batch.length > 0) onChange([...selected, ...batch]);
  };

  const remove = (id: number) => onChange(selected.filter((s) => s.deezer_track_id !== id));

  const openAlbum = async (album: DeezerAlbum) => {
    setOpenedAlbum(album);
    setAlbumTracks([]);
    setAlbumTracksLoading(true);
    try {
      const res = await fetch(`/api/deezer/album/${album.id}/tracks`);
      const json = await res.json();
      setAlbumTracks(json.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setAlbumTracksLoading(false);
    }
  };

  const openArtist = async (artist: DeezerArtist) => {
    setOpenedArtist(artist);
    setArtistAlbums([]);
    setArtistAlbumsLoading(true);
    try {
      const res = await fetch(`/api/deezer/artist/${artist.id}/albums`);
      const json = await res.json();
      setArtistAlbums(json.data ?? []);
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
    { id: "track",  label: "Morceaux", icon: <Music size={14} /> },
    { id: "album",  label: "Album",    icon: <Disc3 size={14} /> },
    { id: "artist", label: "Artiste",  icon: <User size={14} /> },
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
                    src={t.album.cover_small ?? ""}
                    alt=""
                    className="h-12 w-12 rounded-md object-cover bg-[color:var(--surface-2)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.title}</p>
                    <p className="truncate text-xs text-[color:var(--muted)]">{t.artist.name}</p>
                  </div>
                  <button type="button" onClick={() => togglePlay(t.id, t.preview)} className="btn-ghost btn-xs px-2">
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
                src={openedArtist.picture_small ?? ""}
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
            {artistResults.map((artist) => (
              <li
                key={artist.id}
                onClick={() => openArtist(artist)}
                className="card flex items-center gap-3 p-2 cursor-pointer hover:bg-[color:var(--surface-2)] transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={artist.picture_small ?? artist.picture_medium ?? ""}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover bg-[color:var(--surface-2)] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{artist.name}</p>
                  <p className="truncate text-xs text-[color:var(--muted)]">
                    {artist.nb_album ? `${artist.nb_album} albums` : ""}
                    {artist.nb_fan ? ` · ${artist.nb_fan.toLocaleString()} fans` : ""}
                  </p>
                </div>
                <ChevronLeft size={16} className="rotate-180 text-[color:var(--muted)] shrink-0" />
              </li>
            ))}
          </ul>
        </div>
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
            <li key={t.deezer_track_id} className="card flex items-center gap-3 p-2">
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
                <p className="truncate text-xs text-[color:var(--muted)]">{t.artist}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(t.deezer_track_id)}
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
