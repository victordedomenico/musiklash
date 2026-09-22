import type { Metadata } from "next";
import CreateBracketForm from "./CreateBracketForm";
import SectionHeader from "@/components/ui/SectionHeader";
import { getI18n } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Créer un bracket — MusiKlash",
};

export default async function CreateBracketPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const { t } = await getI18n();
  return (
    <div className="page-shell py-12">
      <SectionHeader
        title="Créer un bracket"
        subtitle="Transforme ta sélection musicale en tournoi éliminatoire morceau par morceau."
      />
      <div className="mt-8">
        <CreateBracketForm
          mode={mode === "multi" ? "multi" : "solo"}
          timerTexts={t.multiplayerRoom}
        />
      </div>
    </div>
  );
}
