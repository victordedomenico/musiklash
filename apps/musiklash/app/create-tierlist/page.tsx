import CreateTierlistForm from "./CreateTierlistForm";
import SectionHeader from "@/components/ui/SectionHeader";

export const metadata = { title: "Créer une tierlist — MusiKlash" };

export default async function CreateTierlistPage() {
  return (
    <div className="page-shell py-12">
      <SectionHeader
        title="Créer une tierlist"
        subtitle="Sélectionne les morceaux à classer, de S+ à F."
      />
      <div className="mt-8">
        <CreateTierlistForm />
      </div>
    </div>
  );
}
