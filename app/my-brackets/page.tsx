import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { ensureBattleFeatVisibilityColumns } from "@/lib/ensure-battle-feat-visibility-columns";
import { createClient } from "@/lib/supabase/server";
import { getGuestIdentityFromCookies } from "@/lib/guest";
import BracketCard, { type BracketSummary } from "@/components/BracketCard";
import TierlistCard, { type TierlistSummary } from "@/components/TierlistCard";
import BlindtestCard, { type BlindtestSummary } from "@/components/BlindtestCard";
import BlindtestRoomCard, { type BlindtestRoomSummary } from "@/components/BlindtestRoomCard";
import {
  BattleFeatRoomCard,
  BattleFeatSoloCard,
  type BattleFeatRoomSummary,
  type BattleFeatSessionSummary,
} from "@/components/BattleFeatCard";
import BattleFeatChallengeCard, {
  type BattleFeatChallengeSummary,
} from "@/components/BattleFeatChallengeCard";
import SessionCard, { type SessionSummary } from "@/components/SessionCard";
import { Plus, Play } from "lucide-react";

export const metadata: Metadata = { title: "Ma bibliothèque — MusiKlash" };

type Visibility = "all" | "private" | "public";
type Tab = "all" | "brackets" | "tierlists" | "blindtests" | "battlefeat";

type BattleFeatSoloChallengeDelegate = {
  findMany: (args: {
    where: Record<string, unknown>;
    select: Record<string, boolean>;
    orderBy: { createdAt: "desc" | "asc" };
  }) => Promise<
    Array<{
      id: string;
      title: string;
      difficulty: number;
      visibility: "public" | "private";
      startingArtistId: string;
      startingArtistName: string;
      startingArtistPic: string | null;
      createdAt: Date;
    }>
  >;
};

