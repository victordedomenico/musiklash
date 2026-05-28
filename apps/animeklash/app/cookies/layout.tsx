import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Paramètres des cookies",
  description:
    "Gérez vos préférences de cookies sur AnimeKlash : thème, volume des previews et mesure d'audience.",
  path: "/cookies",
  noIndex: true,
});

export default function CookiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
