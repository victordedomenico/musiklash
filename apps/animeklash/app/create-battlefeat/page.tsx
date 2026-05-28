import SectionHeader from "@/components/ui/SectionHeader";
import CreateBattleFeatForm from "./CreateBattleFeatForm";

export const metadata = { title: "Créer un BattleClash solo — AnimeKlash" };

export default function CreateBattleFeatPage() {
  return (
    <div className="page-shell py-12">
      <SectionHeader
        title="Créer un BattleClash solo"
        subtitle="Choisis un personnage de départ et une difficulté. D'autres joueurs pourront rejouer ton BattleClash solo."
      />
      <div className="mt-8 mx-auto max-w-3xl">
        <CreateBattleFeatForm />
      </div>
    </div>
  );
}
