import Link from "next/link";
import type { Metadata } from "next";
import { getI18n } from "@klash/klash-app/lib/i18n";
import { rootMetadata } from "@klash/klash-app/lib/seo";

export const metadata: Metadata = {
  ...rootMetadata,
  title: "DemoKlash — Démo du monorepo Klash",
};

export default async function HomePage() {
  const { t } = await getI18n();

  return (
    <div className="page-shell py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--accent)] mb-4">
          Monorepo demo · config-only vertical
        </p>
        <h1 className="text-4xl font-black tracking-tight mb-4">
          {t.homeHero.title1 ?? "Bienvenue sur"}{" "}
          <span style={{ color: "var(--accent)" }}>
            {process.env.NEXT_PUBLIC_KLASH_NAME ?? "DemoKlash"}
          </span>
        </h1>
        <p className="text-lg text-[color:var(--muted)] mb-8">
          {t.sidebar.tagline}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/explore" className="btn-primary">
            {t.nav.explore}
          </Link>
          <Link href="/create-bracket" className="btn-ghost">
            {t.nav.createBracket ?? "Créer un bracket"}
          </Link>
        </div>
      </div>
    </div>
  );
}
