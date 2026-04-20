"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, Share2, Trophy } from "lucide-react";
import MatchCard, { type BracketTrack } from "./MatchCard";
import {
  buildBracketState,
  totalRounds,
  type BracketSize,
  type Vote,
} from "@/lib/bracket";
import { downloadNodeAsPng } from "@/lib/download-png";

function roundLabel(round: number, total: number) {
  const remaining = total - round + 1;
  if (round === total) return "Finale";
  if (remaining === 2) return "Demi-finale";
  if (remaining === 3) return "Quarts de finale";
  if (remaining === 4) return "Huitièmes de finale";
  return `Tour ${round}`;
}

export default function BracketGame({
  bracketId,
  size,
  tracks,
}: {
  bracketId: string;
  size: BracketSize;
  tracks: BracketTrack[];
}) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const total = totalRounds(size);

  const trackCount = tracks.length;
  const state = useMemo(
    () => buildBracketState(size, votes, trackCount),
    [size, votes, trackCount],
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
        const winnerSeed = votesByRound
          .get(roundNumber)
          ?.get(pairing.matchIndex);
        if (winnerSeed !== undefined) {
          map.set(`${roundNumber}-${pairing.matchIndex}`, winnerSeed);
        }
      });
    });
    return map;
  }, [state.rounds, trackCount, votesByRound]);

  const finalRanking = useMemo(() => {
    if (!state.winner) return [];

    const eliminatedAtRound = new Map<number, number>();
    state.rounds.forEach((round, roundIdx) => {
      const roundNumber = roundIdx + 1;
      for (const pairing of round) {
        const winnerSeed = winnerByPairing.get(
          `${roundNumber}-${pairing.matchIndex}`,
        );
        if (winnerSeed === undefined) continue;
        const loserSeed =
          winnerSeed === pairing.seedA ? pairing.seedB : pairing.seedA;
        if (loserSeed <= trackCount) {
          eliminatedAtRound.set(loserSeed, roundNumber);
        }
      }
    });
    eliminatedAtRound.set(state.winner, total + 1);

    return tracks
      .map((track) => ({
        ...track,
        score: eliminatedAtRound.get(track.seed) ?? 0,
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.seed - b.seed;
      });
  }, [state.winner, state.rounds, winnerByPairing, trackCount, total, tracks]);

  // Bye pairings (seedB > trackCount) are auto-resolved — skip them when
  // looking for the next match to display and when counting progress.
  const realPairings = currentRoundPairings.filter((p) =>
    tracksBySeed.has(p.seedB),
  );
  const nextMatch = realPairings.find(
    (p) =>
      !votes.some(
        (v) => v.round === currentRound && v.matchIndex === p.matchIndex,
      ),
  );

  const handlePick = (matchIndex: number, winnerSeed: number) => {
    setVotes((prev) => [
      ...prev,
      { round: currentRound, matchIndex, winnerSeed },
    ]);
  };

  const share = async () => {
    const url = `${window.location.origin}/bracket-game/${bracketId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("Lien copié dans le presse-papiers !");
    } catch {
      window.prompt("Copie le lien :", url);
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
      alert(
        "Impossible de générer le PNG pour le moment. Réessaie dans quelques secondes.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (state.winner) {
    const champ = tracksBySeed.get(state.winner);
    return (
      <div className="space-y-6">
        <div ref={exportRef} className="card space-y-6 p-6 md:p-8">
          <div className="text-center">
            <Trophy className="mx-auto text-yellow-400" size={48} />
            <p className="mt-2 text-sm uppercase tracking-widest text-[color:var(--muted)]">
              Champion
            </p>
            {champ ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={champ.cover_url ?? ""}
                  alt={champ.title}
                  className="mx-auto mt-6 h-44 w-44 rounded-2xl object-cover shadow-2xl"
                />
                <h2 className="mt-4 text-3xl font-black">{champ.title}</h2>
                <p className="text-[color:var(--muted)]">{champ.artist}</p>
              </>
            ) : null}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              Arbre des résultats
            </h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {state.rounds.map((round, roundIdx) => (
                <div
                  key={roundIdx}
                  className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3"
                >
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                    {roundLabel(roundIdx + 1, total)}
                  </p>
                  <div className="space-y-2">
                    {round.map((pairing) => {
                      const winnerSeed = winnerByPairing.get(
                        `${roundIdx + 1}-${pairing.matchIndex}`,
                      );
                      const trackA = tracksBySeed.get(pairing.seedA);
                      const trackB = tracksBySeed.get(pairing.seedB);
                      if (!trackA) return null;

                      return (
                        <div
                          key={pairing.matchIndex}
                          className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-2"
                        >
                          <p
                            className={`truncate text-xs ${
                              winnerSeed === pairing.seedA
                                ? "font-semibold text-[color:var(--foreground)]"
                                : "text-[color:var(--muted)]"
                            }`}
                          >
                            {trackA.title}
                          </p>
                          {trackB ? (
                            <p
                              className={`truncate text-xs ${
                                winnerSeed === pairing.seedB
                                  ? "font-semibold text-[color:var(--foreground)]"
                                  : "text-[color:var(--muted)]"
                              }`}
                            >
                              {trackB.title}
                            </p>
                          ) : (
                            <p className="truncate text-xs text-[color:var(--muted)]">
                              Bye
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
              Classement final
            </h3>
            <div className="space-y-2">
              {finalRanking.map((track, index) => (
                <div
                  key={track.seed}
                  className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{track.title}</p>
                    <p className="truncate text-xs text-[color:var(--muted)]">
                      {track.artist}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="no-export flex flex-wrap justify-center gap-2">
          <button onClick={share} className="btn-ghost">
            <Share2 size={16} /> Partager
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="btn-primary disabled:opacity-50"
          >
            <Download size={16} />
            {isDownloading ? "Génération…" : "Télécharger en PNG"}
          </button>
          <button
            onClick={() => setVotes([])}
            className="btn-primary"
          >
            Rejouer
          </button>
          <Link href="/my-brackets" className="btn-ghost">
            Ma bibliothèque
          </Link>
        </div>
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
      <div className="flex items-center justify-between text-sm">
        <span className="text-[color:var(--muted)]">
          {roundLabel(currentRound, total)} — Duel {votedThisRound + 1} /{" "}
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
        roundLabel={roundLabel(currentRound, total)}
      />
    </div>
  );
}
