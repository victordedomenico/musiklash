import type { Metadata } from "next";
import CreateBracketForm from "./CreateBracketForm";
import SectionHeader from "@/components/ui/SectionHeader";

export const metadata: Metadata = {
  title: "Créer un bracket — ComicKlash",
};

export default function CreateBracketPage() {
  return (
    <div className="page-shell py-12">
      <SectionHeader
        title="Créer un bracket"
        subtitle="Compose un tournoi à élimination directe entre numéros, séries ou personnages."
      />
      <div className="mt-8">
        <CreateBracketForm />
      </div>
    </div>
  );
}
