import type { Metadata } from "next";
import CreateTierlistForm from "./CreateTierlistForm";
import SectionHeader from "@/components/ui/SectionHeader";

export const metadata: Metadata = {
  title: "Créer une tierlist — SeriesKlash",
};

export default function CreateTierlistPage() {
  return (
    <div className="page-shell py-12">
      <SectionHeader
        title="Créer une tierlist"
        subtitle="Classe tes séries et épisodes préférés du S au F."
      />
      <div className="mt-8">
        <CreateTierlistForm />
      </div>
    </div>
  );
}
