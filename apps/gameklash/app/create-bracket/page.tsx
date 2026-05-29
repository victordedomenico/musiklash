import type { Metadata } from "next";
import CreateBracketForm from "./CreateBracketForm";
import SectionHeader from "@/components/ui/SectionHeader";

export const metadata: Metadata = {
  title: "Créer un bracket — GameKlash",
};

export default function CreateBracketPage() {
  return (
    <div className="page-shell py-12">
      <SectionHeader
        title="Créer un bracket"
        subtitle="Compose un tournoi à élimination directe entre jeux, franchises ou catalogues de studios."
      />
      <div className="mt-8">
        <CreateBracketForm />
      </div>
    </div>
  );
}
