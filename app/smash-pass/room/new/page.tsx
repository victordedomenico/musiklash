import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createSmashPassRoom } from "./actions";

export const dynamic = "force-dynamic";

export default async function SmashPassRoomNewPage({
  searchParams,
}: {
  searchParams: Promise<{ smashPassId?: string }>;
}) {
  const { smashPassId } = await searchParams;
  if (!smashPassId) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=${encodeURIComponent(`/smash-pass/room/new?smashPassId=${smashPassId}`)}`,
    );
  }

  const sp = await prisma.smashPass.findUnique({
    where: { id: smashPassId },
    select: { id: true },
  });
  if (!sp) notFound();

  await createSmashPassRoom(smashPassId);
}
