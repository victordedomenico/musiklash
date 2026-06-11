import prisma from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  playerId: string;
  username: string;
  bestScore: number;
  gamesPlayed: number;
  rank: number;
};

export type GlobalLeaderboard = {
  top: LeaderboardEntry[];
  /** Ligne du joueur courant (présente même s'il est hors du top). */
  me: LeaderboardEntry | null;
  totalPlayers: number;
};

export type GameScoreEntry = {
  playerId: string;
  username: string;
  score: number;
};

// ─── Écriture ─────────────────────────────────────────────────────────────────

/**
 * Enregistre les scores d'une partie multijoueur dans le classement mondial.
 * Met à jour, par joueur : nombre de parties, score total cumulé et meilleur score (record).
 */
export async function recordGameScores(entries: GameScoreEntry[]): Promise<void> {
  const now = new Date();

  await Promise.all(
    entries.map(async (entry) => {
      const score = Math.max(0, Math.round(entry.score));
      const existing = await prisma.blindtestLeaderboard.findUnique({
        where: { playerId: entry.playerId },
      });

      if (!existing) {
        await prisma.blindtestLeaderboard.create({
          data: {
            playerId: entry.playerId,
            username: entry.username,
            bestScore: score,
            totalScore: BigInt(score),
            gamesPlayed: 1,
            bestAt: score > 0 ? now : null,
          },
        });
        return;
      }

      const isNewRecord = score > existing.bestScore;
      await prisma.blindtestLeaderboard.update({
        where: { playerId: entry.playerId },
        data: {
          username: entry.username,
          bestScore: isNewRecord ? score : existing.bestScore,
          totalScore: existing.totalScore + BigInt(score),
          gamesPlayed: existing.gamesPlayed + 1,
          bestAt: isNewRecord ? now : existing.bestAt,
        },
      });
    }),
  );
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

/** Retourne le top N et la ligne du joueur courant (avec son rang exact). */
export async function getGlobalLeaderboard(
  playerId?: string | null,
  topN = 10,
): Promise<GlobalLeaderboard> {
  const [rows, totalPlayers] = await Promise.all([
    prisma.blindtestLeaderboard.findMany({
      orderBy: [{ bestScore: "desc" }, { bestAt: "asc" }],
      take: topN,
      select: { playerId: true, username: true, bestScore: true, gamesPlayed: true },
    }),
    prisma.blindtestLeaderboard.count(),
  ]);

  const top: LeaderboardEntry[] = rows.map((r, i) => ({
    playerId: r.playerId,
    username: r.username,
    bestScore: r.bestScore,
    gamesPlayed: r.gamesPlayed,
    rank: i + 1,
  }));

  let me: LeaderboardEntry | null = null;
  if (playerId) {
    const inTop = top.find((r) => r.playerId === playerId);
    if (inTop) {
      me = inTop;
    } else {
      const mine = await prisma.blindtestLeaderboard.findUnique({
        where: { playerId },
        select: { username: true, bestScore: true, gamesPlayed: true },
      });
      if (mine) {
        const better = await prisma.blindtestLeaderboard.count({
          where: { bestScore: { gt: mine.bestScore } },
        });
        me = {
          playerId,
          username: mine.username,
          bestScore: mine.bestScore,
          gamesPlayed: mine.gamesPlayed,
          rank: better + 1,
        };
      }
    }
  }

  return { top, me, totalPlayers };
}
