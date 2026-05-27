import type { Metadata } from "next";
import CreateBracketForm from "./CreateBracketForm";
import SectionHeader from "@/components/ui/SectionHeader";

export const metadata: Metadata = {
  title: "Créer un bracket — MusiKlash",
};

export default async function CreateBracketPage() {
  return (
    <div className="page-shell py-12">
      <SectionHeader
        title="Créer un bracket"
        subtitle="Transforme ta sélection musicale en tournoi éliminatoire morceau par morceau."
      />
      <div className="mt-8">
        <CreateBracketForm />
      </div>
    </div>
  );
}
