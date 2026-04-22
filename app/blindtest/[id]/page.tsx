import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { createBlindtestRoom } from "../room/new/actions";
import { User, Users, ArrowRight, Music } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bt = await prisma.blindtest.findUnique({ where: { id }, select: { title: true } });
  return { title: bt ? `${bt.title} — Blindtest` : "Blindtest" };
}

export default async function BlindtestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const blindtest = await prisma.blindtest.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      visibility: true,
      _count: { select: { tracks: true } },
    },
  });

  if (!blindtest) notFound();

  const trackCount = blindtest._count.tracks;

  const createPrivateRoom = createBlindtestRoom.bind(null, id, "private");
  const createPublicRoom = createBlindtestRoom.bind(null, id, "public");

  return (
    <div className="page-shell max-w-4xl py-10">
      {/* Header */}
      <div className="mb-10 text-center">
        <div
          className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: "var(--accent-dim)" }}
        >
          <Music size={28} style={{ color: "var(--accent)" }} />
        </div>
        <h1 className="text-4xl font-black">{blindtest.title}</h1>
        <p className="mt-2 text-[color:var(--muted)]">
          {trackCount} morceau{trackCount > 1 ? "x" : ""} · 30 secondes par morceau
        </p>
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Solo */}
        <Link
          href={`/blindtest/${id}/play`}
          className="card group flex flex-col p-6 hover:-translate-y-1 transition"
        >
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: "var(--surface-2)" }}
            >
              <User size={22} className="text-[color:var(--muted-strong)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Solo</h2>
              <p className="text-xs text-[color:var(--muted)]">À ton rythme</p>
            </div>
          </div>
          <p className="flex-1 text-sm text-[color:var(--muted)]">
            Joue seul, enregistre ton score et partage tes résultats avec tes amis.
          </p>
          <div
            className="mt-5 flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all"
            style={{ color: "var(--accent)" }}
          >
            Jouer <ArrowRight size={16} />
          </div>
        </Link>

        {/* Multijoueur */}
        <div className="card group flex flex-col p-6 hover:-translate-y-1 transition text-left">
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: "var(--accent-dim)" }}
            >
              <Users size={22} style={{ color: "var(--accent)" }} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Multijoueur</h2>
              <p className="text-xs text-[color:var(--muted)]">En temps réel</p>
            </div>
          </div>
          <p className="flex-1 text-sm text-[color:var(--muted)]">
            Crée une room privée (lien uniquement) ou publique (visible dans Explorer).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={createPrivateRoom}>
              <button type="submit" className="btn-ghost text-sm">
                Room privée
              </button>
            </form>
            <form action={createPublicRoom}>
              <button type="submit" className="btn-primary text-sm">
                Room publique <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
