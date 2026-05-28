import CreateSmashPassForm from "./CreateSmashPassForm";
import SectionHeader from "@/components/ui/SectionHeader";

export const metadata = { title: "Créer Smash or Pass — AnimeKlash" };

export default async function CreateSmashPassPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const resolvedMode: "solo" | "multi" = mode === "multi" ? "multi" : "solo";

  return (
    <div className="page-shell py-12">
      <SectionHeader
        title="Créer un Smash or Pass"
        subtitle={
          resolvedMode === "multi"
            ? "Construis un deck et invite tes amis à voter Smash ou Pass en temps réel."
            : "Swipe musical : Smash ou Pass sur chaque morceau, album ou artiste."
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
        <CreateSmashPassForm mode={resolvedMode} />
      </div>
    </div>
  );
}
