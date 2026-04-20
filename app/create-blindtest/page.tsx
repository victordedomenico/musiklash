import CreateBlindtestForm from "./CreateBlindtestForm";
import SectionHeader from "@/components/ui/SectionHeader";

export const metadata = { title: "Créer un blindtest — MusiKlash" };

export default async function CreateBlindtestPage() {
  return (
    <div className="page-shell py-12">
      <SectionHeader
        title="Créer un blindtest"
        subtitle="Sélectionne les morceaux — les titres seront cachés pendant la partie."
      />
      <div className="mt-8">
        <CreateBlindtestForm />
      </div>
    </div>
  );
}
