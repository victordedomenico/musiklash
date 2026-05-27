import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart, Play, Users } from "lucide-react";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { mapPrismaItem, type SmashPassItemType } from "@/lib/smash-pass";

export const dynamic = "force-dynamic";

const ITEM_TYPE_LABELS: Record<SmashPassItemType, string> = {
  track: "Morceaux",
  album: "Albums",
  artist: "Artistes",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sp = await prisma.smashPass.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: sp ? `${sp.title} — Smash or Pass` : "Smash or Pass" };
}

export default async function SmashPassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const smashPass = await prisma.smashPass.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      itemType: true,
      visibility: true,
      items: { orderBy: { position: "asc" } },
      _count: { select: { sessions: true } },
    },
  });

  if (!smashPass) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const items = smashPass.items.map(mapPrismaItem);
  const itemType = smashPass.itemType as SmashPassItemType;
  const itemLabel = ITEM_TYPE_LABELS[itemType];
  const previewItems = items.slice(0, 6);
  const coverUrl = items[0]?.coverUrl ?? null;

  return (
    <div className="page-shell max-w-2xl py-10">
      <Link
        href="/explore?tab=smashpass"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
      >
        <ArrowLeft size={14} /> Explorer
      </Link>

      <div className="space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-[color:var(--border)]">
          {coverUrl ? (
            <div className="relative aspect-[3/1]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </div>
          ) : (
            <div className="flex aspect-[3/1] items-center justify-center bg-gradient-to-br from-pink-500/20 to-blue-500/20">
              <Heart size={48} className="text-pink-400/40" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-pink-400">
              Smash or Pass
            </p>
            <h1 className="mt-1 text-2xl font-black text-white drop-shadow-lg">
              {smashPass.title}
            </h1>
            <p className="mt-1 text-sm text-white/70">
              {items.length} {itemLabel.toLowerCase()}
              {items.length > 1 ? "s" : ""} ·{" "}
              {smashPass._count.sessions} session
              {smashPass._count.sessions > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Aperçu des items */}
        {previewItems.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {previewItems.map((item) => (
              <div key={item.deezerId} className="relative aspect-square overflow-hidden rounded-xl">
                {item.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[color:var(--surface-2)]">
                    <Heart size={20} className="text-[color:var(--muted)]" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <p className="absolute bottom-0 left-0 right-0 truncate px-1.5 pb-1 text-[10px] font-semibold text-white">
                  {item.title}
                </p>
              </div>
            ))}
            {items.length > 6 ? (
              <div className="flex aspect-square items-center justify-center rounded-xl bg-[color:var(--surface-2)]">
                <span className="text-sm font-bold text-[color:var(--muted)]">
                  +{items.length - 6}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/smash-pass/${id}/play`}
            className="btn-primary flex flex-1 items-center justify-center gap-2"
          >
            <Play size={18} />
            Jouer en solo
          </Link>

          {user ? (
            <Link
              href={`/smash-pass/room/new?smashPassId=${id}`}
              className="btn-ghost flex flex-1 items-center justify-center gap-2"
            >
              <Users size={18} />
              Créer une room multi
            </Link>
          ) : (
            <Link
              href={`/login?redirect=/smash-pass/${id}`}
              className="btn-ghost flex flex-1 items-center justify-center gap-2"
            >
              <Users size={18} />
              Connexion pour mode multi
            </Link>
          )}
        </div>

        <p className="text-center text-xs text-[color:var(--muted)]">
          Smash ou Pass sur chaque {itemLabel.slice(0, -1).toLowerCase()} — aucune mauvaise réponse !
        </p>
      </div>
    </div>
  );
}
