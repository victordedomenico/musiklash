import CreateBlindtestForm from "./CreateBlindtestForm";
import SectionHeader from "@/components/ui/SectionHeader";

export const metadata = { title: "Créer un blindtest — MusiKlash" };

export default async function CreateBlindtestPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const resolvedMode: "solo" | "multi" = mode === "multi" ? "multi" : "solo";

  return (
    <div className="page-shell py-12">
      <SectionHeader
        title="Créer un blindtest"
        subtitle="Sélectionne les morceaux — les titres seront cachés pendant la partie."
      />
      <div className="mt-8">
        <CreateBlindtestForm mode={resolvedMode} />
      </div>
    </div>
  );
}
