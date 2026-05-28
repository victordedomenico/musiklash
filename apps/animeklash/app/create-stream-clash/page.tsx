import CreateStreamClashForm from "./CreateStreamClashForm";
import SectionHeader from "@/components/ui/SectionHeader";

export const metadata = { title: "Créer un Stream Clash — AnimeKlash" };

export default async function CreateStreamClashPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const resolvedMode: "solo" | "multi" = mode === "multi" ? "multi" : "solo";

  return (
    <div className="page-shell py-12">
      <SectionHeader
        title="Créer un Stream Clash"
        subtitle={
          resolvedMode === "multi"
            ? "Sélectionne des titres d'animé ou des persos — le plus populaire sur AniList gagne, en temps réel."
            : "Sélectionne des titres d'animé ou des persos — devine lequel est le plus populaire sur AniList."
        }
        right={
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              resolvedMode === "multi"
                ? "bg-blue-500/15 text-blue-400"
                : "bg-emerald-500/15 text-emerald-400"
            }`}
          >
            {resolvedMode === "multi" ? "Multijoueur" : "Solo"}
          </span>
        }
      />
      <div className="mt-8">
        <CreateStreamClashForm mode={resolvedMode} />
      </div>
    </div>
  );
}
