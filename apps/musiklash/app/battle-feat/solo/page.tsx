import type { Metadata } from "next";
import { Bot, ShieldCheck, UserRound } from "lucide-react";
import prisma from "@/lib/prisma";
import BattleFeatSolo, { type BattleFeatSoloChallengePreset } from "./BattleFeatSolo";

export const metadata: Metadata = { title: "BattleFeat Solo — MusiKlash" };

export default async function BattleFeatSoloPage({
  searchParams,
}: {
  searchParams: Promise<{ challengeId?: string }>;
}) {
  const { challengeId } = await searchParams;

  let challengePreset: BattleFeatSoloChallengePreset | undefined;
  if (challengeId) {
    const challenge = await prisma.battleFeatSoloChallenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        title: true,
        difficulty: true,
        visibility: true,
        ownerId: true,
        startingArtistId: true,
        startingArtistName: true,
        startingArtistPic: true,
      },
    });
    // Private challenges can still be played via direct link (anyone with the
    // URL can try). We therefore don't gate by visibility here.
    if (challenge) {
      challengePreset = {
        id: challenge.id,
        title: challenge.title,
        difficulty: challenge.difficulty,
        startingArtist: {
          id: challenge.startingArtistId,
          name: challenge.startingArtistName,
          pictureUrl: challenge.startingArtistPic,
        },
      };
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] py-6">
      <div className="mb-7 text-center">
        <p
          className="mx-auto inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em]"
          style={{ color: "#ff4b7d", borderColor: "rgba(255,75,125,0.35)", background: "rgba(114,18,47,0.35)" }}
        >
          <Bot size={12} />
          Mode solo vs IA
        </p>
        <h1 className="mt-3 text-7xl font-black tracking-[-0.04em]">BattleFeat</h1>
        <p className="mx-auto mt-2 max-w-3xl text-3xl" style={{ color: "#8f93a0" }}>
          Enchaînez les artistes qui ont collaboré ensemble. Jusqu&apos;où pouvez-vous aller ?
        </p>
      </div>

      <BattleFeatSolo challenge={challengePreset} />

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <article className="rounded-[26px] border p-5" style={{ borderColor: "#2a3242", background: "#10141d" }}>
          <h2 className="mb-2 flex items-center gap-2 text-2xl font-bold">
            <UserRound size={18} />
            Comment jouer ?
          </h2>
          <p className="text-lg" style={{ color: "#8f93a0" }}>
            Entrez le nom d&apos;un artiste qui a collaboré avec le dernier artiste de la chaîne.
            Chaque featuring valide vous rapporte 100 points.
          </p>
        </article>
        <article className="rounded-[26px] border p-5" style={{ borderColor: "#2a3242", background: "#10141d" }}>
          <h2 className="mb-2 flex items-center gap-2 text-2xl font-bold">
            <ShieldCheck size={18} />
            Validation par IA
          </h2>
          <p className="text-lg" style={{ color: "#8f93a0" }}>
            Notre IA vérifie en temps réel les featurings officiels pour garantir l&apos;intégrité du défi.
          </p>
        </article>
      </div>
    </div>
  );
}
