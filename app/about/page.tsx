import type { Metadata } from "next";
import Link from "next/link";
import { Swords, Users, Zap } from "lucide-react";

export const metadata: Metadata = { title: "À propos — MusiKlash" };

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
            MusiKlash est né d&apos;une frustration : les débats sur la musique ne se concluent jamais.
            Quel est le meilleur son de cet artiste ? L&apos;album le plus fort ? Plutôt que de tourner
            en rond, on a construit un outil pour trancher — écoute par écoute, duel par duel.
          </p>
          <p style={{ color: "var(--muted-strong)", lineHeight: 1.75 }}>
            N&apos;importe qui peut créer un tournoi en quelques clics, l&apos;écouter via les extraits Deezer
            et partager le verdict avec ses amis ou la communauté.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-bold">Ce qu&apos;on propose</h2>
          <div className="grid gap-3 sm:grid-cols-3 mt-2">
            {[
              { icon: <Swords size={18} />, title: "Brackets", desc: "Tournois à élimination directe de 4 à 32 morceaux." },
              { icon: <Users size={18} />, title: "Tierlists & Blindtests", desc: "Classer ou deviner des morceaux sans les voir." },
              { icon: <Zap size={18} />, title: "BattleFeat", desc: "Le jeu de chaîne de featurings, solo ou multijoueur." },
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
              href="mailto:contact@musiklash.com"
              style={{ color: "var(--accent)" }}
              className="hover:underline"
            >
              contact@musiklash.com
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
