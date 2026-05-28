import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import LibraryVisibilityToggle from "@/components/LibraryVisibilityToggle";

export type BracketSummary = {
  id: string;
  title: string;
  theme: string | null;
  size: number;
  visibility: "public" | "private";
  cover_url: string | null;
};

export default function BracketCard({
  b,
  libraryEditor,
}: {
  b: BracketSummary;
  libraryEditor?: boolean;
}) {
  const inner = (
    <>
      <div className="media-thumb">
        {b.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={b.cover_url}
            alt=""
            className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition"
          />
        ) : null}
        <span className="media-pill absolute right-2 top-2">{b.size} pistes</span>
        <span className="media-pill absolute left-2 top-2">
          {b.visibility === "public" ? (
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
        {b.theme ? (
          <p className="mt-0.5 text-xs text-[color:var(--muted)] line-clamp-1">{b.theme}</p>
        ) : null}
      </div>
    </>
  );

  if (!libraryEditor) {
    return (
      <Link href={`/bracket-game/${b.id}`} className="group media-card">
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Link href={`/bracket-game/${b.id}`} className="group media-card">
        {inner}
      </Link>
      <LibraryVisibilityToggle entity="bracket" id={b.id} visibility={b.visibility} />
    </div>
  );
}
