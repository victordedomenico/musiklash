"use client";

import {
  formatStatCount,
  type SmashPassItemData,
  type SmashPassItemStatsSnapshot,
} from "@/lib/smash-pass";

type Props = {
  item: SmashPassItemData | null;
  stats: SmashPassItemStatsSnapshot | null;
  roomSmash?: number;
  roomPass?: number;
};

export default function SmashPassCommunityStats({ item, stats, roomSmash, roomPass }: Props) {
  if (!item || !stats) return null;

  const showRoom = roomSmash !== undefined && roomPass !== undefined && roomSmash + roomPass > 0;
  const roomTotal = showRoom ? roomSmash! + roomPass! : 0;
  const roomSmashPct = showRoom ? Math.round((roomSmash! / roomTotal) * 100) : 0;
  const roomPassPct = showRoom ? 100 - roomSmashPct : 0;

  return (
    <section className="mx-auto mt-10 max-w-lg text-center">
      <h3 className="text-sm font-medium text-[color:var(--muted)]">
        Ce que les autres ont choisi pour{" "}
        <span className="text-[color:var(--foreground)]">{item.title}</span>…
      </h3>
      {item.coverUrl ? (
        <div className="mt-4 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.coverUrl} alt="" className="h-16 w-16 rounded-lg object-cover shadow-lg" />
        </div>
      ) : null}

      {showRoom ? <p className="mt-3 text-xs text-[color:var(--muted)]">Dans cette room</p> : null}
      {showRoom ? (
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-pink-400">Pass</p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[color:var(--surface-2)]">
              <div
                className="h-full rounded-full bg-pink-500 transition-all"
                style={{ width: `${roomPassPct}%` }}
              />
            </div>
            <p className="mt-1 text-lg font-black">{roomPass}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-400">Smash</p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[color:var(--surface-2)]">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${roomSmashPct}%` }}
              />
            </div>
            <p className="mt-1 text-lg font-black">{roomSmash}</p>
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-[color:var(--muted)]">Communauté MusiKlash</p>
      <div className="mt-2 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-pink-400">Pass</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[color:var(--surface-2)]">
            <div
              className="h-full rounded-full bg-pink-500 transition-all"
              style={{ width: `${stats.passPercent}%` }}
            />
          </div>
          <p className="mt-1 text-xl font-black">{formatStatCount(stats.passCount)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-emerald-400">Smash</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[color:var(--surface-2)]">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${stats.smashPercent}%` }}
            />
          </div>
          <p className="mt-1 text-xl font-black">{formatStatCount(stats.smashCount)}</p>
        </div>
      </div>
    </section>
  );
}
