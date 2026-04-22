import Link from "next/link";
import { Clock, Eye, EyeOff } from "lucide-react";
import LibraryVisibilityToggle from "@/components/LibraryVisibilityToggle";
import type { Visibility } from "@/app/my-brackets/actions";

type Kind = "bracket" | "tierlist" | "blindtest";

export type SessionSummary = {
  id: string;
  kind: Kind;
  parentId: string;
  title: string;
  subtitle?: string | null;
  createdAt: string;
  coverUrl?: string | null;
  badge?: string;
  visibility: Visibility;
};

function hrefFor(s: SessionSummary): string {
  switch (s.kind) {
    case "bracket":
      return `/bracket-game/${s.parentId}/results/${s.id}`;
    case "tierlist":
      return `/tierlist/${s.parentId}/results/${s.id}`;
    case "blindtest":
      return `/blindtest/${s.parentId}/results/${s.id}`;
  }
}

const kindLabel: Record<Kind, string> = {
  bracket: "Bracket",
  tierlist: "Tierlist",
  blindtest: "Blindtest",
};

const kindEntity: Record<Kind, "bracket_game" | "tierlist_session" | "blindtest_session"> = {
  bracket: "bracket_game",
  tierlist: "tierlist_session",
  blindtest: "blindtest_session",
};

export default function SessionCard({
  session,
  libraryEditor,
}: {
  session: SessionSummary;
  libraryEditor?: boolean;
}) {
  const href = hrefFor(session);
  const inner = (
    <>
      <div className="media-thumb">
        {session.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.coverUrl}
            alt=""
            className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[color:var(--accent)]/15 to-[color:var(--accent-2)]/15" />
        )}
        <span className="media-pill absolute right-2 top-2">{kindLabel[session.kind]}</span>
        <span className="media-pill absolute left-2 top-2">
          {session.visibility === "public" ? (
            <>
              <Eye size={12} /> Public
            </>
          ) : (
            <>
              <EyeOff size={12} /> Privé
            </>
          )}
        </span>
        {session.badge ? (
          <span className="media-pill absolute bottom-2 left-2">{session.badge}</span>
        ) : null}
      </div>
      <div className="p-4">
        <p className="font-semibold line-clamp-1">{session.title}</p>
        {session.subtitle ? (
          <p className="mt-0.5 text-xs text-[color:var(--muted)] line-clamp-1">{session.subtitle}</p>
        ) : null}
        <p className="mt-1 text-[11px] text-[color:var(--muted)] flex items-center gap-1">
          <Clock size={11} />
          {new Date(session.createdAt).toLocaleDateString("fr-FR")}
        </p>
      </div>
    </>
  );

  if (!libraryEditor) {
    return (
      <Link href={href} className="group media-card">
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Link href={href} className="group media-card">
        {inner}
      </Link>
      <LibraryVisibilityToggle
        entity={kindEntity[session.kind]}
        id={session.id}
        visibility={session.visibility}
      />
    </div>
  );
}
