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
import {
  Play,
  Pause,
  Share2,
  RotateCcw,
  Download,
  Plus,
  Settings,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { usePreviewVolume } from "@/lib/audio-volume";
import { downloadNodeAsPng } from "@/lib/download-png";
import {
  DEFAULT_TIERS,
  getNextTierColor,
  type TierConfig,
  type TierlistSavePayload,
} from "@/lib/tierlist-tiers";
import type { Dictionary } from "@/lib/i18n";

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
const TIER_LABEL_COLORS = [
  "#f67f7f",
  "#ebb56f",
  "#ecd172",
  "#ecec6b",
  "#aae86e",
  "#69df6c",
  "#67e0de",
  "#73b2eb",
  "#797df1",
  "#d772e6",
  "#b97ab6",
  "#333438",
  "#6f6f6f",
  "#bdbdbd",
  "#eeeeee",
];

export type TierlistBoardTexts = Dictionary["tierlistBoard"];

function formatText(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

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
  texts,
}: {
  item: TierItem;
  isDragging?: boolean;
  onPreview: (pos: number, deezerTrackId: number, url: string) => void;
  playingPosition: number | null;
  texts: TierlistBoardTexts;
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
          aria-label={isPlaying ? "Pause" : texts.listen}
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
  texts,
}: {
  item: TierItem;
  onPreview: (pos: number, deezerTrackId: number, url: string) => void;
  playingPosition: number | null;
  texts: TierlistBoardTexts;
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
        texts={texts}
      />
    </div>
  );
}

