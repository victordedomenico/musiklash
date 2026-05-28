import type { Metadata } from "next";
import Link from "next/link";
import { Swords, Users, Zap } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "À propos",
  description:
    "AnimeKlash permet de trancher les débats anime avec des tournois, tierlists, blindtests openings et BattleClash. Mission et modes de jeu.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="refit-doc-page">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-4xl font-black mb-2">À propos</h1>
        <p style={{ color: "var(--muted)" }}>
          Ce que nous construisons et pourquoi.
        </p>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-bold">L&apos;idée</h2>
          <p style={{ color: "var(--muted-strong)", lineHeight: 1.75 }}>
            AnimeKlash est né d&apos;une frustration : les débats anime ne se concluent jamais.
            Quel est le meilleur shōnen ? La meilleure opening ? Plutôt que de tourner en rond,
            on a construit un outil pour trancher — duel par duel, vote par vote.
          </p>
          <p style={{ color: "var(--muted-strong)", lineHeight: 1.75 }}>
            N&apos;importe qui peut créer un tournoi en quelques clics à partir d&apos;AniList,
            écouter les openings via AnimeThemes.moe et partager le verdict avec ses amis ou la communauté.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-bold">Ce qu&apos;on propose</h2>
          <div className="grid gap-3 sm:grid-cols-3 mt-2">
            {[
              { icon: <Swords size={18} />, title: "Brackets", desc: "Tournois à élimination directe de 4 à 32 animés ou personnages." },
              { icon: <Users size={18} />, title: "Tierlists & Blindtests", desc: "Classer ou deviner des openings et personnages." },
              { icon: <Zap size={18} />, title: "BattleClash", desc: "Le jeu de chaîne de co-apparitions, solo ou multijoueur." },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl p-4"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div
                  className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                >
                  {icon}
                </div>
                <p className="font-semibold text-sm mb-1">{title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-bold">Contact</h2>
          <p style={{ color: "var(--muted-strong)", lineHeight: 1.75 }}>
            Pour toute question, suggestion ou signalement, contactez-nous à{" "}
            <a
              href="mailto:contact@animeklash.com"
              style={{ color: "var(--accent)" }}
              className="hover:underline"
            >
              contact@animeklash.com
            </a>
            .
          </p>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/explore" className="btn-primary">Explorer les brackets</Link>
          <Link href="/create-bracket" className="btn-ghost">Créer un bracket</Link>
        </div>
      </div>
    </div>
  );
}
