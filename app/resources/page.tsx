import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ExternalLink, Swords, Zap } from "lucide-react";

import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Ressources",
  description:
    "Guides, documentation et liens utiles pour créer et partager vos jeux musicaux sur MusiKlash.",
  path: "/resources",
});

export default function ResourcesPage() {
  return (
    <div className="refit-doc-page">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-black mb-2">Ressources</h1>
        <p style={{ color: "var(--muted)" }}>Guides, liens utiles et documentation.</p>

        <section className="mt-10">
          <h2 className="text-xl font-bold mb-4">Guides internes</h2>
          <div className="space-y-2">
            {[
              {
                icon: <BookOpen size={16} />,
                title: "Le guide MusiKlash",
                desc: "Comprendre les brackets, choisir le bon format, conseils pour un tournoi réussi.",
                href: "/guide",
                external: false,
              },
              {
                icon: <Swords size={16} />,
                title: "Créer votre premier bracket",
                desc: "Tutoriel pas à pas : thème, sélection des morceaux, visibilité, partage.",
                href: "/create-bracket",
                external: false,
              },
              {
                icon: <Zap size={16} />,
                title: "Découvrir BattleFeat",
                desc: "Le jeu de chaîne de featurings — règles, modes solo et multijoueur.",
                href: "/battle-feat",
                external: false,
              },
            ].map((r) => (
              <Link
                key={r.title}
                href={r.href}
                className="flex items-start gap-4 rounded-xl p-4 transition-colors"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  textDecoration: "none",
                  color: "var(--foreground)",
                }}
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                >
                  {r.icon}
                </span>
                <div>
                  <p className="font-semibold text-sm">{r.title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--muted)" }}>
                    {r.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold mb-4">Liens externes</h2>
          <div className="space-y-2">
            {[
              {
                title: "Deezer API",
                desc: "Documentation officielle de l'API Deezer — catalogue musical utilisé par MusiKlash.",
                href: "https://developers.deezer.com/api",
              },
            ].map((r) => (
              <a
                key={r.title}
                href={r.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-4 rounded-xl p-4 transition-colors"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  textDecoration: "none",
                  color: "var(--foreground)",
                  display: "flex",
                }}
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                >
                  <ExternalLink size={16} />
                </span>
                <div>
                  <p className="font-semibold text-sm">{r.title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--muted)" }}>
                    {r.desc}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
