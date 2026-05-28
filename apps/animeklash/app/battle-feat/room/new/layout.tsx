import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Créer une room BattleClash",
  description:
    "Lance une partie BattleClash multijoueur en temps réel et partage le lien à tes amis.",
  path: "/battle-feat/room/new",
  noIndex: true,
});

export default function NewBattleClashRoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
