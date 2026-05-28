import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import prisma from "@klash/klash-app/lib/prisma";
import { mapPrismaItem, type SmashPassItemType } from "@klash/klash-app/lib/smash-pass";
import SmashPassPlayer from "./SmashPassPlayer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sp = await prisma.smashPass.findUnique({ where: { id }, select: { title: true } });
  return { title: sp ? `${sp.title} — Smash or Pass` : "Smash or Pass" };
}

export default async function SmashPassPlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ transient?: string }>;
}) {
  const { id } = await params;
  const { transient } = await searchParams;

  const smashPass = await prisma.smashPass.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      itemType: true,
      items: { orderBy: { position: "asc" } },
    },
  });

  if (!smashPass) notFound();

  const items = smashPass.items.map(mapPrismaItem);
  const itemType = smashPass.itemType as SmashPassItemType;

  return (
    <div className="page-shell max-w-2xl py-10">
      <Link
        href="/create"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
      >
        <ArrowLeft size={14} /> Retour
      </Link>
      <SmashPassPlayer
        smashPassId={smashPass.id}
        title={smashPass.title}
        itemType={itemType}
        items={items}
        transient={transient === "1"}
      />
    </div>
  );
}
