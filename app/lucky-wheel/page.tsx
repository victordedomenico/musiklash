import type { Metadata } from "next";
import LuckyWheelClient, { type LuckyWheelTranslations } from "./LuckyWheelClient";
import { getI18n } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Roue de la chance · MusiKlash",
  description:
    "Tu sais pas à quoi jouer ? La roue tourne et choisit ton prochain mode de jeu au hasard parmi les six.",
};

export default async function LuckyWheelPage() {
  const { t } = await getI18n();
  const lw = t.luckyWheel;

  const translations: LuckyWheelTranslations = {
    title: lw.title,
    subtitle: lw.subtitle,
    spinAriaLabel: lw.spinAriaLabel,
    spinning: lw.spinning,
    respin: lw.respin,
    randomChose: lw.randomChose,
    playMode: lw.playMode,
    respin2: lw.respin2,
    closeAriaLabel: lw.closeAriaLabel,
    modeDescs: {
      bracket: lw.bracketDesc,
      tierlist: lw.tierlistDesc,
      blindtest: lw.blindtestDesc,
      "battle-feat": lw.battleFeatDesc,
      "smash-pass": lw.smashPassDesc,
      "stream-clash": lw.streamClashDesc,
    },
  };

  return (
    <div className="page-shell py-8 lg:py-12">
      <LuckyWheelClient t={translations} />
    </div>
  );
}
