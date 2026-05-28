import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Music, Play, Users, ArrowLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import SectionHeader from "@/components/ui/SectionHeader";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sc = await prisma.streamClash.findUnique({
    where: { id },
    select: { title: true, visibility: true },
  });
  if (!sc) return { title: "Stream Clash introuvable" };

  return buildPageMetadata({
    title: sc.title,
    description: `Jouez au Stream Clash « ${sc.title} » : devinez quel titre d'animé ou perso est le plus populaire sur AniList.`,
    path: `/stream-clash/${id}`,
    noIndex: sc.visibility !== "public",
  });
}

export default async function StreamClashPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sc = await prisma.streamClash.findUnique({
    where: { id },
    include: { tracks: { orderBy: { position: "asc" } } },
  });

  if (!sc) notFound();

  return (
    <div className="page-shell max-w-2xl py-10">
      <Link
        href="/create-stream-clash"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
      >
        <ArrowLeft size={14} /> Créer un autre
      </Link>

      <SectionHeader title={sc.title} subtitle={`${sc.tracks.length} entrées · Stream Clash`} />

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/stream-clash/${id}/play`} className="btn-primary">
          <Play size={14} /> Jouer solo
        </Link>
        <Link href={`/stream-clash/room/new?scId=${id}`} className="btn-ghost">
          <Users size={14} /> Créer une room
        </Link>
      </div>

      {/* Track list */}
      <div className="mt-8 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--muted)]">
          Morceaux ({sc.tracks.length})
        </p>
        {sc.tracks.map((t) => (
          <div
            key={t.position}
            className="flex items-center gap-3 rounded-xl px-3 py-2"
            style={{ background: "var(--surface)" }}
          >
            {t.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.coverUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                style={{ background: "var(--surface-2)" }}
              >
                <Music size={16} className="text-[color:var(--muted)]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.title}</p>
              <p className="truncate text-xs text-[color:var(--muted)]">{t.artist}</p>
            </div>
            {t.rank > 0 && (
              <span className="shrink-0 rounded-full bg-[color:var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--muted)]">
                rank {(t.rank / 1000).toFixed(0)}K
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
