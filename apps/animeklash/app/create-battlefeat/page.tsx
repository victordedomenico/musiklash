import type { Metadata } from "next";
import SectionHeader from "@/components/ui/SectionHeader";
import CreateBattleFeatForm from "./CreateBattleFeatForm";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Créer un défi BattleClash",
  description:
    "Publie un défi BattleClash solo : choisis un personnage de départ et une difficulté pour que la communauté enchaîne les co-apparitions.",
  path: "/create-battlefeat",
});

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
