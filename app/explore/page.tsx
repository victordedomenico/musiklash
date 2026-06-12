import Link from "next/link";
import prisma from "@/lib/prisma";
import { ensureBattleFeatVisibilityColumns } from "@/lib/ensure-battle-feat-visibility-columns";
import { ensureGenreColumns } from "@/lib/ensure-genre-columns";
import { MUSIC_GENRES, genreLabel, isMusicGenre, type MusicGenre } from "@/lib/genres";
import BracketCard, { type BracketSummary } from "@/components/BracketCard";
import TierlistCard, { type TierlistSummary } from "@/components/TierlistCard";
import BlindtestCard, { type BlindtestSummary } from "@/components/BlindtestCard";
import BlindtestRoomCard, { type BlindtestRoomSummary } from "@/components/BlindtestRoomCard";
import { BattleFeatRoomCard, type BattleFeatRoomSummary } from "@/components/BattleFeatCard";
import BattleFeatChallengeCard, {
  type BattleFeatChallengeSummary,
} from "@/components/BattleFeatChallengeCard";
import {
  StreamClashCard,
  StreamClashRoomCard,
  type StreamClashRoomSummary,
  type StreamClashSummary,
} from "@/components/StreamClashCard";
import {
  SmashPassCard,
  SmashPassRoomCard,
  type SmashPassRoomSummary,
  type SmashPassSummary,
} from "@/components/SmashPassExploreCard";
import { Search } from "lucide-react";
import { getI18n } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Explorer les jeux musicaux",
  description:
    "Découvrez des brackets, tierlists, blindtests, défis BattleFeat et Stream Clash créés par la communauté MusiKlash.",
  path: "/explore",
});

type Tab =
  | "all"
  | "brackets"
  | "tierlists"
  | "blindtests"
  | "battlefeat"
  | "streamclash"
  | "smashpass";

