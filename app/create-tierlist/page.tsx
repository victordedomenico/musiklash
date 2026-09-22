import CreateTierlistForm from "./CreateTierlistForm";
import SectionHeader from "@/components/ui/SectionHeader";
import { getI18n } from "@/lib/i18n";

export const metadata = { title: "Créer une tierlist — MusiKlash" };

export default async function CreateTierlistPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const { t } = await getI18n();
  return (
    <div className="page-shell py-12">
      <SectionHeader
        title="Créer une tierlist"
        subtitle="Sélectionne les morceaux à classer, de S+ à F."
      />
      <div className="mt-8">
        <CreateTierlistForm
          mode={mode === "multi" ? "multi" : "solo"}
          timerTexts={t.multiplayerRoom}
        />
      </div>
    </div>
  );
}