function TierRow({
  tier,
  items,
  onOpenEditor,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onPreview,
  playingPosition,
  texts,
}: {
  tier: TierConfig;
  items: TierItem[];
  onOpenEditor: (tierId: string) => void;
  onMoveUp: (tierId: string) => void;
  onMoveDown: (tierId: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onPreview: (pos: number, deezerTrackId: number, url: string) => void;
  playingPosition: number | null;
  texts: TierlistBoardTexts;
}) {
  const { id: tierId, label, color } = tier;
  const sortableIds = items.map((i) => String(i.position));
  const { setNodeRef, isOver } = useDroppable({ id: tierId });

  return (
    <div className="flex min-h-[74px] items-stretch overflow-hidden border border-black/80 bg-[#181818]">
      <div
        className="flex w-[88px] shrink-0 items-center justify-center border-r border-black/60 px-2 py-2 text-white"
        style={{ backgroundColor: color }}
      >
        <p className="select-none text-xl font-bold tracking-wide text-black/75">
          {label || texts.rowFallbackLabel}
        </p>
      </div>
      <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex min-h-[72px] flex-1 flex-wrap gap-2 bg-[#141414] p-2 transition-colors ${
            isOver
              ? "bg-[color:var(--accent)]/10"
              : ""
          }`}
        >
          {items.map((item) => (
            <SortableTrack
              key={item.position}
              item={item}
              onPreview={onPreview}
              playingPosition={playingPosition}
              texts={texts}
            />
          ))}
        </div>
      </SortableContext>
      <div className="no-export flex w-[46px] shrink-0 flex-col border-l border-black/80 bg-black">
        <button
          type="button"
          onClick={() => onOpenEditor(tierId)}
          className="inline-flex h-[24px] items-center justify-center border-b border-white/10 text-white/90 transition hover:bg-white/10"
          aria-label={texts.rowSettings}
          title={texts.rowSettings}
        >
          <Settings size={16} />
        </button>
        <button
          type="button"
          onClick={() => onMoveUp(tierId)}
          disabled={!canMoveUp}
          className="inline-flex h-[24px] items-center justify-center border-b border-white/10 text-white/90 transition enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={texts.rowMoveUp}
          title={texts.rowMoveUp}
        >
          <ChevronUp size={18} />
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(tierId)}
          disabled={!canMoveDown}
          className="inline-flex h-[24px] items-center justify-center text-white/90 transition enabled:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={texts.rowMoveDown}
          title={texts.rowMoveDown}
        >
          <ChevronDown size={18} />
        </button>
      </div>
    </div>
  );
}

function TierRowEditorModal({
  tier,
  canDelete,
  onClose,
  onColorChange,
  onLabelChange,
  onDelete,
  onClearRow,
  onAddAbove,
  onAddBelow,
  texts,
}: {
  tier: TierConfig;
  canDelete: boolean;
  onClose: () => void;
  onColorChange: (tierId: string, color: string) => void;
  onLabelChange: (tierId: string, nextLabel: string) => void;
  onDelete: (tierId: string) => void;
  onClearRow: (tierId: string) => void;
  onAddAbove: (tierId: string) => void;
  onAddBelow: (tierId: string) => void;
  texts: TierlistBoardTexts;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-4xl rounded-sm border border-white/10 bg-[#252222] px-5 py-4 text-white shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-center text-[2rem] font-extrabold leading-none">
            {texts.modalTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded text-white/90 transition hover:bg-white/10"
            aria-label="Fermer"
          >
            <X size={22} />
          </button>
        </div>
        <div className="mb-6 flex flex-wrap gap-3">
          {TIER_LABEL_COLORS.map((color) => {
            const isSelected = color === tier.color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => onColorChange(tier.id, color)}
                className={`h-9 w-9 rounded-full border-2 transition ${
                  isSelected
                    ? "scale-110 border-white"
                    : "border-white/30 hover:border-white/80"
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Choisir la couleur ${color}`}
              />
            );
          })}
        </div>
        <p className="mb-2 text-center text-[2rem] font-bold leading-none">{texts.modalEditLabel}</p>
        <textarea
          value={tier.label}
          onChange={(e) => onLabelChange(tier.id, e.target.value)}
          className="mb-5 min-h-[56px] w-full resize-y rounded border border-white/15 bg-[#ececec] px-3 py-2 text-2xl font-medium text-black outline-none focus:border-white/45"
          aria-label={texts.modalLabelInputAria}
          maxLength={24}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onDelete(tier.id)}
            disabled={!canDelete}
            className="rounded bg-[#d7d7d7] px-4 py-2 text-lg font-medium text-black transition enabled:hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {texts.deleteRow}
          </button>
          <button
            type="button"
            onClick={() => onClearRow(tier.id)}
            className="rounded bg-[#d7d7d7] px-4 py-2 text-lg font-medium text-black transition hover:bg-white"
          >
            {texts.clearRowImages}
          </button>
          <button
            type="button"
            onClick={() => onAddAbove(tier.id)}
            className="rounded bg-[#d7d7d7] px-4 py-2 text-lg font-medium text-black transition hover:bg-white"
          >
            {texts.addRowAbove}
          </button>
          <button
            type="button"
            onClick={() => onAddBelow(tier.id)}
            className="rounded bg-[#d7d7d7] px-4 py-2 text-lg font-medium text-black transition hover:bg-white"
          >
            {texts.addRowBelow}
          </button>
        </div>
      </div>
    </div>
  );
}

function PoolZone({
  poolItems,
  tracks,
  onPreview,
  playingPosition,
  texts,
}: {
  poolItems: TierItem[];
  tracks: TierItem[];
  onPreview: (pos: number, deezerTrackId: number, url: string) => void;
  playingPosition: number | null;
  texts: TierlistBoardTexts;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: POOL_ID });

  return (
    <div className="mt-6">
      <p className="text-sm font-medium text-[color:var(--muted)] mb-2">
        {formatText(texts.poolTitle, { placed: poolItems.length, total: tracks.length })}
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
              {texts.allPlaced}
            </p>
          ) : (
            poolItems.map((item) => (
              <SortableTrack
                key={item.position}
                item={item}
                onPreview={onPreview}
                playingPosition={playingPosition}
                texts={texts}
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
  texts,
}: {
  tierlistId?: string;
  tracks: TierItem[];
  onSave: (payload: TierlistSavePayload) => void;
  saving: boolean;
  texts: TierlistBoardTexts;
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
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
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
    handleInsertTier(tiers.length);
  };

  const handleInsertTier = (atIndex: number) => {
    const index = nextTierIndexRef.current;
    const id = `tier-${index + 1}`;
    const tier: TierConfig = {
      id,
      label: `Tier ${index + 1}`,
      color: getNextTierColor(index),
    };
    nextTierIndexRef.current += 1;
    setTiers((prev) => {
      const next = [...prev];
      next.splice(Math.max(0, Math.min(atIndex, next.length)), 0, tier);
      return next;
    });
    setState((prev) => ({ ...prev, [id]: [] }));
  };

  const handleAddTierAbove = (tierId: string) => {
    const index = tiers.findIndex((tier) => tier.id === tierId);
    if (index === -1) return;
    handleInsertTier(index);
  };

  const handleAddTierBelow = (tierId: string) => {
    const index = tiers.findIndex((tier) => tier.id === tierId);
    if (index === -1) return;
    handleInsertTier(index + 1);
  };

  const handleDeleteTier = (tierId: string) => {
    if (tiers.length <= 1) return;
    setEditingTierId((prev) => (prev === tierId ? null : prev));
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

  const handleTierColorChange = (tierId: string, nextColor: string) => {
    setTiers((prev) =>
      prev.map((tier) =>
        tier.id === tierId
          ? { ...tier, color: nextColor }
          : tier,
      ),
    );
  };

  const handleMoveTier = (tierId: string, direction: "up" | "down") => {
    setTiers((prev) => {
      const index = prev.findIndex((tier) => tier.id === tierId);
      if (index === -1) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      return arrayMove(prev, index, targetIndex);
    });
  };

  const handleClearTier = (tierId: string) => {
    setState((prev) => {
      const rowItems = prev[tierId] ?? [];
      if (!rowItems.length) return prev;
      return {
        ...prev,
        [tierId]: [],
        [POOL_ID]: [...(prev[POOL_ID] ?? []), ...rowItems],
      };
    });
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
        texts.pngError,
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const poolItems = state[POOL_ID] ?? [];
  const placedCount = tracks.length - poolItems.length;
  const editingTier = tiers.find((tier) => tier.id === editingTierId) ?? null;

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
        className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3 md:p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
            {texts.resultTitle}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-[color:var(--muted)]">
              {formatText(texts.rankedCount, { placed: placedCount, total: tracks.length })}
            </p>
            <button
              type="button"
              onClick={handleAddTier}
              className="no-export btn-ghost h-8 px-2 text-xs"
            >
              <Plus size={14} />
              {texts.addTier}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {tiers.map((tier, index) => (
            <TierRow
              key={tier.id}
              tier={tier}
              items={state[tier.id] ?? []}
              onOpenEditor={setEditingTierId}
              onMoveUp={(tierId) => handleMoveTier(tierId, "up")}
              onMoveDown={(tierId) => handleMoveTier(tierId, "down")}
              canMoveUp={index > 0}
              canMoveDown={index < tiers.length - 1}
              onPreview={handlePreview}
              playingPosition={playingPosition}
              texts={texts}
            />
          ))}
        </div>

        {/* Pool (morceaux non placés) */}
        <PoolZone
          poolItems={poolItems}
          tracks={tracks}
          onPreview={handlePreview}
          playingPosition={playingPosition}
          texts={texts}
        />
      </div>

      {/* Actions */}
      <div className="no-export mt-6 flex flex-col gap-3 border-t border-[color:var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[color:var(--muted)]">
          {formatText(texts.tracksRanked, { placed: placedCount, total: tracks.length })}
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="btn-primary w-full justify-center text-sm disabled:opacity-50 sm:w-auto"
          >
            <Download size={14} />
            {isDownloading ? texts.downloadGenerating : texts.downloadPng}
          </button>
          <button type="button" onClick={handleReset} className="btn-ghost w-full justify-center text-sm sm:w-auto">
            <RotateCcw size={14} /> {texts.reset}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full justify-center text-sm disabled:opacity-50 sm:w-auto"
          >
            <Share2 size={14} />
            {saving ? texts.saving : texts.saveShare}
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
            texts={texts}
          />
        ) : null}
      </DragOverlay>
      {editingTier ? (
        <TierRowEditorModal
          tier={editingTier}
          canDelete={tiers.length > 1}
          onClose={() => setEditingTierId(null)}
          onColorChange={handleTierColorChange}
          onLabelChange={handleTierLabelChange}
          onDelete={handleDeleteTier}
          onClearRow={handleClearTier}
          onAddAbove={handleAddTierAbove}
          onAddBelow={handleAddTierBelow}
          texts={texts}
        />
      ) : null}
    </DndContext>
  );
}