type BattleFeatSoloChallengeDelegate = {
  findMany: (args: {
    where: Record<string, unknown>;
    select: Record<string, unknown>;
    orderBy: { createdAt: "desc" | "asc" };
    take: number;
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
      owner: { username: string } | null;
    }>
  >;
};

function parseTab(raw: string | undefined): Tab {
  const v = [
    "all",
    "brackets",
    "tierlists",
    "blindtests",
    "battlefeat",
    "streamclash",
    "smashpass",
  ] as const;
  return raw && (v as readonly string[]).includes(raw) ? (raw as Tab) : "all";
}

function modelHasField(modelName: string, fieldName: string): boolean {
  const runtime = (
    prisma as unknown as {
      _runtimeDataModel?: {
        models?: Record<string, { fields?: Array<{ name: string }> }>;
      };
    }
  )._runtimeDataModel;
  const model = runtime?.models?.[modelName];
  if (!model?.fields) return false;
  return model.fields.some((f) => f.name === fieldName);
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string; genre?: string }>;
}) {
  const { q, tab: rawTab, genre: rawGenre } = await searchParams;
  const tab = parseTab(rawTab);
  const term = q?.trim();
  const genre: MusicGenre | null = rawGenre && isMusicGenre(rawGenre) ? rawGenre : null;
  const { t, locale } = await getI18n();
  const e = t.explore;

  const exploreUrl = (overrides: { tab?: Tab; genre?: MusicGenre | null }) => {
    const nextTab = "tab" in overrides && overrides.tab ? overrides.tab : tab;
    const nextGenre = "genre" in overrides ? (overrides.genre ?? null) : genre;
    const params = new URLSearchParams({ tab: nextTab });
    if (term) params.set("q", term);
    if (nextGenre) params.set("genre", nextGenre);
    return `/explore?${params.toString()}`;
  };

  const textFilter = term
    ? {
        OR: [
          { title: { contains: term, mode: "insensitive" as const } },
          { theme: { contains: term, mode: "insensitive" as const } },
        ],
      }
    : {};
  const blindtestTextFilter = term
    ? { title: { contains: term, mode: "insensitive" as const } }
    : {};

  const streamClashTextFilter = term
    ? { title: { contains: term, mode: "insensitive" as const } }
    : {};

  const smashPassTextFilter = term
    ? { title: { contains: term, mode: "insensitive" as const } }
    : {};

  // Only filter on genre when the Prisma client knows the field; the DB column
  // itself is guaranteed by ensureGenreColumns below.
  const genreFilter = genre && modelHasField("Bracket", "genre") ? { genre } : {};
  const hasContentGenre = modelHasField("Bracket", "genre");
  const genreSelect = hasContentGenre ? ({ genre: true } as const) : {};

  const takeGrid = tab === "all" ? 12 : 48;
  const takeBfChallenge = tab === "all" ? 8 : 36;
  const takeBfRoom = tab === "all" ? 8 : 36;

  const loadBrackets = tab === "all" || tab === "brackets";
  const loadTierlists = tab === "all" || tab === "tierlists";
  const loadBlindtests = tab === "all" || tab === "blindtests";
  // BattleFeat est un jeu 100 % rap : on ne le montre pas quand un autre genre est filtré.
  const loadBattlefeat = (tab === "all" || tab === "battlefeat") && (!genre || genre === "rap");
  const loadStreamClash = tab === "all" || tab === "streamclash";
  const loadSmashPass = tab === "all" || tab === "smashpass";
  const hasBlindtestRoomVisibility = modelHasField("BlindtestRoom", "visibility");
  const hasBlindtestRoomParticipants = modelHasField("BlindtestRoom", "participants");
  const hasBattleFeatRoomVisibility = modelHasField("BattleFeatRoom", "visibility");
  const hasBattleFeatRoomParticipants = modelHasField("BattleFeatRoom", "participants");
  const hasBattleFeatRoomHostScore = modelHasField("BattleFeatRoom", "hostScore");
  const hasBattleFeatRoomGuestScore = modelHasField("BattleFeatRoom", "guestScore");
  const battleFeatSoloChallengeDelegate = (
    prisma as unknown as {
      battleFeatSoloChallenge?: BattleFeatSoloChallengeDelegate;
    }
  ).battleFeatSoloChallenge;

  if (loadBattlefeat) {
    await ensureBattleFeatVisibilityColumns(prisma);
  }
  if (genre || !hasContentGenre) {
    await ensureGenreColumns(prisma);
  }

  const [
    brackets,
    tierlists,
    blindtests,
    blindtestRooms,
    soloChallenges,
    battleFeatRooms,
    streamClashes,
    streamClashRooms,
    smashPasses,
    smashPassRooms,
  ] = await Promise.all([
    loadBrackets
      ? prisma.bracket.findMany({
          where: { visibility: "public", ...textFilter, ...genreFilter },
          select: {
            id: true,
            title: true,
            theme: true,
            size: true,
            visibility: true,
            coverUrl: true,
            ...genreSelect,
          },
          orderBy: { createdAt: "desc" },
          take: takeGrid,
        })
      : Promise.resolve([]),
    loadTierlists
      ? prisma.tierlist.findMany({
          where: { visibility: "public", ...textFilter, ...genreFilter },
          select: {
            id: true,
            title: true,
            theme: true,
            visibility: true,
            coverUrl: true,
            ...genreSelect,
          },
          orderBy: { createdAt: "desc" },
          take: takeGrid,
        })
      : Promise.resolve([]),
    loadBlindtests
      ? prisma.blindtest.findMany({
          where: { visibility: "public", ...blindtestTextFilter, ...genreFilter },
          select: {
            id: true,
            title: true,
            visibility: true,
            ...genreSelect,
            _count: { select: { tracks: true } },
          },
          orderBy: { createdAt: "desc" },
          take: takeGrid,
        })
      : Promise.resolve([]),
    loadBlindtests && hasBlindtestRoomVisibility
      ? prisma.blindtestRoom.findMany({
          where: {
            status: { in: ["waiting", "playing"] },
            visibility: "public",
            ...(genreFilter.genre ? { blindtest: { genre: genreFilter.genre } } : {}),
            ...(term
              ? {
                  OR: [
                    { blindtest: { title: { contains: term, mode: "insensitive" as const } } },
                    { host: { username: { contains: term, mode: "insensitive" as const } } },
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            status: true,
            visibility: true,
            ...(hasBlindtestRoomParticipants ? { participants: true } : {}),
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
          take: takeGrid,
        })
      : Promise.resolve([]),
    loadBattlefeat && battleFeatSoloChallengeDelegate
      ? battleFeatSoloChallengeDelegate.findMany({
          where: {
            visibility: "public",
            ...(term
              ? {
                  OR: [
                    { title: { contains: term, mode: "insensitive" as const } },
                    { startingArtistName: { contains: term, mode: "insensitive" as const } },
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            title: true,
            difficulty: true,
            visibility: true,
            startingArtistId: true,
            startingArtistName: true,
            startingArtistPic: true,
            createdAt: true,
            owner: { select: { username: true } },
          },
          orderBy: { createdAt: "desc" },
          take: takeBfChallenge,
        })
      : Promise.resolve([]),
    loadBattlefeat
      ? prisma.battleFeatRoom.findMany({
          where: {
            status: { in: ["waiting", "playing"] },
            ...(hasBattleFeatRoomVisibility ? { visibility: "public" } : {}),
          },
          select: {
            id: true,
            status: true,
            ...(hasBattleFeatRoomParticipants ? { participants: true } : {}),
            ...(hasBattleFeatRoomHostScore ? { hostScore: true } : {}),
            ...(hasBattleFeatRoomGuestScore ? { guestScore: true } : {}),
            ...(hasBattleFeatRoomVisibility ? { visibility: true } : {}),
            createdAt: true,
          },
          orderBy: { updatedAt: "desc" },
          take: takeBfRoom,
        })
      : Promise.resolve([]),
    loadStreamClash
      ? prisma.streamClash.findMany({
          where: { visibility: "public", ...streamClashTextFilter, ...genreFilter },
          select: {
            id: true,
            title: true,
            visibility: true,
            ...genreSelect,
            _count: { select: { tracks: true } },
            tracks: {
              take: 1,
              orderBy: { position: "asc" },
              select: { coverUrl: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: takeGrid,
        })
      : Promise.resolve([]),
    loadStreamClash
      ? prisma.streamClashRoom.findMany({
          where: {
            status: { in: ["waiting", "playing"] },
            visibility: "public",
            ...(genreFilter.genre ? { streamClash: { genre: genreFilter.genre } } : {}),
            ...(term
              ? {
                  OR: [
                    { streamClash: { title: { contains: term, mode: "insensitive" as const } } },
                    { host: { username: { contains: term, mode: "insensitive" as const } } },
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            status: true,
            visibility: true,
            difficulty: true,
            createdAt: true,
            host: { select: { username: true } },
            streamClash: {
              select: {
                title: true,
                _count: { select: { tracks: true } },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: takeGrid,
        })
      : Promise.resolve([]),
    loadSmashPass
      ? prisma.smashPass.findMany({
          where: { visibility: "public", ...smashPassTextFilter, ...genreFilter },
          select: {
            id: true,
            title: true,
            visibility: true,
            itemType: true,
            ...genreSelect,
            items: {
              take: 1,
              orderBy: { position: "asc" },
              select: { coverUrl: true },
            },
            _count: { select: { items: true } },
          },
          orderBy: { createdAt: "desc" },
          take: takeGrid,
        })
      : Promise.resolve([]),
    loadSmashPass
      ? prisma.smashPassRoom.findMany({
          where: {
            status: { in: ["waiting", "playing"] },
            visibility: "public",
            ...(genreFilter.genre ? { smashPass: { genre: genreFilter.genre } } : {}),
            ...(term
              ? {
                  OR: [
                    { smashPass: { title: { contains: term, mode: "insensitive" as const } } },
                    { host: { username: { contains: term, mode: "insensitive" as const } } },
                  ],
                }
              : {}),
          },
          select: {
            id: true,
            status: true,
            visibility: true,
            host: { select: { username: true } },
            smashPass: {
              select: {
                title: true,
                itemType: true,
                _count: { select: { items: true } },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: takeGrid,
        })
      : Promise.resolve([]),
  ]);

  const bracketList = brackets.map((b) => ({
    ...b,
    cover_url: b.coverUrl,
    genre: hasContentGenre && "genre" in b ? b.genre : null,
  })) as BracketSummary[];
  const tierlistList = tierlists.map((t) => ({
    ...t,
    genre: hasContentGenre && "genre" in t ? t.genre : null,
  })) as TierlistSummary[];
  const blindtestList = blindtests.map((b) => ({
    id: b.id,
    title: b.title,
    visibility: b.visibility,
    genre: hasContentGenre && "genre" in b ? b.genre : null,
    trackCount: b._count.tracks,
  })) as BlindtestSummary[];

  const blindtestRoomList = blindtestRooms
    .filter((room) =>
      hasBlindtestRoomParticipants
        ? Array.isArray(room.participants) && room.participants.length > 0
        : true,
    )
    .map((room) => ({
      id: room.id,
      status: room.status,
      title: room.blindtest.title,
      trackCount: room.blindtest._count.tracks,
      hostName: room.host.username,
      visibility: room.visibility,
      createdAt: room.createdAt.toISOString(),
    })) as BlindtestRoomSummary[];

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
    ownerUsername: c.owner?.username ?? null,
  })) as BattleFeatChallengeSummary[];

  const battleFeatRoomList = battleFeatRooms
    .filter((room) =>
      hasBattleFeatRoomParticipants
        ? Array.isArray(room.participants) && room.participants.length > 0
        : true,
    )
    .map((room) => {
      const parts =
        "participants" in room && Array.isArray(room.participants)
          ? (room.participants as Array<{ score?: number }>)
          : [];
      const scoresFromParticipants = parts.map((p) => (typeof p?.score === "number" ? p.score : 0));
      const hostScore =
        "hostScore" in room && typeof room.hostScore === "number" ? room.hostScore : 0;
      const guestScore =
        "guestScore" in room && typeof room.guestScore === "number" ? room.guestScore : 0;
      const scores =
        scoresFromParticipants.length > 0 ? scoresFromParticipants : [hostScore, guestScore];
      return {
        id: room.id,
        status: room.status,
        playerCount: parts.length > 0 ? parts.length : scores.length,
        scores,
        visibility:
          "visibility" in room && typeof room.visibility === "string" ? room.visibility : "public",
        createdAt: room.createdAt.toISOString(),
      };
    }) as BattleFeatRoomSummary[];

  const streamClashList = streamClashes.map((sc) => ({
    id: sc.id,
    title: sc.title,
    visibility: sc.visibility,
    genre: hasContentGenre && "genre" in sc ? sc.genre : null,
    trackCount: sc._count.tracks,
    coverUrl: sc.tracks[0]?.coverUrl ?? null,
  })) as StreamClashSummary[];

  const streamClashRoomList = streamClashRooms.map((room) => ({
    id: room.id,
    status: room.status,
    title: room.streamClash.title,
    trackCount: room.streamClash._count.tracks,
    hostName: room.host.username,
    difficulty: room.difficulty,
    visibility: room.visibility,
    createdAt: room.createdAt.toISOString(),
  })) as StreamClashRoomSummary[];

  const hasAnyBattlefeat = battleFeatChallengeList.length > 0 || battleFeatRoomList.length > 0;
  const hasAnyStreamClash = streamClashList.length > 0 || streamClashRoomList.length > 0;

  const smashPassList = smashPasses.map((sp) => ({
    id: sp.id,
    title: sp.title,
    visibility: sp.visibility,
    itemType: sp.itemType,
    genre: hasContentGenre && "genre" in sp ? sp.genre : null,
    itemCount: sp._count.items,
    coverUrl: sp.items[0]?.coverUrl ?? null,
  })) as SmashPassSummary[];

  const smashPassRoomList = smashPassRooms.map((room) => ({
    id: room.id,
    status: room.status,
    title: room.smashPass.title,
    itemCount: room.smashPass._count.items,
    hostName: room.host.username,
    visibility: room.visibility,
    itemType: room.smashPass.itemType,
  })) as SmashPassRoomSummary[];

  const hasAnySmashPass = smashPassList.length > 0 || smashPassRoomList.length > 0;

  const isEmpty =
    tab === "all"
      ? bracketList.length === 0 &&
        tierlistList.length === 0 &&
        blindtestList.length === 0 &&
        blindtestRoomList.length === 0 &&
        !hasAnyBattlefeat &&
        !hasAnyStreamClash &&
        !hasAnySmashPass
      : tab === "battlefeat"
        ? !hasAnyBattlefeat
        : tab === "streamclash"
          ? !hasAnyStreamClash
          : tab === "smashpass"
            ? !hasAnySmashPass
            : tab === "brackets"
              ? bracketList.length === 0
              : tab === "tierlists"
                ? tierlistList.length === 0
                : blindtestList.length === 0 && blindtestRoomList.length === 0;

  const tabItems = [
    { key: "all" as const, label: e.tabAll },
    { key: "brackets" as const, label: e.tabBrackets },
    { key: "tierlists" as const, label: e.tabTierlists },
    { key: "blindtests" as const, label: e.tabBlindtests },
    { key: "battlefeat" as const, label: e.tabBattlefeat },
    { key: "streamclash" as const, label: e.tabStreamClash },
    { key: "smashpass" as const, label: e.tabSmashPass },
  ];

  const gridClass = "mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  const gridBfClass = "mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3";

  return (
    <div className="mx-auto w-full max-w-[1500px] px-1 py-5 sm:px-2 sm:py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-7xl">
            {e.title}
          </h1>
          <p className="mt-2 text-base sm:text-xl lg:text-3xl" style={{ color: "#8f93a0" }}>
            {e.subtitle}
          </p>
        </div>
        <div
          className="inline-flex w-full gap-2 overflow-x-auto rounded-2xl border p-1 lg:w-auto lg:max-w-[min(100%,680px)]"
          style={{ borderColor: "#283041", background: "#181b24" }}
        >
          {tabItems.map((item) => {
            const active = tab === item.key;
            return (
              <Link
                key={item.key}
                href={exploreUrl({ tab: item.key })}
                className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold tracking-wide no-underline sm:px-4 sm:text-sm lg:px-5"
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
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]"
        />
        <input
          defaultValue={term ?? ""}
          name="q"
          placeholder={e.searchPlaceholder}
          className="input h-14 rounded-2xl pl-11 text-lg sm:h-16 sm:rounded-[22px] sm:pl-12 sm:text-2xl lg:h-20 lg:rounded-[26px] lg:pl-14 lg:text-4xl"
          style={{ background: "#171a23", borderColor: "#2a3242" }}
        />
        <input type="hidden" name="tab" value={tab} />
        {genre ? <input type="hidden" name="genre" value={genre} /> : null}
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={exploreUrl({ genre: null })}
          className="btn-chip no-underline"
          data-active={genre === null}
        >
          {e.genreAll}
        </Link>
        {MUSIC_GENRES.map((g) => (
          <Link
            key={g.value}
            href={exploreUrl({ genre: g.value })}
            className="btn-chip no-underline"
            data-active={genre === g.value}
          >
            {g[locale]}
          </Link>
        ))}
      </div>

      {isEmpty ? (
        <div
          className="mt-10 rounded-[26px] border p-7 text-center sm:rounded-[30px] sm:p-10 lg:rounded-[34px] lg:p-14"
          style={{ borderColor: "#232b3a", background: "#10141d" }}
        >
          <p className="text-lg font-semibold">
            {e.emptyTitle}{" "}
            {term
              ? e.emptyFor.replace("{term}", term)
              : genre
                ? e.emptyForGenre.replace("{genre}", genreLabel(genre, locale))
                : e.emptyDefault}
            .
          </p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">{e.emptyHint}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {tab === "all" ? (
              <>
                <Link href="/create-bracket" className="btn-primary inline-flex">
                  {e.createBracket}
                </Link>
                <Link href="/create-tierlist" className="btn-primary inline-flex">
                  {e.createTierlist}
                </Link>
                <Link href="/create-blindtest" className="btn-primary inline-flex">
                  {e.createBlindtest}
                </Link>
                <Link href="/battle-feat" className="btn-primary inline-flex">
                  {e.battleFeatTitle}
                </Link>
                <Link href="/create-stream-clash" className="btn-primary inline-flex">
                  {e.createStreamClash}
                </Link>
                <Link href="/create-smash-pass" className="btn-primary inline-flex">
                  {e.createSmashPass}
                </Link>
              </>
            ) : tab === "smashpass" ? (
              <Link href="/create-smash-pass" className="btn-primary inline-flex">
                {e.createSmashPass}
              </Link>
            ) : tab === "streamclash" ? (
              <Link href="/create-stream-clash" className="btn-primary inline-flex">
                {e.createStreamClash}
              </Link>
            ) : tab === "blindtests" ? (
              <Link href="/create-blindtest" className="btn-primary inline-flex">
                {e.createBlindtest}
              </Link>
            ) : tab === "tierlists" ? (
              <Link href="/create-tierlist" className="btn-primary inline-flex">
                {e.createTierlist}
              </Link>
            ) : tab === "battlefeat" ? (
              <>
                <Link href="/create-battlefeat" className="btn-primary inline-flex">
                  {e.createBattleFeatChallenge}
                </Link>
                <Link href="/battle-feat/solo" className="btn-primary inline-flex">
                  {e.playSolo}
                </Link>
                <Link href="/battle-feat/room/new" className="btn-primary inline-flex">
                  {e.createRoom}
                </Link>
              </>
            ) : (
              <Link href="/create-bracket" className="btn-primary inline-flex">
                {e.createBracket}
              </Link>
            )}
          </div>
        </div>
      ) : tab === "all" ? (
        <div className="mt-10 space-y-14">
          {bracketList.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">{e.sectionBrackets}</h2>
              <div className={gridClass}>
                {bracketList.map((b) => (
                  <BracketCard key={b.id} b={b} />
                ))}
              </div>
              <div className="flex justify-end">
                <Link
                  href={exploreUrl({ tab: "brackets" })}
                  className="text-sm font-semibold text-[color:var(--accent)] no-underline hover:underline"
                >
                  {e.seeAll} →
                </Link>
              </div>
            </section>
          ) : null}

          {tierlistList.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">{e.sectionTierlists}</h2>
              <div className={gridClass}>
                {tierlistList.map((tl) => (
                  <TierlistCard key={tl.id} t={tl} />
                ))}
              </div>
              <div className="flex justify-end">
                <Link
                  href={exploreUrl({ tab: "tierlists" })}
                  className="text-sm font-semibold text-[color:var(--accent)] no-underline hover:underline"
                >
                  {e.seeAll} →
                </Link>
              </div>
            </section>
          ) : null}

          {blindtestList.length > 0 || blindtestRoomList.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">{e.sectionBlindtests}</h2>
              {blindtestList.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-[color:var(--muted)]">Créations</p>
                  <div className={gridClass}>
                    {blindtestList.map((b) => (
                      <BlindtestCard key={b.id} b={b} />
                    ))}
                  </div>
                </div>
              ) : null}
              {blindtestRoomList.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-[color:var(--muted)]">
                    Rooms publiques (disponibles / en cours)
                  </p>
                  <div className={gridClass}>
                    {blindtestRoomList.map((room) => (
                      <BlindtestRoomCard key={room.id} room={room} />
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="flex justify-end">
                <Link
                  href={exploreUrl({ tab: "blindtests" })}
                  className="text-sm font-semibold text-[color:var(--accent)] no-underline hover:underline"
                >
                  {e.seeAll} →
                </Link>
              </div>
            </section>
          ) : null}

          {hasAnyBattlefeat ? (
            <section className="space-y-10">
              {battleFeatChallengeList.length > 0 ? (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold tracking-tight">
                    {e.sectionBattleFeatChallenges}
                  </h2>
                  <div className={gridBfClass}>
                    {battleFeatChallengeList.map((c) => (
                      <BattleFeatChallengeCard key={c.id} c={c} />
                    ))}
                  </div>
                </div>
              ) : null}
              {battleFeatRoomList.length > 0 ? (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold tracking-tight">{e.sectionBattleFeatRooms}</h2>
                  <div className={gridBfClass}>
                    {battleFeatRoomList.map((room) => (
                      <BattleFeatRoomCard key={room.id} r={room} />
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="flex justify-end">
                <Link
                  href={exploreUrl({ tab: "battlefeat" })}
                  className="text-sm font-semibold text-[color:var(--accent)] no-underline hover:underline"
                >
                  {e.seeAll} →
                </Link>
              </div>
            </section>
          ) : null}

          {hasAnySmashPass ? (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">{e.sectionSmashPass}</h2>
              {smashPassList.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-[color:var(--muted)]">{e.sectionSmashPassCreations}</p>
                  <div className={gridClass}>
                    {smashPassList.map((sp) => (
                      <SmashPassCard key={sp.id} sp={sp} />
                    ))}
                  </div>
                </div>
              ) : null}
              {smashPassRoomList.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-[color:var(--muted)]">{e.sectionSmashPassRooms}</p>
                  <div className={gridClass}>
                    {smashPassRoomList.map((room) => (
                      <SmashPassRoomCard key={room.id} room={room} />
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="flex justify-end">
                <Link
                  href={exploreUrl({ tab: "smashpass" })}
                  className="text-sm font-semibold text-[color:var(--accent)] no-underline hover:underline"
                >
                  {e.seeAll} →
                </Link>
              </div>
            </section>
          ) : null}

          {hasAnyStreamClash ? (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">{e.sectionStreamClash}</h2>
              {streamClashList.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-[color:var(--muted)]">
                    {e.sectionStreamClashCreations}
                  </p>
                  <div className={gridClass}>
                    {streamClashList.map((sc) => (
                      <StreamClashCard key={sc.id} sc={sc} />
                    ))}
                  </div>
                </div>
              ) : null}
              {streamClashRoomList.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-[color:var(--muted)]">{e.sectionStreamClashRooms}</p>
                  <div className={gridClass}>
                    {streamClashRoomList.map((room) => (
                      <StreamClashRoomCard key={room.id} room={room} />
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="flex justify-end">
                <Link
                  href={exploreUrl({ tab: "streamclash" })}
                  className="text-sm font-semibold text-[color:var(--accent)] no-underline hover:underline"
                >
                  {e.seeAll} →
                </Link>
              </div>
            </section>
          ) : null}
        </div>
      ) : tab === "brackets" ? (
        <div className={gridClass}>
          {bracketList.map((b) => (
            <BracketCard key={b.id} b={b} />
          ))}
        </div>
      ) : tab === "tierlists" ? (
        <div className={gridClass}>
          {tierlistList.map((tl) => (
            <TierlistCard key={tl.id} t={tl} />
          ))}
        </div>
      ) : tab === "blindtests" ? (
        <div className="mt-10 space-y-8">
          {blindtestList.length > 0 ? (
            <section className="space-y-3">
              <p className="text-sm text-[color:var(--muted)]">Créations</p>
              <div className={gridClass}>
                {blindtestList.map((b) => (
                  <BlindtestCard key={b.id} b={b} />
                ))}
              </div>
            </section>
          ) : null}
          {blindtestRoomList.length > 0 ? (
            <section className="space-y-3">
              <p className="text-sm text-[color:var(--muted)]">
                Rooms publiques (disponibles / en cours)
              </p>
              <div className={gridClass}>
                {blindtestRoomList.map((room) => (
                  <BlindtestRoomCard key={room.id} room={room} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : tab === "smashpass" ? (
        <div className="mt-10 space-y-8">
          {smashPassList.length > 0 ? (
            <section className="space-y-3">
              <p className="text-sm text-[color:var(--muted)]">{e.sectionSmashPassCreations}</p>
              <div className={gridClass}>
                {smashPassList.map((sp) => (
                  <SmashPassCard key={sp.id} sp={sp} />
                ))}
              </div>
            </section>
          ) : null}
          {smashPassRoomList.length > 0 ? (
            <section className="space-y-3">
              <p className="text-sm text-[color:var(--muted)]">{e.sectionSmashPassRooms}</p>
              <div className={gridClass}>
                {smashPassRoomList.map((room) => (
                  <SmashPassRoomCard key={room.id} room={room} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : tab === "streamclash" ? (
        <div className="mt-10 space-y-8">
          {streamClashList.length > 0 ? (
            <section className="space-y-3">
              <p className="text-sm text-[color:var(--muted)]">{e.sectionStreamClashCreations}</p>
              <div className={gridClass}>
                {streamClashList.map((sc) => (
                  <StreamClashCard key={sc.id} sc={sc} />
                ))}
              </div>
            </section>
          ) : null}
          {streamClashRoomList.length > 0 ? (
            <section className="space-y-3">
              <p className="text-sm text-[color:var(--muted)]">{e.sectionStreamClashRooms}</p>
              <div className={gridClass}>
                {streamClashRoomList.map((room) => (
                  <StreamClashRoomCard key={room.id} room={room} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : tab === "battlefeat" ? (
        <div className="mt-10 space-y-14">
          {battleFeatChallengeList.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-[color:var(--muted)]">
                {e.sectionBattleFeatChallenges}
              </h2>
              <div className={gridClass}>
                {battleFeatChallengeList.map((c) => (
                  <BattleFeatChallengeCard key={c.id} c={c} />
                ))}
              </div>
            </section>
          ) : null}
          {battleFeatRoomList.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-[color:var(--muted)]">
                {e.sectionBattleFeatRooms}
              </h2>
              <div className={gridClass}>
                {battleFeatRoomList.map((room) => (
                  <BattleFeatRoomCard key={room.id} r={room} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
