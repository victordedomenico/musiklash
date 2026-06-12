import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { normalizeSessionChoices } from "@/lib/smash-pass";
import { mapPrismaItem } from "@/lib/smash-pass";

export const dynamic = "force-dynamic";

export default async function SmashPassResultsPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;

  const session = await prisma.smashPassSession.findUnique({
    where: { id: sessionId },
    include: {
      smashPass: {
        select: {
          id: true,
          title: true,
          itemType: true,
          items: { orderBy: { position: "asc" } },
        },
      },
    },
  });

  if (!session || session.smashPassId !== id) notFound();

  const choices = normalizeSessionChoices(session.choices);
  const choiceMap = new Map(choices.map((c) => [c.position, c.choice]));
  const items = session.smashPass.items.map(mapPrismaItem);

  return (
    <div className="page-shell max-w-lg py-12">
      <h1 className="text-2xl font-black">{session.smashPass.title}</h1>
      <p className="mt-2 text-[color:var(--muted)]">
        {session.smashCount} smash · {session.passCount} pass
      </p>

      <ul className="mt-8 space-y-3">
        {items.map((item) => {
          const choice = choiceMap.get(item.position);
          return (
            <li key={item.position} className="card flex items-center gap-3 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.coverUrl ?? ""} alt="" className="h-12 w-12 rounded-md object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.title}</p>
                {item.subtitle ? (
                  <p className="truncate text-xs text-[color:var(--muted)]">{item.subtitle}</p>
                ) : null}
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  choice === "smash"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-pink-500/20 text-pink-400"
                }`}
              >
                {choice === "smash" ? "SMASH" : "PASS"}
              </span>
            </li>
          );
        })}
      </ul>

      <Link href={`/smash-pass/${id}/play`} className="btn-ghost mt-8 inline-flex">
        Rejouer
      </Link>
    </div>
  );
}
