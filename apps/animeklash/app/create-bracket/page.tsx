import type { Metadata } from "next";
import CreateBracketForm from "./CreateBracketForm";
import SectionHeader from "@/components/ui/SectionHeader";

export const metadata: Metadata = {
  title: "Créer un bracket — AnimeKlash",
};

export default async function CreateBracketPage() {
  return (
    <div className="page-shell py-12">
      <SectionHeader
        title="Créer un bracket"
        subtitle="Compose un tournoi à élimination directe : titres d'animé, persos, arcs ou openings/endings."
      />
      <div className="mt-8">
        <CreateBracketForm />
      </div>
    </div>
  );
}
