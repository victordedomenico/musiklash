"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Play, Pause, Share2, RotateCcw, Download, Plus, Trash2 } from "lucide-react";
import { usePreviewVolume } from "@/lib/audio-volume";
import { downloadNodeAsPng } from "@/lib/download-png";
import {
  DEFAULT_TIERS,
  getNextTierColor,
  type TierConfig,
  type TierlistSavePayload,
} from "@/lib/tierlist-tiers";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TierItem = {
  position: number;
  deezerTrackId: number;
  title: string;
  artist: string;
  coverUrl: string | null;
  previewUrl: string;
};

type TierState = Record<string, TierItem[]>;

// ─── Constants ───────────────────────────────────────────────────────────────

const POOL_ID = "__pool__";

function buildInitialState(tracks: TierItem[], tiers: TierConfig[]): TierState {
  const state: TierState = { [POOL_ID]: [...tracks] };
  for (const t of tiers) state[t.id] = [];
  return state;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TrackChip({
  item,
  isDragging,
  onPreview,
  playingPosition,
}: {
  item: TierItem;
  isDragging?: boolean;
  onPreview: (pos: number, deezerTrackId: number, url: string) => void;
  playingPosition: number | null;
}) {
  const isPlaying = playingPosition === item.position;
  return (
    <div
      className={`group relative h-16 w-16 shrink-0 cursor-grab rounded-lg overflow-hidden border-2 transition select-none
        ${isDragging ? "opacity-50 border-[color:var(--accent)]" : "border-transparent hover:border-[color:var(--accent)]/60"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.coverUrl ?? ""}
        alt={item.title}
        className="h-full w-full object-cover bg-[color:var(--surface-2)]"
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onPreview(item.position, item.deezerTrackId, item.previewUrl);
          }}
          className="pointer-events-auto rounded-full bg-black/65 p-2 text-white transition hover:bg-black/80"
          aria-label={isPlaying ? "Pause" : "Écouter"}
        >
          {isPlaying ? (
            <Pause size={20} />
          ) : (
            <Play size={20} />
          )}
        </button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[9px] leading-tight truncate text-white">
        {item.title}
      </div>
    </div>
  );
}

function SortableTrack({
  item,
  onPreview,
  playingPosition,
}: {
  item: TierItem;
  onPreview: (pos: number, deezerTrackId: number, url: string) => void;
  playingPosition: number | null;
}) {
  const id = String(item.position);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <TrackChip
        item={item}
        isDragging={isDragging}
        onPreview={onPreview}
        playingPosition={playingPosition}
      />
    </div>
  );
}

function TierRow({
  tier,
  items,
  canDelete,
  onLabelChange,
  onDelete,
  onPreview,
  playingPosition,
}: {
  tier: TierConfig;
  items: TierItem[];
  canDelete: boolean;
  onLabelChange: (tierId: string, nextLabel: string) => void;
  onDelete: (tierId: string) => void;
  onPreview: (pos: number, deezerTrackId: number, url: string) => void;
  playingPosition: number | null;
}) {
  const { id: tierId, label, color } = tier;
  const sortableIds = items.map((i) => String(i.position));
  const { setNodeRef, isOver } = useDroppable({ id: tierId });

  return (
    <div className="flex min-h-[72px] items-stretch overflow-hidden rounded-xl border border-[color:var(--border)]">
      <div
        className="flex w-20 shrink-0 flex-col justify-center gap-1 px-1 py-2 text-white"
        style={{ backgroundColor: color }}
      >
        <input
          value={label}
          onChange={(e) => onLabelChange(tierId, e.target.value)}
          className="w-full rounded bg-black/20 px-1.5 py-1 text-center text-sm font-black tracking-wide outline-none placeholder:text-white/70 focus:bg-black/30"
          aria-label={`Nom du tier ${label || tierId}`}
          placeholder="Tier"
          maxLength={16}
        />
        {canDelete ? (
          <button
            type="button"
            onClick={() => onDelete(tierId)}
            className="no-export mx-auto inline-flex rounded bg-black/25 p-1 transition hover:bg-black/35"
            aria-label={`Supprimer le tier ${label || tierId}`}
            title="Supprimer le tier"
          >
            <Trash2 size={12} />
          </button>
        ) : null}
      </div>
      <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex min-h-[72px] flex-1 flex-wrap gap-2 p-2 transition-colors ${
            isOver
              ? "bg-[color:var(--accent)]/10"
              : "bg-[color:var(--surface)]"
          }`}
        >
          {items.map((item) => (
            <SortableTrack
              key={item.position}
              item={item}
              onPreview={onPreview}
              playingPosition={playingPosition}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function PoolZone({
  poolItems,
  tracks,
  onPreview,
  playingPosition,
}: {
  poolItems: TierItem[];
  tracks: TierItem[];
  onPreview: (pos: number, deezerTrackId: number, url: string) => void;
  playingPosition: number | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: POOL_ID });

  return (
    <div className="mt-6">
      <p className="text-sm font-medium text-[color:var(--muted)] mb-2">
        À placer ({poolItems.length} / {tracks.length})
      </p>
      <SortableContext
        items={poolItems.map((i) => String(i.position))}
        strategy={horizontalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`card p-3 flex flex-wrap gap-2 min-h-[88px] transition-colors ${
            isOver ? "bg-[color:var(--accent)]/10" : ""
          }`}
        >
          {poolItems.length === 0 ? (
            <p className="text-xs text-[color:var(--muted)] self-center">
              Tous les morceaux ont été placés 🎉
            </p>
          ) : (
            poolItems.map((item) => (
              <SortableTrack
                key={item.position}
                item={item}
                onPreview={onPreview}
                playingPosition={playingPosition}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TierlistBoard({
  tracks,
  onSave,
  saving,
}: {
  tierlistId?: string;
  tracks: TierItem[];
  onSave: (payload: TierlistSavePayload) => void;
  saving: boolean;
}) {
  const [tiers, setTiers] = useState<TierConfig[]>(() =>
    DEFAULT_TIERS.map((tier) => ({ ...tier })),
  );
  const [state, setState] = useState<TierState>(() =>
    buildInitialState(tracks, DEFAULT_TIERS),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playingPosition, setPlayingPosition] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextTierIndexRef = useRef(DEFAULT_TIERS.length);
  const { volume } = usePreviewVolume();
  // Cache des URLs fraîches (les URLs Deezer signées expirent)
  const freshUrlCache = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    return () => {
      if (!audioRef.current) return;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handlePreview = useCallback(async (pos: number, deezerTrackId: number, staleUrl: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => setPlayingPosition(null);
      audioRef.current.volume = volume;
    }
    const a = audioRef.current;
    if (playingPosition === pos) {
      a.pause();
      setPlayingPosition(null);
      return;
    }

    // Résoudre l'URL fraîche (cache ou fetch)
    let url = freshUrlCache.current.get(deezerTrackId) ?? staleUrl;
    if (!freshUrlCache.current.has(deezerTrackId)) {
      try {
        const res = await fetch(`/api/deezer/track/${deezerTrackId}`);
        const data = await res.json() as { preview?: string };
        if (data.preview) {
          url = data.preview;
          freshUrlCache.current.set(deezerTrackId, url);
        }
      } catch { /* garde l'URL stale */ }
    }

    a.pause();
    a.volume = volume;
    a.src = url;
    a.load();
    setPlayingPosition(pos);
    a.play().catch((err: unknown) => {
      console.warn("Audio playback failed:", err);
      setPlayingPosition(null);
    });
  }, [playingPosition, volume]);

  const findContainer = (id: string) => {
    for (const [key, items] of Object.entries(state)) {
      if (items.some((i) => String(i.position) === id)) return key;
    }
    return null;
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = findContainer(activeId);
    // Check if over is a container id directly (empty tier drop)
    const overContainer = state[overId] ? overId : findContainer(overId);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setState((prev) => {
      const activeItems = [...(prev[activeContainer] ?? [])];
      const overItems = [...(prev[overContainer] ?? [])];
      const activeIndex = activeItems.findIndex((i) => String(i.position) === activeId);
      if (activeIndex === -1) return prev;
      const overIndex = overItems.findIndex((i) => String(i.position) === overId);
      const [moved] = activeItems.splice(activeIndex, 1);
      if (!moved) return prev;
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      overItems.splice(insertAt, 0, moved);
      return { ...prev, [activeContainer]: activeItems, [overContainer]: overItems };
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const container = findContainer(activeId) ?? (state[overId] ? overId : null);
    if (!container) return;

    setState((prev) => {
      const items = prev[container] ?? [];
      const oldIndex = items.findIndex((i) => String(i.position) === activeId);
      const newIndex = items.findIndex((i) => String(i.position) === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
      return { ...prev, [container]: arrayMove(items, oldIndex, newIndex) };
    });
  };

  const activeItem = activeId
    ? Object.values(state).flat().find((i) => String(i.position) === activeId)
    : null;

  const handleSave = () => {
    const placements: Record<string, number[]> = {};
    for (const tier of tiers) {
      placements[tier.id] = (state[tier.id] ?? []).map((i) => i.position);
    }
    onSave({ tiers, placements });
  };

  const handleReset = () => {
    audioRef.current?.pause();
    setPlayingPosition(null);
    setState(buildInitialState(tracks, tiers));
  };

  const handleAddTier = () => {
    const index = nextTierIndexRef.current;
    const id = `tier-${index + 1}`;
    const tier: TierConfig = {
      id,
      label: `Tier ${index + 1}`,
      color: getNextTierColor(index),
    };
    nextTierIndexRef.current += 1;
    setTiers((prev) => [...prev, tier]);
    setState((prev) => ({ ...prev, [id]: [] }));
  };

  const handleDeleteTier = (tierId: string) => {
    if (tiers.length <= 1) return;
    setTiers((prev) => prev.filter((tier) => tier.id !== tierId));
    setState((prev) => {
      const removedItems = prev[tierId] ?? [];
      const next: TierState = { ...prev, [POOL_ID]: [...(prev[POOL_ID] ?? []), ...removedItems] };
      delete next[tierId];
      return next;
    });
  };

  const handleTierLabelChange = (tierId: string, nextLabel: string) => {
    setTiers((prev) =>
      prev.map((tier) =>
        tier.id === tierId
          ? { ...tier, label: nextLabel }
          : tier,
      ),
    );
  };

  const handleDownload = async () => {
    if (!exportRef.current) return;
    setIsDownloading(true);
    try {
      await downloadNodeAsPng(exportRef.current, {
        filename: "tierlist-resultat.png",
        backgroundColor: "var(--surface)",
      });
    } catch {
      alert(
        "Impossible de générer le PNG pour le moment. Vérifie que les pochettes sont bien chargées et réessaie.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const poolItems = state[POOL_ID] ?? [];
  const placedCount = tracks.length - poolItems.length;

  return (
    <DndContext
      id="tierlist-dnd"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={exportRef}
        className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 md:p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
            Résultat tierlist
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-[color:var(--muted)]">
              {placedCount} / {tracks.length} classés
            </p>
            <button
              type="button"
              onClick={handleAddTier}
              className="no-export btn-ghost h-8 px-2 text-xs"
            >
              <Plus size={14} />
              Ajouter un tier
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {tiers.map((tier) => (
            <TierRow
              key={tier.id}
              tier={tier}
              items={state[tier.id] ?? []}
              canDelete={tiers.length > 1}
              onLabelChange={handleTierLabelChange}
              onDelete={handleDeleteTier}
              onPreview={handlePreview}
              playingPosition={playingPosition}
            />
          ))}
        </div>

        {/* Pool (morceaux non placés) */}
        <PoolZone
          poolItems={poolItems}
          tracks={tracks}
          onPreview={handlePreview}
          playingPosition={playingPosition}
        />
      </div>

      {/* Actions */}
      <div className="no-export mt-6 flex flex-col gap-3 border-t border-[color:var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[color:var(--muted)]">
          {placedCount} / {tracks.length} morceaux classés
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="btn-primary w-full justify-center text-sm disabled:opacity-50 sm:w-auto"
          >
            <Download size={14} />
            {isDownloading ? "Génération…" : "Télécharger en PNG"}
          </button>
          <button type="button" onClick={handleReset} className="btn-ghost w-full justify-center text-sm sm:w-auto">
            <RotateCcw size={14} /> Réinitialiser
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full justify-center text-sm disabled:opacity-50 sm:w-auto"
          >
            <Share2 size={14} />
            {saving ? "Sauvegarde…" : "Sauvegarder et partager"}
          </button>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeItem ? (
          <TrackChip
            item={activeItem}
            onPreview={() => {}}
            playingPosition={null}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
