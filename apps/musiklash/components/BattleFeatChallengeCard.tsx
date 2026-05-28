import Link from "next/link";
import { Eye, EyeOff, Zap, Clock, User } from "lucide-react";
import LibraryVisibilityToggle from "@/components/LibraryVisibilityToggle";

export type BattleFeatChallengeSummary = {
  id: string;
  title: string;
  difficulty: number;
  visibility: string;
  createdAt: string;
  startingArtist: {
    id: string;
    name: string;
    pictureUrl: string | null;
  };
  ownerUsername?: string | null;
};

const difficultyLabel: Record<number, string> = { 1: "Facile", 2: "Normal", 3: "Difficile" };
const difficultyColor: Record<number, string> = {
  1: "text-green-400",
  2: "text-yellow-400",
  3: "text-red-400",
};

export default function BattleFeatChallengeCard({
  c,
  libraryEditor,
}: {
  c: BattleFeatChallengeSummary;
  libraryEditor?: boolean;
}) {
  const vis = c.visibility === "public" ? "public" : "private";

  const thumb = c.startingArtist.pictureUrl ? (
    <div
      className="media-thumb bg-cover bg-center"
      style={{ backgroundImage: `url(${c.startingArtist.pictureUrl})` }}
      aria-hidden
    />
  ) : (
    <div className="media-thumb flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-orange-500/20">
      <User size={36} className="text-[color:var(--muted)]" />
    </div>
  );

  const inner = (
    <>
      <div className="media-thumb relative">
        {thumb}
        <span className="media-pill absolute right-2 top-2">
          <Zap size={12} /> Solo
        </span>
        <span className="media-pill absolute left-2 top-2">
          {vis === "public" ? (
            <>
              <Eye size={12} /> Public
            </>
          ) : (
            <>
              <EyeOff size={12} /> Privé
            </>
          )}
        </span>
        <span className={`media-pill absolute bottom-2 left-2 ${difficultyColor[c.difficulty] ?? ""}`}>
          {difficultyLabel[c.difficulty] ?? "?"}
        </span>
      </div>
      <div className="p-4">
        <p className="font-semibold truncate">{c.title}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-[color:var(--muted)]">
            Départ : {c.startingArtist.name}
            {c.ownerUsername ? ` · ${c.ownerUsername}` : ""}
          </p>
          <span className="shrink-0 text-xs text-[color:var(--muted)] flex items-center gap-1">
            <Clock size={12} />
            {new Date(c.createdAt).toLocaleDateString("fr-FR")}
          </span>
        </div>
      </div>
    </>
  );

  if (!libraryEditor) {
    return (
      <Link href={`/battle-feat/${c.id}`} className="group media-card">
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Link href={`/battle-feat/${c.id}`} className="group media-card">
        {inner}
      </Link>
      <LibraryVisibilityToggle entity="battlefeat_challenge" id={c.id} visibility={vis} />
    </div>
  );
}
