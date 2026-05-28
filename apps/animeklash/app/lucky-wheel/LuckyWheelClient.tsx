"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dice6,
  Plus,
  Search,
  Trash2,
  Tv,
  User,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemType = "anime" | "character";

type WheelItem = {
  id: string;
  label: string;
  sublabel?: string;
  coverUrl?: string;
  type: ItemType;
};

type AnimeResult = { id: number; title: string; coverUrl: string | null; format?: string };
type CharResult = { id: number; name: string; imageUrl: string | null; animes: string[] };

// ─── Wheel colors ─────────────────────────────────────────────────────────────

const SEGMENT_COLORS = [
  "#FF4757", "#FF6B35", "#FFA502", "#2ED573",
  "#1E90FF", "#A55EEA", "#FF6B9D", "#00CEC9",
  "#FDCB6E", "#6C5CE7", "#E17055", "#00B894",
];

// ─── Canvas drawing ───────────────────────────────────────────────────────────

function drawWheel(canvas: HTMLCanvasElement, items: WheelItem[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 2;

  ctx.clearRect(0, 0, size, size);

  if (items.length === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(128,128,128,0.1)";
    ctx.fill();
    ctx.strokeStyle = "rgba(128,128,128,0.2)";
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }

  const n = items.length;
  const segAngle = (2 * Math.PI) / n;

  for (let i = 0; i < n; i++) {
    const startAngle = -Math.PI / 2 + i * segAngle;
    const endAngle = startAngle + segAngle;
    const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + segAngle / 2);

    const label = items[i].label.length > 15 ? items[i].label.slice(0, 13) + "…" : items[i].label;
    const fontSize = Math.max(9, Math.min(13, 190 / n));
    const textX = radius * 0.62;

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = "right";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 3;
    ctx.fillText(label, textX, fontSize / 3);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ─── Debounced search ─────────────────────────────────────────────────────────

function useSearch<T>(endpoint: string, query: string, enabled: boolean) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || !enabled) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(trimmed)}`, { signal: ctrl.signal });
        const json = (await res.json()) as { data?: T[] };
        setData((json.data ?? []).slice(0, 8) as T[]);
      } catch {
        // ignore abort errors
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [query, endpoint, enabled]);

  return { data: query.trim() && enabled ? data : [], loading };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LuckyWheelClient() {
  const [items, setItems] = useState<WheelItem[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<WheelItem | null>(null);
  const [rotation, setRotation] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTab, setSearchTab] = useState<ItemType>("anime");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const winnerRef = useRef<WheelItem | null>(null);

  const animeSearch = useSearch<AnimeResult>(
    "/api/anilist/search?type=anime",
    searchQuery,
    searchTab === "anime",
  );
  const charSearch = useSearch<CharResult>(
    "/api/anilist/search?type=character",
    searchQuery,
    searchTab === "character",
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawWheel(canvas, items);
  }, [items]);

  const handleTransitionEnd = useCallback(() => {
    setIsSpinning(false);
    if (winnerRef.current) setWinner(winnerRef.current);
  }, []);

  const spin = useCallback(() => {
    if (isSpinning || items.length < 2) return;

    const n = items.length;
    const winnerIdx = Math.floor(Math.random() * n);
    winnerRef.current = items[winnerIdx];

    const segAngle = 360 / n;
    const currentR = rotationRef.current;
    const winnerCenter = (winnerIdx + 0.5) * segAngle;
    const targetAngle = (90 - winnerCenter + 360) % 360;
    const delta = (targetAngle - (currentR % 360) + 360) % 360;
    const newR = currentR + 5 * 360 + delta;

    rotationRef.current = newR;
    setRotation(newR);
    setIsSpinning(true);
  }, [isSpinning, items]);

  const addAnime = useCallback((a: AnimeResult) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === `anime-${a.id}`)) return prev;
      return [...prev, {
        id: `anime-${a.id}`,
        label: a.title,
        sublabel: a.format,
        coverUrl: a.coverUrl ?? undefined,
        type: "anime" as const,
      }];
    });
  }, []);

  const addChar = useCallback((c: CharResult) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === `char-${c.id}`)) return prev;
      return [...prev, {
        id: `char-${c.id}`,
        label: c.name,
        sublabel: c.animes[0],
        coverUrl: c.imageUrl ?? undefined,
        type: "character" as const,
      }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const closeWinner = useCallback(() => {
    setWinner(null);
  }, []);

  const wheelStyle = useMemo(
    () => ({
      transform: `rotate(${rotation}deg)`,
      transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
    }),
    [rotation, isSpinning],
  );

  const canSpin = items.length >= 2 && !isSpinning;
  const activeSearch = searchTab === "anime" ? animeSearch : charSearch;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-8 lg:mb-10">
        <div className="mb-2 flex items-center gap-3">
          <Dice6 size={28} strokeWidth={1.8} style={{ color: "var(--accent)" }} />
          <h1 className="section-title">J&apos;ai de la chance</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Ajoute des animés ou personnages — tourne la roue, laisse le hasard décider.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        {/* ── Wheel ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center" style={{ width: 340, height: 340 }}>
            <div
              style={{ ...wheelStyle, width: 320, height: 320, borderRadius: "50%", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}
              onTransitionEnd={handleTransitionEnd}
            >
              <canvas ref={canvasRef} width={320} height={320} />
            </div>

            <div
              style={{
                position: "absolute", right: 2, top: "50%", transform: "translateY(-50%)",
                width: 0, height: 0,
                borderTop: "13px solid transparent", borderBottom: "13px solid transparent",
                borderRight: "22px solid var(--accent)",
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))", zIndex: 10,
              }}
            />

            <button
              onClick={spin}
              disabled={!canSpin}
              aria-label="Tourner la roue"
              style={{
                position: "absolute", width: 60, height: 60, borderRadius: "50%",
                background: canSpin ? "#ffffff" : "var(--surface-2)",
                color: canSpin ? "#111111" : "var(--muted)",
                fontWeight: 800, fontSize: 10, letterSpacing: "0.08em",
                border: "none", cursor: canSpin ? "pointer" : "not-allowed",
                boxShadow: "0 2px 16px rgba(0,0,0,0.3)", zIndex: 10,
                transition: "transform 0.1s ease, background 0.2s ease",
                userSelect: "none",
              }}
            >
              SPIN
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button onClick={spin} disabled={!canSpin} className="btn-primary px-10 py-3 text-base">
              <Dice6 size={18} />
              Tourner la roue
            </button>
            {items.length < 2 && (
              <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
                Ajoute au moins 2 éléments pour lancer
              </p>
            )}
          </div>
        </div>

        {/* ── Right panel ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <button onClick={() => setShowSearch((v) => !v)} className="btn-primary w-full">
            {showSearch ? <><X size={16} />Fermer</> : <><Plus size={16} />Ajouter un élément</>}
          </button>

          {showSearch && (
            <div
              className="rounded-2xl border p-4 space-y-3"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              {/* Type tabs */}
              <div className="flex gap-1 rounded-xl p-1" style={{ background: "var(--surface-2)" }}>
                {(["anime", "character"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setSearchTab(tab); setSearchQuery(""); }}
                    className="flex-1 rounded-lg py-1.5 text-xs font-semibold transition"
                    style={{
                      background: searchTab === tab ? "var(--accent)" : "transparent",
                      color: searchTab === tab ? "#fff" : "var(--muted)",
                    }}
                  >
                    {tab === "anime" ? "Animé" : "Personnage"}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                <input
                  className="input pl-8 text-sm"
                  placeholder={searchTab === "anime" ? "Rechercher un animé…" : "Rechercher un personnage…"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Results */}
              <div className="max-h-60 space-y-0.5 overflow-y-auto">
                {activeSearch.loading && (
                  <p className="py-3 text-center text-xs" style={{ color: "var(--muted)" }}>Recherche…</p>
                )}
                {!activeSearch.loading && searchQuery.trim() && activeSearch.data.length === 0 && (
                  <p className="py-3 text-center text-xs" style={{ color: "var(--muted)" }}>Aucun résultat</p>
                )}

                {searchTab === "anime" && (animeSearch.data as AnimeResult[]).map((a) => {
                  const alreadyAdded = items.some((i) => i.id === `anime-${a.id}`);
                  return (
                    <button
                      key={a.id}
                      onClick={() => addAnime(a)}
                      disabled={alreadyAdded}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition"
                      style={{ opacity: alreadyAdded ? 0.4 : 1, background: "transparent" }}
                      onMouseEnter={(e) => { if (!alreadyAdded) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      {a.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.coverUrl} alt="" className="h-9 w-9 flex-shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--surface-2)" }}>
                          <Tv size={14} style={{ color: "var(--muted)" }} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{a.title}</p>
                        {a.format && <p className="truncate text-xs" style={{ color: "var(--muted)" }}>{a.format}</p>}
                      </div>
                      <Plus size={14} className="ml-auto flex-shrink-0" style={{ color: "var(--muted)" }} />
                    </button>
                  );
                })}

                {searchTab === "character" && (charSearch.data as CharResult[]).map((c) => {
                  const alreadyAdded = items.some((i) => i.id === `char-${c.id}`);
                  return (
                    <button
                      key={c.id}
                      onClick={() => addChar(c)}
                      disabled={alreadyAdded}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition"
                      style={{ opacity: alreadyAdded ? 0.4 : 1, background: "transparent" }}
                      onMouseEnter={(e) => { if (!alreadyAdded) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.imageUrl} alt="" className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "var(--surface-2)" }}>
                          <User size={14} style={{ color: "var(--muted)" }} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        {c.animes[0] && <p className="truncate text-xs" style={{ color: "var(--muted)" }}>{c.animes[0]}</p>}
                      </div>
                      <Plus size={14} className="ml-auto flex-shrink-0" style={{ color: "var(--muted)" }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Items list */}
          {items.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border)" }}>
              <div
                className="border-b px-4 py-3 text-xs font-bold uppercase tracking-widest"
                style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--surface)" }}
              >
                {items.length} élément{items.length > 1 ? "s" : ""}
              </div>
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ background: "var(--surface)", borderTop: idx > 0 ? "1px solid var(--border)" : undefined }}
                >
                  <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: SEGMENT_COLORS[idx % SEGMENT_COLORS.length] }} />
                  {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.coverUrl}
                      alt=""
                      className={`h-8 w-8 flex-shrink-0 object-cover ${item.type === "character" ? "rounded-full" : "rounded-md"}`}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    {item.sublabel && <p className="truncate text-xs" style={{ color: "var(--muted)" }}>{item.sublabel}</p>}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="flex-shrink-0 rounded-lg p-1.5 transition"
                    style={{ color: "var(--muted)" }}
                    aria-label="Retirer"
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Aucun élément ajouté.
                <br />
                Commence par chercher un animé !
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Winner modal ────────────────────────────────────────────────────────── */}
      {winner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)" }}
          onClick={closeWinner}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border-strong)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeWinner}
              className="absolute right-4 top-4 rounded-xl p-2 transition"
              style={{ color: "var(--muted)" }}
              aria-label="Fermer"
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <X size={18} />
            </button>

            <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em]" style={{ color: "var(--muted)" }}>
              Le hasard a parlé !
            </p>

            {winner.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={winner.coverUrl}
                alt={winner.label}
                className={`mx-auto mb-5 h-28 w-28 object-cover shadow-xl ${winner.type === "character" ? "rounded-full" : "rounded-2xl"}`}
              />
            )}

            <h2 className="mb-1 text-2xl font-black leading-tight" style={{ color: "var(--foreground)" }}>
              {winner.label}
            </h2>
            {winner.sublabel && (
              <p className="mb-6 text-sm" style={{ color: "var(--muted)" }}>{winner.sublabel}</p>
            )}

            <div className="mb-3" />

            <button
              onClick={() => { const id = winner.id; closeWinner(); removeItem(id); }}
              className="btn-ghost w-full"
            >
              <Trash2 size={14} />
              Retirer et retourner
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
