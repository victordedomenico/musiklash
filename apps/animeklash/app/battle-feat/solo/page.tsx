import type { Metadata } from "next";
import BattleFeatSolo from "./BattleFeatSolo";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "BattleClash Solo vs IA",
  description:
    "Affronte l'IA dans un duel de co-apparitions : enchaîne les personnages d'animé qui se sont croisés. 3 niveaux de difficulté.",
  path: "/battle-feat/solo",
});

export default function BattleFeatSoloPage() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-1 py-5 sm:px-2 sm:py-8">
      <div className="mb-6 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-[color:var(--accent)]">
          AnimeKlash BattleClash
        </p>
        <h1 className="mt-1 text-3xl font-black">Solo vs IA</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Enchaînez les personnages qui se sont croisés dans les mêmes animés.
        </p>
      </div>
      <BattleFeatSolo />
    </div>
  );
}
