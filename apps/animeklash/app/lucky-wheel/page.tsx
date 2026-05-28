import type { Metadata } from "next";
import LuckyWheelClient from "./LuckyWheelClient";

export const metadata: Metadata = {
  title: "Roue de la chance · AnimeKlash",
  description:
    "Tu ne sais pas quoi regarder ? Ajoute des titres d'animé ou des persos, tourne la roue et laisse le hasard décider.",
};

export default function LuckyWheelPage() {
  return (
    <div className="page-shell py-8 lg:py-12">
      <LuckyWheelClient />
    </div>
  );
}
