import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import {
  Swords,
  Bot,
  Users,
  Trophy,
  ArrowRight,
  Zap,
} from "lucide-react";

export const metadata: Metadata = { title: "BattleFeat — MusiKlash" };

export default async function BattleFeatLandingPage() {
  // Quick leaderboard preview
  const topScores = await prisma.battleFeatSoloSession.findMany({
    where: { status: "finished" },
    select: {
      id: true,
      score: true,
      difficulty: true,
      player: { select: { username: true } },
    },
    orderBy: { score: "desc" },
    take: 5,
  });

  const artistCount = await prisma.rapArtist.count();
  const featCount = await prisma.rapFeat.count();

  const diffLabel: Record<number, string> = { 1: "Facile", 2: "Normal", 3: "Difficile" };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-1 py-5 sm:px-2 sm:py-6">
      <div className="mb-8 text-center sm:mb-10">
        <div
          className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em]"
          style={{ color: "#ff4b7d", borderColor: "rgba(255,75,125,0.35)", background: "rgba(114,18,47,0.35)" }}
        >
          <Zap size={12} />
          Mode BattleFeat
        </div>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl md:text-6xl lg:text-7xl">
          BattleFeat
        </h1>
        <p className="mx-auto mt-3 max-w-3xl text-base sm:text-lg md:text-xl lg:text-2xl" style={{ color: "#8f93a0" }}>
          Enchaînez les artistes qui ont collaboré ensemble. Solo contre IA ou duel multijoueur,
          jusqu&apos;au blocage final.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Link
          href="/battle-feat/solo"
          className="group flex flex-col rounded-[28px] border p-6 transition hover:-translate-y-1"
          style={{ borderColor: "#2a3242", background: "#10141d" }}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "rgba(255,75,125,0.12)" }}>
              <Bot size={24} style={{ color: "#ff4b7d" }} />
            </div>
            <div>
              <h2 className="text-xl font-black sm:text-2xl">Solo vs IA</h2>
              <p className="text-sm" style={{ color: "#8f93a0" }}>3 niveaux de difficulté</p>
            </div>
          </div>
          <p className="flex-1 text-base" style={{ color: "#a8adbb" }}>
            Affronte l&apos;IA dans un duel de featurings. Choisis ton artiste de départ et
            enchaîne le plus de coups possibles.
          </p>
          <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#ff4b7d] transition-all group-hover:gap-3">
            Jouer <ArrowRight size={16} />
          </div>
        </Link>

        <Link
          href="/battle-feat/room/new"
          className="group flex flex-col rounded-[28px] border p-6 transition hover:-translate-y-1"
          style={{ borderColor: "#2a3242", background: "#10141d" }}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "rgba(59,130,246,0.12)" }}>
              <Users size={24} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-black sm:text-2xl">Multijoueur</h2>
              <p className="text-sm" style={{ color: "#8f93a0" }}>En temps réel</p>
            </div>
          </div>
          <p className="flex-1 text-base" style={{ color: "#a8adbb" }}>
            Crée une room et partage le lien. Défiez-vous en temps réel sur la chaîne de
            featurings !
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-blue-400 group-hover:gap-3 transition-all">
            Créer une room <ArrowRight size={16} />
          </div>
        </Link>
      </div>

      {(artistCount > 0 || featCount > 0) && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border p-5 text-center" style={{ borderColor: "#2a3242", background: "#10141d" }}>
            <p className="text-3xl font-black text-[#ff4b7d]">{artistCount}</p>
            <p className="text-xs uppercase tracking-[0.12em]" style={{ color: "#8f93a0" }}>artistes graphe</p>
          </div>
          <div className="rounded-2xl border p-5 text-center" style={{ borderColor: "#2a3242", background: "#10141d" }}>
            <p className="text-3xl font-black text-[#ff4b7d]">{featCount}</p>
            <p className="text-xs uppercase tracking-[0.12em]" style={{ color: "#8f93a0" }}>liens feats</p>
          </div>
        </div>
      )}

      {topScores.length > 0 && (
        <div className="rounded-[30px] border p-6" style={{ borderColor: "#2a3242", background: "#10141d" }}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-black sm:text-2xl">
              <Trophy size={18} className="text-yellow-400" />
              Classement
            </h2>
            <Link
              href="/battle-feat/leaderboard"
              className="text-sm font-semibold text-[#ff4b7d] hover:underline"
            >
              Voir tout →
            </Link>
          </div>
          <div className="space-y-2.5">
            {topScores.map((s: (typeof topScores)[number], i: number) => (
              <Link
                href={`/battle-feat/results/${s.id}`}
                key={s.id}
                className="flex items-center gap-3 rounded-xl border px-4 py-3 transition hover:bg-[color:var(--surface-2)]"
                style={{ borderColor: "#252d3c", background: "#141924" }}
              >
                <span className="w-6 text-center font-bold text-sm">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </span>
                <Swords size={14} className="text-[color:var(--muted)]" />
                <span className="font-medium flex-1">
                  {s.player?.username ?? "Anonyme"}
                </span>
                <span className="text-xs text-[color:var(--muted)]">
                  {diffLabel[s.difficulty]}
                </span>
                <span className="font-bold tabular-nums text-[color:var(--accent)]">
                  {s.score} pts
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
