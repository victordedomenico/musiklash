import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getGuestIdentityFromCookies } from "@/lib/guest";
import BracketCard, { type BracketSummary } from "@/components/BracketCard";
import TierlistCard, { type TierlistSummary } from "@/components/TierlistCard";
import BlindtestCard, { type BlindtestSummary } from "@/components/BlindtestCard";
import {
  BattleFeatRoomCard,
  BattleFeatSoloCard,
  type BattleFeatRoomSummary,
  type BattleFeatSessionSummary,
} from "@/components/BattleFeatCard";
import { Plus, Play } from "lucide-react";

export const metadata: Metadata = { title: "Ma bibliothèque — MusiKlash" };

type Visibility = "all" | "private" | "public";
type Tab = "brackets" | "tierlists" | "blindtests" | "battlefeat";

export default async function MyBracketsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: Visibility; tab?: Tab; welcome?: string }>;
}) {
  const { filter = "all", tab = "brackets", welcome } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const guestIdentity = user ? null : await getGuestIdentityFromCookies();
  const activePlayerId = user?.id ?? guestIdentity?.id ?? null;

  const visFilter =
    filter === "private" || filter === "public" ? { visibility: filter } : {};

  const [brackets, tierlists, blindtests, soloSessions, battleFeatRooms] = activePlayerId
    ? await Promise.all([
        prisma.bracket.findMany({
          where: { ownerId: activePlayerId, ...visFilter },
          select: { id: true, title: true, theme: true, size: true, visibility: true, coverUrl: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.tierlist.findMany({
          where: { ownerId: activePlayerId, ...visFilter },
          select: { id: true, title: true, theme: true, visibility: true, coverUrl: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.blindtest.findMany({
          where: { ownerId: activePlayerId, ...visFilter },
          select: {
            id: true,
            title: true,
            visibility: true,
            _count: { select: { tracks: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.battleFeatSoloSession.findMany({
          where: { playerId: activePlayerId },
          select: { id: true, difficulty: true, score: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.battleFeatRoom.findMany({
          where: {
            OR: [{ hostId: activePlayerId }, { guestId: activePlayerId }],
          },
          select: {
            id: true,
            status: true,
            hostScore: true,
            guestScore: true,
            createdAt: true,
          },
          orderBy: { updatedAt: "desc" },
        }),
      ])
    : [[], [], [], [], []];

  const bracketList = brackets.map((b) => ({ ...b, cover_url: b.coverUrl })) as BracketSummary[];
  const tierlistList = tierlists.map((t) => ({ ...t, coverUrl: t.coverUrl })) as TierlistSummary[];
  const blindtestList = blindtests.map((b) => ({
    id: b.id,
    title: b.title,
    visibility: b.visibility,
    trackCount: b._count.tracks,
  })) as BlindtestSummary[];
  const battleFeatList = soloSessions.map((s) => ({
    id: s.id,
    difficulty: s.difficulty,
    score: s.score,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
  })) as BattleFeatSessionSummary[];
  const battleFeatRoomList = battleFeatRooms.map((room) => ({
    id: room.id,
    status: room.status,
    hostScore: room.hostScore,
    guestScore: room.guestScore,
    createdAt: room.createdAt.toISOString(),
  })) as BattleFeatRoomSummary[];

  const createHref =
    tab === "tierlists"
      ? "/create-tierlist"
      : tab === "blindtests"
      ? "/create-blindtest"
      : tab === "battlefeat"
      ? "/battle-feat/solo"
      : "/create-bracket";
  const createLabel =
    tab === "tierlists"
      ? "Nouvelle tierlist"
      : tab === "blindtests"
      ? "Nouveau blindtest"
      : tab === "battlefeat"
      ? "Nouvelle partie"
      : "Nouveau bracket";

  return (
    <div className="mx-auto w-full max-w-[1500px] px-1 py-5 sm:px-2 sm:py-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-7xl">
            Ma Bibliothèque
          </h1>
          <p className="mt-2 text-base sm:text-xl lg:text-3xl" style={{ color: "#8f93a0" }}>
            Gérez vos créations et l&apos;historique de vos défis.
          </p>
        </div>
        <Link
          href={createHref}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-bold sm:w-auto sm:px-6 sm:py-4 sm:text-xl lg:text-2xl"
          style={{ background: "#ff2f6d", color: "#fff" }}
        >
          <Play size={18} /> {createLabel.replace("Nouveau ", "Nouveau ")}
        </Link>
      </div>

      {welcome ? (
        <p className="mt-4 rounded-2xl border p-3 text-sm text-[color:var(--muted)]" style={{ borderColor: "#2a3242", background: "#131822" }}>
          Compte créé 🎉 tu peux maintenant créer ton premier bracket ou ta première tierlist.
        </p>
      ) : null}
      {!user ? (
        <p className="mt-4 rounded-2xl border p-3 text-sm text-[color:var(--muted)]" style={{ borderColor: "#2a3242", background: "#131822" }}>
          Tu es en mode invité{guestIdentity?.username ? ` (${guestIdentity.username})` : ""}. Tes parties et créations restent liées à ce pseudo sur cet appareil.
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <div
          className="inline-flex w-full gap-2 overflow-x-auto rounded-2xl border p-1 lg:w-auto"
          style={{ borderColor: "#283041", background: "#181b24" }}
        >
        <TabItem current={tab} value="brackets" label={`Brackets (${brackets.length})`} />
        <TabItem current={tab} value="tierlists" label={`Tierlists (${tierlists.length})`} />
        <TabItem current={tab} value="blindtests" label={`Blindtests (${blindtests.length})`} />
        <TabItem current={tab} value="battlefeat" label={`BattleFeat (${battleFeatList.length + battleFeatRoomList.length})`} />
        </div>

      {/* Visibility filter */}
      {tab !== "battlefeat" ? (
        <div
          className="inline-flex w-full gap-2 overflow-x-auto rounded-2xl border p-1 lg:w-auto"
          style={{ borderColor: "#283041", background: "#181b24" }}
        >
          <FilterLink current={filter} value="all" label="Tous" tab={tab} />
          <FilterLink current={filter} value="private" label="Privé" tab={tab} />
          <FilterLink current={filter} value="public" label="Public" tab={tab} />
        </div>
      ) : null}
      </div>

      {tab === "brackets" ? (
        bracketList.length === 0 ? (
          <EmptyState
            label="Aucun bracket pour le moment"
            cta="Créer un bracket"
            href="/create-bracket"
          />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {bracketList.map((b) => <BracketCard key={b.id} b={b} />)}
          </div>
        )
      ) : tab === "tierlists" ? (
        tierlistList.length === 0 ? (
          <EmptyState
            label="Aucune tierlist pour le moment"
            cta="Créer une tierlist"
            href="/create-tierlist"
          />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {tierlistList.map((t) => <TierlistCard key={t.id} t={t} />)}
          </div>
        )
      ) : tab === "blindtests" ? (
        blindtestList.length === 0 ? (
          <EmptyState
            label="Aucun blindtest pour le moment"
            cta="Créer un blindtest"
            href="/create-blindtest"
          />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
            {blindtestList.map((b) => <BlindtestCard key={b.id} b={b} />)}
          </div>
        )
      ) : tab === "battlefeat" ? (
        battleFeatList.length === 0 && battleFeatRoomList.length === 0 ? (
          <EmptyState
            label="Aucune partie BattleFeat pour le moment"
            cta="Jouer"
            href="/battle-feat/solo"
          />
        ) : (
          <div className="mt-8 space-y-9">
            {battleFeatList.length > 0 ? (
              <section className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">Sessions solo</h2>
                  <p className="text-sm text-[color:var(--muted)]">
                    Tes dernières parties contre l&apos;IA.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {battleFeatList.map((s) => <BattleFeatSoloCard key={s.id} s={s} />)}
                </div>
              </section>
            ) : null}

            {battleFeatRoomList.length > 0 ? (
              <section className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">Rooms</h2>
                  <p className="text-sm text-[color:var(--muted)]">
                    Tes rooms BattleFeat partagées par lien.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {battleFeatRoomList.map((room) => <BattleFeatRoomCard key={room.id} r={room} />)}
                </div>
              </section>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}

function TabItem({ current, value, label }: { current: Tab; value: Tab; label: string }) {
  const active = current === value;
  return (
    <Link
      href={`/my-brackets?tab=${value}`}
      className="whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold tracking-wide no-underline sm:px-5 sm:text-sm"
      style={{
        background: active ? "#f3f4f6" : "transparent",
        color: active ? "#09090b" : "#868b98",
      }}
    >
      {label}
    </Link>
  );
}

function FilterLink({
  current,
  value,
  label,
  tab,
}: {
  current: Visibility;
  value: Visibility;
  label: string;
  tab: Tab;
}) {
  const href =
    value === "all"
      ? `/my-brackets?tab=${tab}`
      : `/my-brackets?tab=${tab}&filter=${value}`;
  return (
    <Link
      href={href}
      className="whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold tracking-wide no-underline sm:px-5 sm:text-sm"
      style={{
        background: current === value ? "#2f3442" : "transparent",
        color: current === value ? "#ffffff" : "#868b98",
      }}
    >
      {label}
    </Link>
  );
}

function EmptyState({ label, cta, href }: { label: string; cta: string; href: string }) {
  return (
    <div
      className="mt-10 rounded-[24px] border p-7 text-center sm:rounded-[28px] sm:p-10 lg:rounded-[34px] lg:p-16"
      style={{ borderColor: "#232b3a", background: "#10141d" }}
    >
      <p className="text-lg font-semibold sm:text-2xl lg:text-3xl" style={{ color: "#9298a8" }}>
        {label}
      </p>
      <Link href={href} className="btn-primary mt-8 inline-flex">
        <Plus size={16} /> {cta}
      </Link>
    </div>
  );
}
