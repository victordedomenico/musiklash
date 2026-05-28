import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Trophy, Swords, ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Classement BattleFeat — MusiKlash" };

type DifficultyTab = "1" | "2" | "3";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: DifficultyTab }>;
}) {
  const { d = "2" } = await searchParams;
  const difficulty = parseInt(d, 10) || 2;

  const sessions = await prisma.battleFeatSoloSession.findMany({
    where: { status: "finished", difficulty },
    select: {
      id: true,
      score: true,
      difficulty: true,
      jokersUsed: true,
      moves: true,
      createdAt: true,
      player: { select: { username: true } },
    },
    orderBy: { score: "desc" },
    take: 50,
  });

  const diffConfig = [
    { value: 1, label: "Facile", color: "text-green-400" },
    { value: 2, label: "Normal", color: "text-yellow-400" },
    { value: 3, label: "Difficile", color: "text-red-400" },
  ];

  return (
    <div className="mx-auto w-full max-w-[980px] py-6">
      <Link
        href="/battle-feat"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[color:var(--muted)] hover:text-white"
      >
        <ArrowLeft size={14} /> BattleFeat
      </Link>
      <h1 className="flex items-center gap-2 text-5xl font-black tracking-[-0.03em]">
        <Trophy size={28} className="text-yellow-400" /> Classement
      </h1>
      <p className="mt-2 text-xl" style={{ color: "#8f93a0" }}>
        Top scores en mode solo
      </p>

      <div className="mt-6 inline-flex gap-2 rounded-2xl border p-1 text-sm" style={{ borderColor: "#283041", background: "#181b24" }}>
        {diffConfig.map((dc) => (
          <Link
            key={dc.value}
            href={`/battle-feat/leaderboard?d=${dc.value}`}
            className={`rounded-xl px-4 py-2 font-bold transition ${
              difficulty === dc.value
                ? "bg-white text-black"
                : "text-[color:var(--muted)] hover:text-white"
            }`}
          >
            {dc.label}
          </Link>
        ))}
      </div>

      {sessions.length === 0 ? (
        <div className="mt-10 rounded-[28px] border p-10 text-center" style={{ borderColor: "#2a3242", background: "#10141d" }}>
          <p className="text-lg font-semibold">Aucun score pour le moment.</p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">Sois le premier à jouer !</p>
          <Link href="/battle-feat/solo" className="btn-primary mt-6 inline-flex">
            <Swords size={16} /> Jouer
          </Link>
        </div>
      ) : (
        <div className="mt-7 space-y-2.5">
          {sessions.map((s: (typeof sessions)[number], i: number) => {
            const moveCount = Array.isArray(s.moves) ? s.moves.length : 0;
            return (
              <Link
                href={`/battle-feat/results/${s.id}`}
                key={s.id}
                className="flex items-center gap-3 rounded-xl border px-4 py-3 transition hover:bg-[color:var(--surface-2)]"
                style={{ borderColor: "#252d3c", background: "#141924" }}
              >
                <span className="w-8 text-center font-bold">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </span>
                <span className="font-medium flex-1 truncate">
                  {s.player?.username ?? "Anonyme"}
                </span>
                <span className="text-xs text-[color:var(--muted)] hidden sm:inline">
                  {moveCount} coup{moveCount !== 1 ? "s" : ""}
                </span>
                <span className="text-xs text-[color:var(--muted)] hidden sm:inline">
                  {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                </span>
                <span className="font-bold tabular-nums text-[color:var(--accent)]">
                  {s.score} pts
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
