import CreateStreamClashForm from "./CreateStreamClashForm";
import SectionHeader from "@/components/ui/SectionHeader";

export const metadata = { title: "Créer un Stream Clash — MusiKlash" };

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
        subtitle="Sélectionne les morceaux — les joueurs devront deviner lequel est le plus populaire."
      />
      <div className="mt-8">
        <CreateStreamClashForm mode={resolvedMode} />
      </div>
    </div>
  );
}
