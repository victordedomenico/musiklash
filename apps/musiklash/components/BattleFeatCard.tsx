import Link from "next/link";
import { Eye, EyeOff, Swords, Trophy, Clock } from "lucide-react";
import LibraryVisibilityToggle from "@/components/LibraryVisibilityToggle";

export type BattleFeatSessionSummary = {
  id: string;
  difficulty: number;
  score: number;
  status: string;
  visibility: string;
  createdAt: string;
};

export type BattleFeatRoomSummary = {
  id: string;
  status: string;
  playerCount: number;
  scores: number[];
  visibility: string;
  createdAt: string;
  canEditVisibility?: boolean;
};

const difficultyLabel: Record<number, string> = { 1: "Facile", 2: "Normal", 3: "Difficile" };
const difficultyColor: Record<number, string> = {
  1: "text-green-400",
  2: "text-yellow-400",
  3: "text-red-400",
};

export function BattleFeatSoloCard({
  s,
  libraryEditor,
}: {
  s: BattleFeatSessionSummary;
  libraryEditor?: boolean;
}) {
  const href = s.status === "finished" ? `/battle-feat/results/${s.id}` : `/battle-feat/solo`;
  const vis = s.visibility === "public" ? "public" : "private";
  const inner = (
    <>
      <div className="media-thumb flex items-center justify-center bg-gradient-to-br from-red-500/20 to-orange-500/20">
        <Swords
          size={36}
          className="text-[color:var(--muted)] group-hover:text-[color:var(--accent)] transition"
        />
        <span className="media-pill absolute right-2 top-2">Solo</span>
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
        <span
          className={`media-pill absolute bottom-2 left-2 ${difficultyColor[s.difficulty] ?? ""}`}
        >
          {difficultyLabel[s.difficulty] ?? "?"}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold flex items-center gap-1.5">
            <Trophy size={14} className="text-yellow-400" />
            {s.score} point{s.score !== 1 ? "s" : ""}
          </p>
          <span className="text-xs text-[color:var(--muted)] flex items-center gap-1">
            <Clock size={12} />
            {new Date(s.createdAt).toLocaleDateString("fr-FR")}
          </span>
        </div>
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
      <LibraryVisibilityToggle entity="battlefeat_solo" id={s.id} visibility={vis} />
    </div>
  );
}

export function BattleFeatRoomCard({
  r,
  libraryEditor,
}: {
  r: BattleFeatRoomSummary;
  libraryEditor?: boolean;
}) {
  const statusLabel: Record<string, string> = {
    waiting: "En attente",
    playing: "En cours",
    finished: "Terminée",
  };
  const vis = r.visibility === "public" ? "public" : "private";
  const inner = (
    <>
      <div className="media-thumb flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-red-500/20">
        <Swords
          size={36}
          className="text-[color:var(--muted)] group-hover:text-[color:var(--accent)] transition"
        />
        <span className="media-pill absolute right-2 top-2">Multi</span>
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
        <span className="media-pill absolute bottom-2 left-2">{statusLabel[r.status] ?? r.status}</span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">
            {r.scores.length > 0 ? r.scores.join(" – ") : `${r.playerCount} joueur${r.playerCount > 1 ? "s" : ""}`}
          </p>
          <span className="text-xs text-[color:var(--muted)] flex items-center gap-1">
            <Clock size={12} />
            {new Date(r.createdAt).toLocaleDateString("fr-FR")}
          </span>
        </div>
      </div>
    </>
  );

  const showToggle = libraryEditor && r.canEditVisibility;

  if (!libraryEditor) {
    return (
      <Link href={`/battle-feat/room/${r.id}`} className="group media-card">
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Link href={`/battle-feat/room/${r.id}`} className="group media-card">
        {inner}
      </Link>
      {showToggle ? (
        <LibraryVisibilityToggle entity="battlefeat_room" id={r.id} visibility={vis} />
      ) : (
        <p className="rounded-xl border px-3 py-2 text-xs text-[color:var(--muted)]" style={{ borderColor: "#283041", background: "#131822" }}>
          Visibilité définie par l&apos;hôte ({vis === "public" ? "public" : "privé"}).
        </p>
      )}
    </div>
  );
}
