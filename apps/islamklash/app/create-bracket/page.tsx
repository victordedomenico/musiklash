import type { Metadata } from "next";
import CreateBracketForm from "./CreateBracketForm";
import SectionHeader from "@/components/ui/SectionHeader";

export const metadata: Metadata = {
  title: "Créer un bracket — IslamKlash",
};

export default function CreateBracketPage() {
  return (
    <div className="page-shell py-12">
      <SectionHeader
        title="Créer un bracket"
        subtitle="Compose un tournoi à élimination directe entre sourates, juz' ou prophètes."
      />
      <div className="mt-8">
        <CreateBracketForm />
      </div>
    </div>
  );
}
