import { genreLabel, type MusicGenre } from "@/lib/genres";

export default function GenreBadge({
  genre,
  locale = "fr",
}: {
  genre: string;
  locale?: "fr" | "en";
}) {
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: "#2a3242", color: "#b8bcc8" }}
    >
      {genreLabel(genre as MusicGenre, locale)}
    </span>
  );
}