function modelHasField(modelName: string, fieldName: string): boolean {
  const runtimeDataModel = (
    prisma as unknown as {
      _runtimeDataModel?: {
        models?: Record<string, { fields?: Array<{ name: string }> }>;
      };
    }
  )._runtimeDataModel;
  return Boolean(runtimeDataModel?.models?.[modelName]?.fields?.some((field) => field.name === fieldName));
}

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
  const hasBracketGameVisibility = modelHasField("BracketGame", "visibility");
  const hasTierlistSessionVisibility = modelHasField("TierlistSession", "visibility");
  const hasBlindtestSessionVisibility = modelHasField("BlindtestSession", "visibility");
  const hasBlindtestRoomVisibility = modelHasField("BlindtestRoom", "visibility");
  const hasBattleFeatRoomVisibility = modelHasField("BattleFeatRoom", "visibility");
  const hasBattleFeatRoomParticipants = modelHasField("BattleFeatRoom", "participants");
  const hasBattleFeatRoomHostScore = modelHasField("BattleFeatRoom", "hostScore");
  const hasBattleFeatRoomGuestScore = modelHasField("BattleFeatRoom", "guestScore");
  const battleFeatSoloChallengeDelegate = (
    prisma as unknown as {
      battleFeatSoloChallenge?: BattleFeatSoloChallengeDelegate;
    }
  ).battleFeatSoloChallenge;

  const [
    brackets,
    tierlists,
    blindtests,
    blindtestRoomsRaw,
    soloSessions,
    soloChallenges,
    battleFeatRooms,
    bracketGamesRaw,
    tierlistSessionsRaw,
    blindtestSessionsRaw,
  ] = activePlayerId
    ? await (async () => {
        await ensureBattleFeatVisibilityColumns(prisma);
        return Promise.all([
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
        prisma.blindtestRoom.findMany({
          where: {
            hostId: activePlayerId,
            ...(hasBlindtestRoomVisibility ? visFilter : {}),
          },
          select: {
            id: true,
            status: true,
            ...(hasBlindtestRoomVisibility ? { visibility: true } : {}),
            createdAt: true,
            host: { select: { username: true } },
            blindtest: {
              select: {
                title: true,
                _count: { select: { tracks: true } },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.battleFeatSoloSession.findMany({
          where: { playerId: activePlayerId, ...visFilter },
          select: {
            id: true,
            difficulty: true,
            score: true,
            status: true,
            visibility: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        battleFeatSoloChallengeDelegate
          ? battleFeatSoloChallengeDelegate.findMany({
              where: { ownerId: activePlayerId, ...visFilter },
              select: {
                id: true,
                title: true,
                difficulty: true,
                visibility: true,
                startingArtistId: true,
                startingArtistName: true,
                startingArtistPic: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            })
          : Promise.resolve([]),
        prisma.battleFeatRoom.findMany({
          where: {
            hostId: activePlayerId,
            ...(hasBattleFeatRoomVisibility ? visFilter : {}),
          },
          select: {
            id: true,
            hostId: true,
            status: true,
            ...(hasBattleFeatRoomParticipants ? { participants: true } : {}),
            ...(hasBattleFeatRoomHostScore ? { hostScore: true } : {}),
            ...(hasBattleFeatRoomGuestScore ? { guestScore: true } : {}),
            ...(hasBattleFeatRoomVisibility ? { visibility: true } : {}),
            createdAt: true,
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.bracketGame.findMany({
          where: {
            playerId: activePlayerId,
            winnerSeed: { not: null },
            ...(hasBracketGameVisibility ? visFilter : {}),
          },
          select: {
            id: true,
            winnerSeed: true,
            ...(hasBracketGameVisibility ? { visibility: true } : {}),
            createdAt: true,
            bracket: {
              select: {
                id: true,
                title: true,
                theme: true,
                tracks: {
                  select: { seed: true, title: true, artist: true, coverUrl: true },
                },
              },
            },
          } as Prisma.BracketGameSelect,
          orderBy: { createdAt: "desc" },
        }),
        prisma.tierlistSession.findMany({
          where: {
            playerId: activePlayerId,
            ...(hasTierlistSessionVisibility ? visFilter : {}),
          },
          select: {
            id: true,
            ...(hasTierlistSessionVisibility ? { visibility: true } : {}),
            createdAt: true,
            tierlist: {
              select: { id: true, title: true, theme: true, coverUrl: true },
            },
          } as Prisma.TierlistSessionSelect,
          orderBy: { createdAt: "desc" },
        }),
        prisma.blindtestSession.findMany({
          where: {
            playerId: activePlayerId,
            ...(hasBlindtestSessionVisibility ? visFilter : {}),
          },
          select: {
            id: true,
            score: true,
            maxScore: true,
            ...(hasBlindtestSessionVisibility ? { visibility: true } : {}),
            createdAt: true,
            blindtest: {
              select: { id: true, title: true },
            },
          } as Prisma.BlindtestSessionSelect,
          orderBy: { createdAt: "desc" },
        }),
      ]);
      })()
    : [[], [], [], [], [], [], [], [], [], []];

  const bracketList = brackets.map((b) => ({ ...b, cover_url: b.coverUrl })) as BracketSummary[];
  const tierlistList = tierlists.map((t) => ({ ...t, coverUrl: t.coverUrl })) as TierlistSummary[];
  const blindtestList = blindtests.map((b) => ({
    id: b.id,
    title: b.title,
    visibility: b.visibility,
    trackCount: b._count.tracks,
  })) as BlindtestSummary[];
  const blindtestRoomList = blindtestRoomsRaw.map((room) => ({
    id: room.id,
    status: room.status,
    title: room.blindtest.title,
    trackCount: room.blindtest._count.tracks,
    hostName: room.host.username,
    visibility:
      "visibility" in room && typeof room.visibility === "string"
        ? room.visibility
        : "public",
    createdAt: room.createdAt.toISOString(),
    canEditVisibility: true,
  })) as BlindtestRoomSummary[];
  const battleFeatList = soloSessions.map((s) => ({
    id: s.id,
    difficulty: s.difficulty,
    score: s.score,
    status: s.status,
    visibility: s.visibility,
    createdAt: s.createdAt.toISOString(),
  })) as BattleFeatSessionSummary[];
  const battleFeatChallengeList = soloChallenges.map((c) => ({
    id: c.id,
    title: c.title,
    difficulty: c.difficulty,
    visibility: c.visibility,
    createdAt: c.createdAt.toISOString(),
    startingArtist: {
      id: c.startingArtistId,
      name: c.startingArtistName,
      pictureUrl: c.startingArtistPic,
    },
  })) as BattleFeatChallengeSummary[];
  const battleFeatRoomList = battleFeatRooms.map((room) => {
    const parts = "participants" in room && Array.isArray(room.participants)
      ? (room.participants as Array<{ score?: number }>)
      : [];
    const scoresFromParticipants = parts.map((p) => (typeof p?.score === "number" ? p.score : 0));
    const hostScore = "hostScore" in room && typeof room.hostScore === "number" ? room.hostScore : 0;
    const guestScore = "guestScore" in room && typeof room.guestScore === "number" ? room.guestScore : 0;
    const scores = scoresFromParticipants.length > 0 ? scoresFromParticipants : [hostScore, guestScore];
    return {
      id: room.id,
      status: room.status,
      playerCount: parts.length > 0 ? parts.length : scores.length,
      scores,
      visibility:
        "visibility" in room && typeof room.visibility === "string"
          ? room.visibility
          : "public",
      createdAt: room.createdAt.toISOString(),
      canEditVisibility: room.hostId === activePlayerId,
    };
  }) as BattleFeatRoomSummary[];

  const bracketGames = bracketGamesRaw as unknown as Array<{
    id: string;
    winnerSeed: number | null;
    createdAt: Date;
    visibility?: string;
    bracket: {
      id: string;
      title: string;
      theme: string | null;
      tracks: Array<{ seed: number; title: string; artist: string; coverUrl: string | null }>;
    };
  }>;
  const tierlistSessionsData = tierlistSessionsRaw as unknown as Array<{
    id: string;
    createdAt: Date;
    visibility?: string;
    tierlist: { id: string; title: string; theme: string | null; coverUrl: string | null };
  }>;
  const blindtestSessionsData = blindtestSessionsRaw as unknown as Array<{
    id: string;
    score: number;
    maxScore: number;
    createdAt: Date;
    visibility?: string;
    blindtest: { id: string; title: string };
  }>;

  const bracketSessions: SessionSummary[] = bracketGames.map((g) => {
    const winner = g.winnerSeed
      ? g.bracket.tracks.find((t) => t.seed === g.winnerSeed)
      : null;
    return {
      id: g.id,
      kind: "bracket" as const,
      parentId: g.bracket.id,
      title: g.bracket.title,
      subtitle: winner ? `${winner.title} — ${winner.artist}` : g.bracket.theme ?? null,
      createdAt: g.createdAt.toISOString(),
      coverUrl: winner?.coverUrl ?? null,
      badge: "Champion",
      visibility: ("visibility" in g && g.visibility === "public") ? "public" : "private",
    };
  });

  const tierlistSessions: SessionSummary[] = tierlistSessionsData.map((s) => ({
    id: s.id,
    kind: "tierlist" as const,
    parentId: s.tierlist.id,
    title: s.tierlist.title,
    subtitle: s.tierlist.theme ?? null,
    createdAt: s.createdAt.toISOString(),
    coverUrl: s.tierlist.coverUrl,
    visibility: ("visibility" in s && s.visibility === "public") ? "public" : "private",
  }));

  const blindtestSessions: SessionSummary[] = blindtestSessionsData.map((s) => ({
    id: s.id,
    kind: "blindtest" as const,
    parentId: s.blindtest.id,
    title: s.blindtest.title,
    subtitle: `${s.score} / ${s.maxScore} pts`,
    createdAt: s.createdAt.toISOString(),
    coverUrl: null,
    visibility: ("visibility" in s && s.visibility === "public") ? "public" : "private",
  }));

  const libraryEditor = Boolean(activePlayerId);
  const totalCount =
    bracketList.length +
    tierlistList.length +
    blindtestList.length +
    blindtestRoomList.length +
    battleFeatList.length +
    battleFeatChallengeList.length +
    battleFeatRoomList.length +
    bracketSessions.length +
    tierlistSessions.length +
    blindtestSessions.length;

  const createHref =
    tab === "tierlists"
      ? "/create-tierlist"
      : tab === "blindtests"
      ? "/create-blindtest"
      : tab === "battlefeat"
      ? "/create-battlefeat"
      : "/create-bracket";
  const createLabel =
    tab === "tierlists"
      ? "Nouvelle tierlist"
      : tab === "blindtests"
      ? "Nouveau blindtest"
      : tab === "battlefeat"
      ? "Nouveau BattleFeat solo"
      : "Nouveau bracket";

  return (
    <div className="mx-auto w-full max-w-[1500px] px-1 py-5 sm:px-2 sm:py-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-7xl">
            Ma Bibliothèque
          </h1>
          <p className="mt-2 text-base sm:text-xl lg:text-3xl" style={{ color: "#8f93a0" }}>
            Retrouve toutes tes créations et tes résultats, en public ou en privé.
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
        <TabItem current={tab} value="all" label={`Tous (${totalCount})`} />
        <TabItem current={tab} value="brackets" label={`Brackets (${brackets.length})`} />
        <TabItem current={tab} value="tierlists" label={`Tierlists (${tierlists.length})`} />
        <TabItem current={tab} value="blindtests" label={`Blindtests (${blindtests.length + blindtestRoomList.length})`} />
        <TabItem current={tab} value="battlefeat" label={`BattleFeat (${battleFeatList.length + battleFeatChallengeList.length + battleFeatRoomList.length})`} />
        </div>

      {/* Visibility filter */}
      <div
        className="inline-flex w-full gap-2 overflow-x-auto rounded-2xl border p-1 lg:w-auto"
        style={{ borderColor: "#283041", background: "#181b24" }}
      >
        <FilterLink current={filter} value="all" label="Tous" tab={tab} />
        <FilterLink current={filter} value="private" label="Publié — Privé" tab={tab} />
        <FilterLink current={filter} value="public" label="Publié — Public" tab={tab} />
      </div>
      </div>

      {tab === "all" ? (
        totalCount === 0 &&
        bracketSessions.length === 0 &&
        tierlistSessions.length === 0 &&
        blindtestSessions.length === 0 ? (
          <EmptyState
            label="Aucun élément dans ta bibliothèque pour le moment"
            cta="Créer un bracket"
            href="/create-bracket"
          />
        ) : (
          <div className="mt-8 space-y-10">
            {bracketList.length > 0 || bracketSessions.length > 0 ? (
              <section className="space-y-6">
                <h2 className="text-2xl font-bold">Brackets</h2>
                <SubSection label="Mes créations">
                  {bracketList.length === 0 ? (
                    <EmptySub label="Aucun bracket créé." />
                  ) : (
                    <CardsGrid>
                      {bracketList.map((b) => (
                        <BracketCard key={b.id} b={b} libraryEditor={libraryEditor} />
                      ))}
                    </CardsGrid>
                  )}
                </SubSection>
                <SubSection label="Mes résultats">
                  {bracketSessions.length === 0 ? (
                    <EmptySub label="Aucune partie terminée." />
                  ) : (
                    <CardsGrid>
                      {bracketSessions.map((s) => (
                        <SessionCard key={s.id} session={s} libraryEditor={libraryEditor} />
                      ))}
                    </CardsGrid>
                  )}
                </SubSection>
              </section>
            ) : null}

            {tierlistList.length > 0 || tierlistSessions.length > 0 ? (
              <section className="space-y-6">
                <h2 className="text-2xl font-bold">Tierlists</h2>
                <SubSection label="Mes créations">
                  {tierlistList.length === 0 ? (
                    <EmptySub label="Aucune tierlist créée." />
                  ) : (
                    <CardsGrid>
                      {tierlistList.map((t) => (
                        <TierlistCard key={t.id} t={t} libraryEditor={libraryEditor} />
                      ))}
                    </CardsGrid>
                  )}
                </SubSection>
                <SubSection label="Mes résultats">
                  {tierlistSessions.length === 0 ? (
                    <EmptySub label="Aucune tierlist sauvegardée." />
                  ) : (
                    <CardsGrid>
                      {tierlistSessions.map((s) => (
                        <SessionCard key={s.id} session={s} libraryEditor={libraryEditor} />
                      ))}
                    </CardsGrid>
                  )}
                </SubSection>
              </section>
            ) : null}

            {blindtestList.length > 0 || blindtestRoomList.length > 0 || blindtestSessions.length > 0 ? (
              <section className="space-y-6">
                <h2 className="text-2xl font-bold">Blindtests</h2>
                <SubSection label="Mes créations">
                  {blindtestList.length === 0 ? (
                    <EmptySub label="Aucun blindtest créé." />
                  ) : (
                    <CardsGrid>
                      {blindtestList.map((b) => (
                        <BlindtestCard key={b.id} b={b} libraryEditor={libraryEditor} />
                      ))}
                    </CardsGrid>
                  )}
                </SubSection>
                <SubSection label="Mes résultats multijoueur">
                  {blindtestRoomList.length === 0 ? (
                    <EmptySub label="Aucun résultat multijoueur." />
                  ) : (
                    <CardsGrid>
                      {blindtestRoomList.map((room) => (
                        <BlindtestRoomCard key={room.id} room={room} libraryEditor={libraryEditor} />
                      ))}
                    </CardsGrid>
                  )}
                </SubSection>
                <SubSection label="Mes résultats solo">
                  {blindtestSessions.length === 0 ? (
                    <EmptySub label="Aucun résultat solo." />
                  ) : (
                    <CardsGrid>
                      {blindtestSessions.map((s) => (
                        <SessionCard key={s.id} session={s} libraryEditor={libraryEditor} />
                      ))}
                    </CardsGrid>
                  )}
                </SubSection>
              </section>
            ) : null}

            {battleFeatList.length > 0 || battleFeatChallengeList.length > 0 || battleFeatRoomList.length > 0 ? (
              <section className="space-y-4">
                <h2 className="text-2xl font-bold">BattleFeat</h2>
                {battleFeatChallengeList.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-[color:var(--muted)]">Mes créations</p>
                    <CardsGrid>
                      {battleFeatChallengeList.map((c) => (
                        <BattleFeatChallengeCard key={c.id} c={c} libraryEditor={libraryEditor} />
                      ))}
                    </CardsGrid>
                  </div>
                ) : null}
                {battleFeatList.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-[color:var(--muted)]">Mes résultats solo / solo vs IA</p>
                    <CardsGrid>
                      {battleFeatList.map((s) => (
                        <BattleFeatSoloCard key={s.id} s={s} libraryEditor={libraryEditor} />
                      ))}
                    </CardsGrid>
                  </div>
                ) : null}
                {battleFeatRoomList.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-[color:var(--muted)]">Mes résultats multijoueur</p>
                    <CardsGrid>
                      {battleFeatRoomList.map((room) => (
                        <BattleFeatRoomCard key={room.id} r={room} libraryEditor={libraryEditor} />
                      ))}
                    </CardsGrid>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        )
      ) : tab === "brackets" ? (
        bracketList.length === 0 && bracketSessions.length === 0 ? (
          <EmptyState
            label="Aucun bracket pour le moment"
            cta="Créer un bracket"
            href="/create-bracket"
          />
        ) : (
          <div className="mt-8 space-y-8">
            <SubSection label="Mes créations">
              {bracketList.length === 0 ? (
                <EmptySub label="Aucun bracket créé." />
              ) : (
                <CardsGrid>
                  {bracketList.map((b) => (
                    <BracketCard key={b.id} b={b} libraryEditor={libraryEditor} />
                  ))}
                </CardsGrid>
              )}
            </SubSection>
            <SubSection label="Mes résultats">
              {bracketSessions.length === 0 ? (
                <EmptySub label="Aucune partie terminée." />
              ) : (
                <CardsGrid>
                  {bracketSessions.map((s) => (
                    <SessionCard key={s.id} session={s} libraryEditor={libraryEditor} />
                  ))}
                </CardsGrid>
              )}
            </SubSection>
          </div>
        )
      ) : tab === "tierlists" ? (
        tierlistList.length === 0 && tierlistSessions.length === 0 ? (
          <EmptyState
            label="Aucune tierlist pour le moment"
            cta="Créer une tierlist"
            href="/create-tierlist"
          />
        ) : (
          <div className="mt-8 space-y-8">
            <SubSection label="Mes créations">
              {tierlistList.length === 0 ? (
                <EmptySub label="Aucune tierlist créée." />
              ) : (
                <CardsGrid>
                  {tierlistList.map((t) => (
                    <TierlistCard key={t.id} t={t} libraryEditor={libraryEditor} />
                  ))}
                </CardsGrid>
              )}
            </SubSection>
            <SubSection label="Mes résultats">
              {tierlistSessions.length === 0 ? (
                <EmptySub label="Aucune tierlist sauvegardée." />
              ) : (
                <CardsGrid>
                  {tierlistSessions.map((s) => (
                    <SessionCard key={s.id} session={s} libraryEditor={libraryEditor} />
                  ))}
                </CardsGrid>
              )}
            </SubSection>
          </div>
        )
      ) : tab === "blindtests" ? (
        blindtestList.length === 0 && blindtestRoomList.length === 0 && blindtestSessions.length === 0 ? (
          <EmptyState
            label="Aucun blindtest pour le moment"
            cta="Créer un blindtest"
            href="/create-blindtest"
          />
        ) : (
          <div className="mt-8 space-y-8">
            <SubSection label="Mes créations">
              {blindtestList.length === 0 ? (
                <EmptySub label="Aucun blindtest créé." />
              ) : (
                <CardsGrid>
                  {blindtestList.map((b) => (
                    <BlindtestCard key={b.id} b={b} libraryEditor={libraryEditor} />
                  ))}
                </CardsGrid>
              )}
            </SubSection>
            <SubSection label="Mes résultats multijoueur">
              {blindtestRoomList.length === 0 ? (
                <EmptySub label="Aucun résultat multijoueur." />
              ) : (
                <CardsGrid>
                  {blindtestRoomList.map((room) => (
                    <BlindtestRoomCard key={room.id} room={room} libraryEditor={libraryEditor} />
                  ))}
                </CardsGrid>
              )}
            </SubSection>
            <SubSection label="Mes résultats solo">
              {blindtestSessions.length === 0 ? (
                <EmptySub label="Aucun résultat solo." />
              ) : (
                <CardsGrid>
                  {blindtestSessions.map((s) => (
                    <SessionCard key={s.id} session={s} libraryEditor={libraryEditor} />
                  ))}
                </CardsGrid>
              )}
            </SubSection>
          </div>
        )
      ) : tab === "battlefeat" ? (
        battleFeatList.length === 0 && battleFeatChallengeList.length === 0 && battleFeatRoomList.length === 0 ? (
          <EmptyState
            label="Aucune partie BattleFeat pour le moment"
            cta="Créer un BattleFeat solo"
            href="/create-battlefeat"
          />
        ) : (
          <div className="mt-8 space-y-9">
            {battleFeatChallengeList.length > 0 ? (
              <section className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">Mes créations</h2>
                  <p className="text-sm text-[color:var(--muted)]">
                    Tes BattleFeats solo rejouables.
                  </p>
                </div>
                <CardsGrid>
                  {battleFeatChallengeList.map((c) => (
                    <BattleFeatChallengeCard key={c.id} c={c} libraryEditor={libraryEditor} />
                  ))}
                </CardsGrid>
              </section>
            ) : null}

            {battleFeatList.length > 0 ? (
              <section className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">Mes résultats solo / solo vs IA</h2>
                  <p className="text-sm text-[color:var(--muted)]">
                    Tes dernières parties BattleFeat solo.
                  </p>
                </div>
                <CardsGrid>
                  {battleFeatList.map((s) => (
                    <BattleFeatSoloCard key={s.id} s={s} libraryEditor={libraryEditor} />
                  ))}
                </CardsGrid>
              </section>
            ) : null}

            {battleFeatRoomList.length > 0 ? (
              <section className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">Mes résultats multijoueur</h2>
                  <p className="text-sm text-[color:var(--muted)]">
                    Tes rooms BattleFeat en mode multijoueur.
                  </p>
                </div>
                <CardsGrid>
                  {battleFeatRoomList.map((room) => (
                    <BattleFeatRoomCard key={room.id} r={room} libraryEditor={libraryEditor} />
                  ))}
                </CardsGrid>
              </section>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}

function SubSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-[color:var(--muted)]">{label}</p>
      {children}
    </div>
  );
}

function EmptySub({ label }: { label: string }) {
  return (
    <p
      className="rounded-xl border px-3 py-3 text-xs text-[color:var(--muted)]"
      style={{ borderColor: "#232b3a", background: "#10141d" }}
    >
      {label}
    </p>
  );
}

function CardsGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">{children}</div>
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
