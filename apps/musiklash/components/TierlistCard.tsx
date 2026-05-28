import Link from "next/link";
import { Eye, EyeOff, LayoutList } from "lucide-react";
import LibraryVisibilityToggle from "@/components/LibraryVisibilityToggle";

export type TierlistSummary = {
  id: string;
  title: string;
  theme: string | null;
  visibility: string;
  coverUrl: string | null;
  trackCount?: number;
};

export default function TierlistCard({
  t,
  libraryEditor,
}: {
  t: TierlistSummary;
  libraryEditor?: boolean;
}) {
  const vis = t.visibility === "public" ? "public" : "private";
  const inner = (
    <>
      <div className="media-thumb">
        {t.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.coverUrl}
            alt=""
            className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <LayoutList size={32} className="text-[color:var(--muted)]" />
          </div>
        )}
        <span className="media-pill absolute right-2 top-2">Tierlist</span>
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
        <p className="font-semibold line-clamp-1">{t.title}</p>
        {t.theme ? (
          <p className="mt-0.5 text-xs text-[color:var(--muted)] line-clamp-1">{t.theme}</p>
        ) : null}
      </div>
    </>
  );

  if (!libraryEditor) {
    return (
      <Link href={`/tierlist/${t.id}`} className="group media-card">
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Link href={`/tierlist/${t.id}`} className="group media-card">
        {inner}
      </Link>
      <LibraryVisibilityToggle entity="tierlist" id={t.id} visibility={vis} />
    </div>
  );
}
