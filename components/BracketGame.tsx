"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, Pause, Play, RotateCcw, Save, Share2 } from "lucide-react";
import MatchCard, { type BracketTrack } from "./MatchCard";
import { buildBracketState, totalRounds, type BracketSize, type Vote } from "@/lib/bracket";
import { bracketRoundLabel } from "@/lib/bracket-round-label";
import { downloadNodeAsPng } from "@/lib/download-png";
import { usePreviewVolume } from "@/lib/audio-volume";
import { deleteTransientBracket, saveBracketGame } from "@/app/bracket-game/[id]/actions";
import { fetchTrackDetails, fetchTrackPreview } from "@/lib/deezer-preview-client";
import {
  bracketProgressStorageKey,
  clearBracketProgress,
  makeTrackSignature,
  readBracketProgress,
  writeBracketProgress,
} from "@/lib/bracket-progress";

export default function BracketGame({
  bracketId,
  size,
  drawVersion = 1,
  tracks,
  transient = false,
  initialVotes = [],
  initialSessionId = null,
  readOnly = false,
}: {
  bracketId: string;
  size: BracketSize;
  drawVersion?: number;
  tracks: BracketTrack[];
  transient?: boolean;
  initialVotes?: Vote[];
  initialSessionId?: string | null;
  readOnly?: boolean;
}) {
  const [votes, setVotes] = useState<Vote[]>(initialVotes);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [progressReady, setProgressReady] = useState(readOnly);
  const [restoredProgress, setRestoredProgress] = useState(false);
  const savingRef = useRef(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [playingSeed, setPlayingSeed] = useState<number | null>(null);
  const [loadingSeed, setLoadingSeed] = useState<number | null>(null);
  const [treeWindowStart, setTreeWindowStart] = useState<number | null>(null);
  const [refreshedPreviewBySeed, setRefreshedPreviewBySeed] = useState<Map<number, string>>(
    () => new Map(),
  );
  const [creditsBySeed, setCreditsBySeed] = useState<
    Map<number, { artist: string | null; album: string | null }>
  >(() => new Map());
  const exportRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const promotedRef = useRef(false);
  const [promoted, setPromoted] = useState(false);
  const [sharing, setSharing] = useState(false);
  const { volume } = usePreviewVolume();
  const total = totalRounds(size);

  const trackCount = tracks.length;
  const trackSignature = useMemo(() => makeTrackSignature(tracks), [tracks]);
  const state = useMemo(
    () => buildBracketState(size, votes, trackCount, drawVersion),
    [size, votes, trackCount, drawVersion],
  );
  const tracksBySeed = useMemo(() => {
    const m = new Map<number, BracketTrack>();
    tracks.forEach((t) => m.set(t.seed, t));
    return m;
  }, [tracks]);

  const currentRoundPairings = state.rounds[state.rounds.length - 1];
  const currentRound = state.rounds.length;
  const votesByRound = useMemo(() => {
    const map = new Map<number, Map<number, number>>();
    for (const vote of votes) {
      if (!map.has(vote.round)) map.set(vote.round, new Map<number, number>());
      map.get(vote.round)?.set(vote.matchIndex, vote.winnerSeed);
    }
    return map;
  }, [votes]);

  const winnerByPairing = useMemo(() => {
    const map = new Map<string, number>();
    state.rounds.forEach((round, roundIdx) => {
      const roundNumber = roundIdx + 1;
      round.forEach((pairing) => {
        if (pairing.seedB > trackCount) {
          map.set(`${roundNumber}-${pairing.matchIndex}`, pairing.seedA);
          return;
        }
        const winnerSeed = votesByRound.get(roundNumber)?.get(pairing.matchIndex);
        if (winnerSeed !== undefined) {
          map.set(`${roundNumber}-${pairing.matchIndex}`, winnerSeed);
        }
      });
    });
    return map;
  }, [state.rounds, trackCount, votesByRound]);

  const roundsForTree = useMemo(() => state.rounds.slice(0, -1), [state.rounds]);
  const maxVisibleRounds = size >= 64 ? 4 : roundsForTree.length;
  const maxWindowStart = Math.max(0, roundsForTree.length - maxVisibleRounds);
  const defaultWindowStart = Math.max(0, roundsForTree.length - maxVisibleRounds);
  const requestedWindowStart = treeWindowStart ?? defaultWindowStart;
  const clampedWindowStart = Math.min(Math.max(0, requestedWindowStart), maxWindowStart);
  const visibleRounds = roundsForTree.slice(
    clampedWindowStart,
    clampedWindowStart + maxVisibleRounds,
  );
  const treeHasPagination = roundsForTree.length > maxVisibleRounds;

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

  // A choice is kept in this browser as soon as it is made. The server only
  // stores completed results, so this draft is what lets a large tournament
  // survive an accidental refresh or a closed tab.
  useEffect(() => {
    if (readOnly) return;
    let cancelled = false;
    try {
      const restored = readBracketProgress(
        window.localStorage.getItem(bracketProgressStorageKey(bracketId)),
        {
          bracketId,
          size,
          trackCount,
          drawVersion,
          trackSignature,
        },
      );
      queueMicrotask(() => {
        if (cancelled) return;
        if (restored?.length) {
          setVotes(restored);
          setRestoredProgress(true);
        }
        setProgressReady(true);
      });
    } catch {
      // Private browsing or disabled storage: the game remains playable.
      queueMicrotask(() => {
        if (!cancelled) setProgressReady(true);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [bracketId, drawVersion, readOnly, size, trackCount, trackSignature]);

  // Deezer preview URLs are signed and expire quickly. Once the bracket is
  // over and the tree is on screen, refresh every track's preview in the
  // background so a click immediately plays without an await (which would
  // break Safari's user-gesture requirement on audio.play()).
  const hasWinner = Boolean(state.winner);

  // An unpublished bracket remains available while it is in progress so its
  // local draft can be resumed. Delete it only after its result has been shown.
  useEffect(() => {
    if (!transient || readOnly || !hasWinner) return;
    return () => {
      if (promotedRef.current) return;
      try {
        clearBracketProgress(window.localStorage, bracketId);
      } catch {
        // Storage is optional.
      }
      void deleteTransientBracket(bracketId);
    };
  }, [transient, bracketId, hasWinner, readOnly]);

  // Auto-save the completed bracket as a replayable session, unless we are
  // in transient mode (deleted at unmount) or rendering a read-only result.
  useEffect(() => {
    if (readOnly || transient) return;
    if (!hasWinner || !state.winner) return;
    if (sessionId || savingRef.current) return;
    savingRef.current = true;
    (async () => {
      const res = await saveBracketGame(bracketId, votes, state.winner!);
      if ("id" in res) setSessionId(res.id);
    })().catch(() => {
      // ignore; user can still try via Sauvegarder et partager
    });
  }, [bracketId, hasWinner, readOnly, sessionId, state.winner, transient, votes]);

  useEffect(() => {
    if (readOnly || !progressReady) return;
    try {
      if (state.winner && sessionId) {
        clearBracketProgress(window.localStorage, bracketId);
        return;
      }
      if (votes.length === 0) {
        clearBracketProgress(window.localStorage, bracketId);
        return;
      }
      writeBracketProgress(window.localStorage, {
        bracketId,
        size,
        trackSignature,
        votes,
      });
    } catch {
      // Private browsing or disabled storage: the game remains playable.
    }
  }, [bracketId, progressReady, readOnly, sessionId, size, state.winner, trackSignature, votes]);

  useEffect(() => {
    if (!hasWinner) return;
    let cancelled = false;

    const run = async () => {
      const batchSize = 12;
      for (let i = 0; i < tracks.length; i += batchSize) {
        if (cancelled) return;
        const batch = tracks.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async (track) => {
            try {
              const details = await fetchTrackDetails(track.deezerTrackId);
              return details ? ([track.seed, details] as const) : null;
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) return;
        const valid = results.flatMap((pair) => (pair ? [pair] : []));
        if (valid.length === 0) continue;
        setCreditsBySeed((prev) => {
          const next = new Map(prev);
          for (const [seed, details] of valid) {
            next.set(seed, { artist: details.artist, album: details.album });
          }
          return next;
        });
        setRefreshedPreviewBySeed((prev) => {
          const next = new Map(prev);
          for (const [seed, details] of valid) {
            if (details.preview) next.set(seed, details.preview);
          }
          return next;
        });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [hasWinner, tracks]);

  // Bye pairings (seedB > trackCount) are auto-resolved — skip them when
  // looking for the next match to display and when counting progress.
  const realPairings = currentRoundPairings.filter((p) => tracksBySeed.has(p.seedB));
  const nextMatch = realPairings.find(
    (p) => !votes.some((v) => v.round === currentRound && v.matchIndex === p.matchIndex),
  );

  const handlePick = (matchIndex: number, winnerSeed: number) => {
    setVotes((prev) => [...prev, { round: currentRound, matchIndex, winnerSeed }]);
  };

  const restart = () => {
    setVotes([]);
    setSessionId(null);
    setRestoredProgress(false);
    savingRef.current = false;
    try {
      clearBracketProgress(window.localStorage, bracketId);
    } catch {
      // Storage is optional.
    }
  };

  const saveAndShare = async () => {
    setSharing(true);
    try {
      let effectiveSessionId = sessionId;
      if (!effectiveSessionId && state.winner) {
        const res = await saveBracketGame(bracketId, votes, state.winner);
        if ("id" in res) {
          effectiveSessionId = res.id;
          setSessionId(res.id);
        }
      }
      if (transient && !promotedRef.current) {
        promotedRef.current = true;
        setPromoted(true);
      }
      const url = effectiveSessionId
        ? `${window.location.origin}/bracket-game/${bracketId}/results/${effectiveSessionId}`
        : `${window.location.origin}/bracket-game/${bracketId}`;
      try {
        await navigator.clipboard.writeText(url);
        alert(
          transient && !promoted
            ? "Bracket sauvegardé en privé et lien copié !"
            : "Lien copié dans le presse-papiers !",
        );
      } catch {
        window.prompt("Copie le lien :", url);
      }
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = async () => {
    if (!exportRef.current) return;
    setIsDownloading(true);
    try {
      await downloadNodeAsPng(exportRef.current, {
        filename: `bracket-resultat-${bracketId}.png`,
        backgroundColor: "var(--surface)",
      });
    } catch {
      alert("Impossible de générer le PNG pour le moment. Réessaie dans quelques secondes.");
    } finally {
      setIsDownloading(false);
    }
  };

  const ensureAudio = () => {
    if (audioRef.current) return audioRef.current;
    const el = new Audio();
    el.preload = "auto";
    el.onended = () => setPlayingSeed(null);
    el.volume = volume;
    audioRef.current = el;
    return el;
  };

  const fetchAndCachePreview = async (track: BracketTrack): Promise<string | null> => {
    setLoadingSeed(track.seed);
    try {
      const fresh = await fetchTrackPreview(track.deezerTrackId);
      if (!fresh) return null;
      setRefreshedPreviewBySeed((prev) => {
        const next = new Map(prev);
        next.set(track.seed, fresh);
        return next;
      });
      return fresh;
    } catch {
      return null;
    } finally {
      setLoadingSeed((current) => (current === track.seed ? null : current));
    }
  };

  const playUrlNow = (track: BracketTrack, url: string, canRetry: boolean) => {
    const audio = ensureAudio();
    try {
      audio.pause();
    } catch {
      // ignore
    }
    audio.src = url;
    audio.currentTime = 0;
    audio.volume = volume;
    setPlayingSeed(track.seed);
    const playPromise = audio.play();
    if (!playPromise || typeof playPromise.catch !== "function") return;

    playPromise.catch(async (err: unknown) => {
      const name = (err as DOMException)?.name;
      if (name === "AbortError") return;

      // Invalidate the cached URL (likely stale/expired).
      setRefreshedPreviewBySeed((prev) => {
        if (!prev.has(track.seed)) return prev;
        const next = new Map(prev);
        next.delete(track.seed);
        return next;
      });

      if (canRetry) {
        const fresh = await fetchAndCachePreview(track);
        if (fresh) {
          playUrlNow(track, fresh, false);
          return;
        }
      }

      console.warn("[bracket] Lecture impossible", track.title, err);
      setPlayingSeed((current) => (current === track.seed ? null : current));
    });
  };

  const togglePreview = (track: BracketTrack) => {
    if (playingSeed === track.seed && audioRef.current) {
      audioRef.current.pause();
      setPlayingSeed(null);
      return;
    }

    // Only the *freshly fetched* URL is known to be playable. Initial URLs
    // from the DB are often stale (Deezer preview URLs are signed & expire
    // quickly). Play synchronously if we have a fresh one — required for
    // Safari's user-gesture policy on audio.play().
    const fresh = refreshedPreviewBySeed.get(track.seed);
    if (fresh) {
      playUrlNow(track, fresh, true);
      return;
    }

    // No fresh URL yet — fetch one then play. On Safari this loses the user
    // gesture, so autoplay may be blocked on first click; subsequent clicks
    // will hit the cached-fresh branch above.
    fetchAndCachePreview(track).then((url) => {
      if (!url) {
        console.warn("[bracket] Aucun extrait disponible pour", track.title);
        return;
      }
      playUrlNow(track, url, false);
    });
  };

  if (state.winner) {
    const champ = tracksBySeed.get(state.winner);
    const lastRound = state.rounds[state.rounds.length - 1]?.[0];
    const finalTrackA = lastRound ? tracksBySeed.get(lastRound.seedA) : undefined;
    const finalTrackB = lastRound ? tracksBySeed.get(lastRound.seedB) : undefined;
    const finalWinner = lastRound
      ? winnerByPairing.get(`${state.rounds.length}-${lastRound.matchIndex}`)
      : undefined;
    const firstVisibleRoundSideMatches = (visibleRounds[0]?.length ?? 2) / 2;
    const firstExportRoundSideMatches = (roundsForTree[0]?.length ?? 2) / 2;

    // Compact "poster" bracket: cover cells with tiny title, artist and album
    // that grow toward the center. Row height must fit 2 tracks
    // (cover + title + artist + album).
    const visibleBaseCover = 56;
    const visibleCoverStep = 6;
    const exportBaseCover = 50;
    const exportCoverStep = 5;
    const visibleRowHeight = 216;
    const exportRowHeight = 200;
    const visibleTreeMinHeight = Math.max(260, firstVisibleRoundSideMatches * visibleRowHeight);
    const exportTreeMinHeight = Math.max(420, firstExportRoundSideMatches * exportRowHeight);

    const coverSizeFor = (roundNumber: number, forExport: boolean) => {
      const base = forExport ? exportBaseCover : visibleBaseCover;
      const step = forExport ? exportCoverStep : visibleCoverStep;
      return base + Math.max(0, roundNumber - 1) * step;
    };

    const renderTrackNode = (
      track: BracketTrack | undefined,
      isWinner: boolean,
      key: string,
      forExport: boolean,
      size: number,
    ) => {
      if (!track) {
        return (
          <div key={key} className="flex w-full flex-col items-center gap-1" title="Bye">
            <div
              style={{ width: size, height: size }}
              className="rounded-md border border-dashed border-[color:var(--border)] bg-[color:var(--surface-2)]"
            />
            <p className="text-[9px] uppercase tracking-wider text-[color:var(--muted)]">Bye</p>
          </div>
        );
      }

      const isPlaying = playingSeed === track.seed;
      const isLoading = loadingSeed === track.seed;
      const btnSize = Math.max(22, Math.round(size * 0.34));
      const iconSize = Math.max(11, Math.round(btnSize * 0.55));
      const extra = creditsBySeed.get(track.seed);
      const artist = track.artist?.trim() || extra?.artist?.trim() || "";
      const album = track.album?.trim() || extra?.album?.trim() || "";

      return (
        <div
          key={key}
          className="flex w-full min-w-0 flex-col items-center gap-1"
          title={[track.title, artist, album].filter(Boolean).join(" — ")}
        >
          <div className="relative" style={{ width: size, height: size }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={track.cover_url ?? ""}
              alt={track.title}
              className={`h-full w-full rounded-md object-cover ${
                isWinner
                  ? "ring-2 ring-[color:var(--accent-2)] shadow-[0_0_0_2px_rgba(239,68,68,0.18)]"
                  : "opacity-85 ring-1 ring-[color:var(--border)]"
              }`}
            />
            {forExport ? null : (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  togglePreview(track);
                }}
                disabled={isLoading}
                style={{ width: btnSize, height: btnSize }}
                className="no-export absolute bottom-1 right-1 inline-flex items-center justify-center rounded-full bg-black/70 text-white shadow-lg ring-1 ring-white/25 transition hover:bg-black focus-visible:bg-black disabled:opacity-50"
                aria-label={isPlaying ? "Mettre en pause" : "Écouter l'extrait"}
              >
                {isLoading ? (
                  <span className="text-[10px]">…</span>
                ) : isPlaying ? (
                  <Pause size={iconSize} />
                ) : (
                  <Play size={iconSize} />
                )}
              </button>
            )}
          </div>
          <div className="w-full min-w-0 px-0.5 text-center leading-tight">
            <p
              className={`truncate text-[10px] ${
                isWinner
                  ? "font-semibold text-[color:var(--foreground)]"
                  : "text-[color:var(--foreground)]"
              }`}
            >
              {track.title}
            </p>
            <p className="h-[1.15em] truncate text-[9px] text-[color:var(--muted)]">
              {artist || "\u00a0"}
            </p>
            <p className="h-[1.15em] truncate text-[8px] text-[color:var(--muted)]/75">
              {album || "\u00a0"}
            </p>
          </div>
        </div>
      );
    };

    const renderRoundColumn = (
      round: (typeof roundsForTree)[number],
      roundNumber: number,
      side: "left" | "right",
      forExport: boolean,
    ) => {
      const half = round.length / 2;
      const matches =
        side === "left"
          ? round.filter((pairing) => pairing.matchIndex < half)
          : round.filter((pairing) => pairing.matchIndex >= half);
      const matchCount = Math.max(1, matches.length);
      const size = coverSizeFor(roundNumber, forExport);
      const columnHeight = forExport ? exportTreeMinHeight : visibleTreeMinHeight;

      const label = bracketRoundLabel(roundNumber, total);
      return (
        <div key={`${side}-${roundNumber}`} className="px-1">
          <p className="mb-2 flex items-center justify-center gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
            {side === "left" ? (
              <>
                <span>{label}</span>
                <span aria-hidden className="text-[color:var(--accent-2)]">
                  →
                </span>
              </>
            ) : (
              <>
                <span aria-hidden className="text-[color:var(--accent-2)]">
                  ←
                </span>
                <span>{label}</span>
              </>
            )}
          </p>
          <div className="relative" style={{ height: columnHeight }}>
            {matches.map((pairing, localIndex) => {
              const trackA = tracksBySeed.get(pairing.seedA);
              const trackB = tracksBySeed.get(pairing.seedB);
              const winnerSeed = winnerByPairing.get(`${roundNumber}-${pairing.matchIndex}`);
              if (!trackA) return null;

              return (
                <div
                  key={pairing.matchIndex}
                  className="absolute left-0 right-0 flex items-center justify-center"
                  style={{
                    top: `${((localIndex + 0.5) / matchCount) * 100}%`,
                    transform: "translateY(-50%)",
                  }}
                >
                  <div className="relative flex flex-col items-center gap-1">
                    <div
                      className={`pointer-events-none absolute top-1/2 h-px w-4 bg-[color:var(--border-strong)] ${
                        side === "left" ? "left-full" : "right-full"
                      }`}
                    />
                    {renderTrackNode(
                      trackA,
                      winnerSeed === pairing.seedA,
                      `${roundNumber}-${pairing.matchIndex}-a`,
                      forExport,
                      size,
                    )}
                    {renderTrackNode(
                      trackB,
                      winnerSeed === pairing.seedB,
                      `${roundNumber}-${pairing.matchIndex}-b`,
                      forExport,
                      size,
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    const renderTree = (rounds: typeof roundsForTree, startRound: number, forExport: boolean) => {
      const finalRoundNumber = startRound + rounds.length;
      const finalCoverSize = coverSizeFor(finalRoundNumber, forExport) + (forExport ? 6 : 8);
      const championSize = forExport ? 180 : 168;
      const columnMin = forExport ? 96 : 108;
      const columnMax = forExport ? 150 : 170;
      const centerMin = forExport ? 200 : 220;

      return (
        <div className={forExport ? "" : "overflow-x-auto"}>
          <div
            className={`${forExport ? "grid w-max" : "grid min-w-[960px]"} items-stretch gap-2`}
            style={{
              gridTemplateColumns: `repeat(${rounds.length}, minmax(${columnMin}px, ${columnMax}px)) minmax(${centerMin}px, 1.2fr) repeat(${rounds.length}, minmax(${columnMin}px, ${columnMax}px))`,
            }}
          >
            {rounds.map((round, roundOffset) =>
              renderRoundColumn(round, startRound + roundOffset, "left", forExport),
            )}

            <div className="relative flex flex-col items-center justify-center gap-4 px-2">
              <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                Finale
              </p>
              <div className="flex flex-col items-center gap-1.5">
                {renderTrackNode(
                  finalTrackA,
                  finalWinner === finalTrackA?.seed,
                  "final-a",
                  forExport,
                  finalCoverSize,
                )}
                {renderTrackNode(
                  finalTrackB,
                  finalWinner === finalTrackB?.seed,
                  "final-b",
                  forExport,
                  finalCoverSize,
                )}
              </div>
              {champ ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent-2)]">
                    Champion
                  </p>
                  <div
                    className="relative overflow-hidden rounded-2xl ring-4 ring-[color:var(--accent-2)] shadow-2xl"
                    style={{ width: championSize, height: championSize }}
                    title={[
                      champ.title,
                      champ.artist?.trim() || creditsBySeed.get(champ.seed)?.artist,
                      champ.album?.trim() || creditsBySeed.get(champ.seed)?.album,
                    ]
                      .filter(Boolean)
                      .join(" — ")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={champ.cover_url ?? ""}
                      alt={champ.title}
                      className="h-full w-full object-cover"
                    />
                    {forExport ? null : (
                      <button
                        type="button"
                        onClick={() => togglePreview(champ)}
                        disabled={loadingSeed === champ.seed}
                        className="no-export absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 disabled:opacity-50"
                        aria-label={
                          playingSeed === champ.seed ? "Mettre en pause" : "Écouter l'extrait"
                        }
                      >
                        {loadingSeed === champ.seed ? (
                          <span className="text-sm">…</span>
                        ) : playingSeed === champ.seed ? (
                          <Pause size={36} />
                        ) : (
                          <Play size={36} />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="max-w-[220px]">
                    <p className="truncate text-sm font-extrabold">{champ.title}</p>
                    <p className="truncate text-xs text-[color:var(--muted)]">
                      {champ.artist?.trim() || creditsBySeed.get(champ.seed)?.artist?.trim() || "\u00a0"}
                    </p>
                    <p className="truncate text-[11px] text-[color:var(--muted)]/75">
                      {champ.album?.trim() || creditsBySeed.get(champ.seed)?.album?.trim() || "\u00a0"}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {[...rounds]
              .reverse()
              .map((round, reverseOffset) =>
                renderRoundColumn(
                  round,
                  startRound + rounds.length - reverseOffset - 1,
                  "right",
                  forExport,
                ),
              )}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="card space-y-4 bg-[color:var(--surface)] p-4 md:p-6">
          {transient ? (
            <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {promoted
                ? "Résultat sauvegardé en Publié — Privé. Tu peux partager le lien."
                : "Mode non publié : ce bracket sera supprimé à la fin. Clique sur « Sauvegarder et partager » pour le conserver en Publié — Privé."}
            </p>
          ) : null}
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 md:p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              Arbre des résultats
            </h3>
            {renderTree(visibleRounds, clampedWindowStart + 1, false)}
          </div>
        </div>

        <div className="pointer-events-none fixed -left-[20000px] top-0 opacity-100">
          <div ref={exportRef} className="card w-max space-y-4 bg-[color:var(--surface)] p-5">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                Arbre des résultats
              </h3>
              {renderTree(roundsForTree, 1, true)}
            </div>
          </div>
        </div>

        {treeHasPagination ? (
          <div className="no-export flex flex-wrap items-center justify-center gap-2 text-xs text-[color:var(--muted)]">
            <button
              type="button"
              onClick={() =>
                setTreeWindowStart((prev) => Math.max(0, (prev ?? clampedWindowStart) - 1))
              }
              disabled={clampedWindowStart === 0}
              className="btn-ghost disabled:opacity-50"
            >
              Tours précédents
            </button>
            <span>
              Vue lisible: tours {clampedWindowStart + 1} à{" "}
              {Math.min(roundsForTree.length, clampedWindowStart + maxVisibleRounds)}
            </span>
            <button
              type="button"
              onClick={() =>
                setTreeWindowStart((prev) =>
                  Math.min(maxWindowStart, (prev ?? clampedWindowStart) + 1),
                )
              }
              disabled={clampedWindowStart >= maxWindowStart}
              className="btn-ghost disabled:opacity-50"
            >
              Tours suivants
            </button>
          </div>
        ) : null}

        <div className="no-export flex flex-wrap justify-center gap-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="btn-ghost disabled:opacity-50"
          >
            <Download size={16} />
            {isDownloading ? "Génération…" : "Enregistrer en PNG"}
          </button>
          <button
            onClick={saveAndShare}
            disabled={sharing}
            className="btn-primary disabled:opacity-50"
          >
            <Share2 size={16} />
            {sharing ? "…" : "Sauvegarder et partager"}
          </button>
          {readOnly ? (
            <Link href={`/bracket-game/${bracketId}`} className="btn-ghost">
              Recommencer
            </Link>
          ) : (
            <button onClick={restart} className="btn-ghost">
              <RotateCcw size={16} />
              Recommencer
            </button>
          )}
          <Link href="/my-library" className="btn-ghost">
            Ma bibliothèque
          </Link>
        </div>
      </div>
    );
  }

  if (!progressReady) {
    return (
      <div className="card p-6 text-center text-sm text-[color:var(--muted)]">
        Restauration de ton tournoi…
      </div>
    );
  }

  if (!nextMatch) {
    return (
      <div className="card p-6 text-center text-[color:var(--muted)]">
        Chargement du tour suivant…
      </div>
    );
  }

  const a = tracksBySeed.get(nextMatch.seedA);
  const b = tracksBySeed.get(nextMatch.seedB);
  if (!a || !b) {
    return (
      <div className="card p-6 text-center text-red-400">
        Impossible de trouver les pistes du duel.
      </div>
    );
  }

  const votedThisRound = votes.filter((v) => v.round === currentRound).length;

  return (
    <div className="space-y-6">
      {restoredProgress ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 shadow-[0_8px_24px_rgba(16,185,129,0.08)]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
            <Save size={16} aria-hidden />
          </span>
          <p>
            Tournoi repris : {votes.length} duel{votes.length > 1 ? "s" : ""} déjà choisi
            {votes.length > 1 ? "s" : ""}. Tes choix sont sauvegardés sur cet appareil.
          </p>
        </div>
      ) : null}
      <div className="flex items-center justify-between text-sm">
        <span className="text-[color:var(--muted)]">
          {bracketRoundLabel(currentRound, total)} — Duel {votedThisRound + 1} /{" "}
          {realPairings.length}
        </span>
        <div className="h-2 w-40 rounded-full bg-[color:var(--surface-2)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-2)]"
            style={{
              width: `${(votedThisRound / realPairings.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <MatchCard
        a={a}
        b={b}
        onPick={(seed) => handlePick(nextMatch.matchIndex, seed)}
        roundLabel={bracketRoundLabel(currentRound, total)}
      />
    </div>
  );
}
