import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import BracketCard, { type BracketSummary } from "@/components/BracketCard";
import TierlistCard, { type TierlistSummary } from "@/components/TierlistCard";
import BlindtestCard, { type BlindtestSummary } from "@/components/BlindtestCard";
import { Search, Zap, ArrowRight } from "lucide-react";
import { getI18n } from "@/lib/i18n";

export const metadata: Metadata = { title: "Explorer — MusiKlash" };

type Tab = "brackets" | "tierlists" | "blindtests";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  const { q, tab: rawTab = "brackets" } = await searchParams;
  const tab: Tab = rawTab === "tierlists" || rawTab === "blindtests" ? rawTab : "brackets";
  const term = q?.trim();
  const { t } = await getI18n();
  const e = t.explore;

  const textFilter = term
    ? { OR: [{ title: { contains: term, mode: "insensitive" as const } }, { theme: { contains: term, mode: "insensitive" as const } }] }
    : {};
  const blindtestTextFilter = term
    ? { title: { contains: term, mode: "insensitive" as const } }
    : {};

  const [brackets, tierlists, blindtests] = await Promise.all([
    prisma.bracket.findMany({
      where: { visibility: "public", ...textFilter },
      select: { id: true, title: true, theme: true, size: true, visibility: true, coverUrl: true },
      orderBy: { createdAt: "desc" },
      take: 48,
    }),
    prisma.tierlist.findMany({
      where: { visibility: "public", ...textFilter },
      select: { id: true, title: true, theme: true, visibility: true, coverUrl: true },
      orderBy: { createdAt: "desc" },
      take: 48,
    }),
    prisma.blindtest.findMany({
      where: { visibility: "public", ...blindtestTextFilter },
      select: {
        id: true,
        title: true,
        visibility: true,
        _count: { select: { tracks: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 48,
    }),
  ]);

  const bracketList = brackets.map((b) => ({ ...b, cover_url: b.coverUrl })) as BracketSummary[];
  const tierlistList = tierlists as TierlistSummary[];
  const blindtestList = blindtests.map((b) => ({
    id: b.id,
    title: b.title,
    visibility: b.visibility,
    trackCount: b._count.tracks,
  })) as BlindtestSummary[];

  const activeList =
    tab === "tierlists" ? tierlistList : tab === "blindtests" ? blindtestList : bracketList;
  const isEmpty = activeList.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-1 py-5 sm:px-2 sm:py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-7xl">{e.title}</h1>
          <p className="mt-2 text-base sm:text-xl lg:text-3xl" style={{ color: "#8f93a0" }}>
            {e.subtitle}
          </p>
        </div>
        <div
          className="inline-flex w-full gap-2 overflow-x-auto rounded-2xl border p-1 lg:w-auto"
          style={{ borderColor: "#283041", background: "#181b24" }}
        >
          {[
            { key: "brackets", label: "TOUS" },
            { key: "tierlists", label: "TIERLIST" },
            { key: "blindtests", label: "BLINDTEST" },
          ].map((item) => {
            const active = tab === item.key || (item.key === "brackets" && tab === "brackets");
            return (
              <Link
                key={item.key}
                href={`/explore?tab=${item.key}${term ? `&q=${encodeURIComponent(term)}` : ""}`}
                className="whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold tracking-wide no-underline sm:px-5 sm:text-sm lg:px-6"
                style={{
                  background: active ? "#f3f4f6" : "transparent",
                  color: active ? "#09090b" : "#868b98",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <form action="/explore" method="get" className="mt-8 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
        <input
          defaultValue={term ?? ""}
          name="q"
          placeholder={e.searchPlaceholder}
          className="input h-14 rounded-2xl pl-11 text-lg sm:h-16 sm:rounded-[22px] sm:pl-12 sm:text-2xl lg:h-20 lg:rounded-[26px] lg:pl-14 lg:text-4xl"
          style={{ background: "#171a23", borderColor: "#2a3242" }}
        />
        <input type="hidden" name="tab" value={tab} />
      </form>

      <div className="mt-5 flex items-center justify-end">
        <Link
          href="/battle-feat"
          className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold"
          style={{ borderColor: "#2a3242", color: "#ff4b7d", background: "rgba(255,75,125,0.08)" }}
        >
          <Zap size={14} />
          BattleFeat
          <ArrowRight size={13} />
        </Link>
      </div>

      {isEmpty ? (
        <div
          className="mt-10 rounded-[26px] border p-7 text-center sm:rounded-[30px] sm:p-10 lg:rounded-[34px] lg:p-14"
          style={{ borderColor: "#232b3a", background: "#10141d" }}
        >
          <p className="text-lg font-semibold">
            {e.emptyTitle}{" "}
            {term ? e.emptyFor.replace("{term}", term) : e.emptyDefault}.
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">{e.emptyHint}</p>
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            {tab === "blindtests" ? (
              <Link href="/create-blindtest" className="btn-primary inline-flex">{e.createBlindtest}</Link>
            ) : tab === "tierlists" ? (
              <Link href="/create-tierlist" className="btn-primary inline-flex">{e.createTierlist}</Link>
            ) : (
              <Link href="/create-bracket" className="btn-primary inline-flex">{e.createBracket}</Link>
            )}
          </div>
        </div>
      ) : tab === "brackets" ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {bracketList.map((b) => <BracketCard key={b.id} b={b} />)}
        </div>
      ) : tab === "tierlists" ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {tierlistList.map((tl) => <TierlistCard key={tl.id} t={tl} />)}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {blindtestList.map((b) => <BlindtestCard key={b.id} b={b} />)}
        </div>
      )}
    </div>
  );
}
