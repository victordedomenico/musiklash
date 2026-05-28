import SectionHeader from "@/components/ui/SectionHeader";
import CreateBattleFeatForm from "./CreateBattleFeatForm";

export const metadata = { title: "Créer un BattleFeat solo — MusiKlash" };

export default function CreateBattleFeatPage() {
  return (
    <div className="page-shell py-12">
      <SectionHeader
        title="Créer un BattleFeat solo"
        subtitle="Choisis un artiste de départ et une difficulté. D'autres joueurs pourront rejouer ton BattleFeat solo."
      />
      <div className="mt-8 mx-auto max-w-3xl">
        <CreateBattleFeatForm />
      </div>
    </div>
  );
}
