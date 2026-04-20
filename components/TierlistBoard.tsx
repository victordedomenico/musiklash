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
import { Play, Pause, Share2, RotateCcw } from "lucide-react";
import { usePreviewVolume } from "@/lib/audio-volume";

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

export const TIERS = [
  { id: "S+", label: "S+", color: "#ff7f7f" },
  { id: "S",  label: "S",  color: "#ffbf7f" },
  { id: "A",  label: "A",  color: "#ffdf7f" },
  { id: "B",  label: "B",  color: "#ffff7f" },
  { id: "C",  label: "C",  color: "#bfff7f" },
  { id: "D",  label: "D",  color: "#7fbfff" },
  { id: "F",  label: "F",  color: "#bf7fff" },
] as const;

const POOL_ID = "__pool__";

function buildInitialState(tracks: TierItem[]): TierState {
  const state: TierState = { [POOL_ID]: [...tracks] };
  for (const t of TIERS) state[t.id] = [];
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
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onPreview(item.position, item.deezerTrackId, item.previewUrl);
        }}
        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition"
        aria-label={isPlaying ? "Pause" : "Écouter"}
      >
        {isPlaying ? (
          <Pause size={20} className="text-white" />
        ) : (
          <Play size={20} className="text-white" />
        )}
      </button>
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
  tierId,
  label,
  color,
  items,
  onPreview,
  playingPosition,
}: {
  tierId: string;
  label: string;
  color: string;
  items: TierItem[];
  onPreview: (pos: number, deezerTrackId: number, url: string) => void;
  playingPosition: number | null;
}) {
  const sortableIds = items.map((i) => String(i.position));
  const { setNodeRef, isOver } = useDroppable({ id: tierId });

  return (
    <div className="flex min-h-[72px] items-stretch overflow-hidden rounded-xl border border-[color:var(--border)]">
      <div
        className="flex items-center justify-center w-14 shrink-0 font-black text-xl text-white"
        style={{ backgroundColor: color }}
      >
        {label}
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
  onSave: (placements: Record<string, number[]>) => void;
  saving: boolean;
}) {
  const [state, setState] = useState<TierState>(() => buildInitialState(tracks));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playingPosition, setPlayingPosition] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
      const activeItems = [...prev[activeContainer]];
      const overItems = [...prev[overContainer]];
      const activeIndex = activeItems.findIndex((i) => String(i.position) === activeId);
      const overIndex = overItems.findIndex((i) => String(i.position) === overId);
      const [moved] = activeItems.splice(activeIndex, 1);
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
      const items = prev[container];
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
    for (const tier of TIERS) {
      placements[tier.id] = state[tier.id].map((i) => i.position);
    }
    onSave(placements);
  };

  const handleReset = () => {
    audioRef.current?.pause();
    setPlayingPosition(null);
    setState(buildInitialState(tracks));
  };

  const poolItems = state[POOL_ID];
  const placedCount = tracks.length - poolItems.length;

  return (
    <DndContext
      id="tierlist-dnd"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-3">
        {TIERS.map((tier) => (
          <TierRow
            key={tier.id}
            tierId={tier.id}
            label={tier.label}
            color={tier.color}
            items={state[tier.id]}
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

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-3 border-t border-[color:var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[color:var(--muted)]">
          {placedCount} / {tracks.length} morceaux classés
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
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
