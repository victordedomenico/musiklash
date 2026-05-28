import Link from "next/link";
import { Eye, EyeOff, Music } from "lucide-react";
import LibraryVisibilityToggle from "@/components/LibraryVisibilityToggle";

export type BlindtestSummary = {
  id: string;
  title: string;
  visibility: string;
  trackCount?: number;
};

export default function BlindtestCard({
  b,
  libraryEditor,
}: {
  b: BlindtestSummary;
  libraryEditor?: boolean;
}) {
  const vis = b.visibility === "public" ? "public" : "private";
  const inner = (
    <>
      <div className="media-thumb flex items-center justify-center">
        <Music size={36} className="text-[color:var(--muted)] group-hover:text-[color:var(--accent)] transition" />
        <span className="media-pill absolute right-2 top-2">Blindtest</span>
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
      </div>
      <div className="p-4">
        <p className="font-semibold line-clamp-1">{b.title}</p>
        {b.trackCount != null ? (
          <p className="mt-0.5 text-xs text-[color:var(--muted)]">
            {b.trackCount} morceau{b.trackCount > 1 ? "x" : ""}
          </p>
        ) : null}
      </div>
    </>
  );

  if (!libraryEditor) {
    return (
      <Link href={`/blindtest/${b.id}`} className="group media-card">
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Link href={`/blindtest/${b.id}`} className="group media-card">
        {inner}
      </Link>
      <LibraryVisibilityToggle entity="blindtest" id={b.id} visibility={vis} />
    </div>
  );
}
