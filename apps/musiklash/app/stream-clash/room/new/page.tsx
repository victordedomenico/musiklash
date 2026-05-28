import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import SectionHeader from "@/components/ui/SectionHeader";
import NewRoomForm from "./NewRoomForm";

export const metadata = { title: "Créer une room Stream Clash — MusiKlash" };

export default async function NewStreamClashRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ scId?: string }>;
}) {
  const { scId } = await searchParams;

  if (!scId) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = encodeURIComponent(`/stream-clash/room/new?scId=${scId}`);
    return (
      <div className="page-shell max-w-lg py-12">
        <p className="text-center text-sm text-[color:var(--muted)]">
          Tu dois être connecté pour créer une room multijoueur.{" "}
          <a href={`/login?redirect=${redirectUrl}`} className="underline">
            Se connecter
          </a>
        </p>
      </div>
    );
  }

  const sc = await prisma.streamClash.findUnique({
    where: { id: scId },
    select: { id: true, title: true },
  });
  if (!sc) notFound();

  return (
    <div className="page-shell max-w-lg py-12">
      <SectionHeader
        title="Créer une room Stream Clash"
        subtitle="Configure la partie — un lien d'invitation sera généré."
      />
      <div className="mt-8">
        <NewRoomForm scId={sc.id} scTitle={sc.title} />
      </div>
    </div>
  );
}
