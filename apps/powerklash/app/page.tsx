import type { Metadata } from "next";
import Link from "next/link";
import { CirclePlus } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import { getI18n } from "@/lib/i18n";
import { getTopCharacters } from "@/lib/top-characters";
import { absoluteUrl, buildPageMetadata, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Tierlists de power scaling gratuites",
  description:
    "Classe la puissance de tes personnages anime. Tierlists et brackets de power scaling — PowerKlash, 100 % gratuit.",
  path: "/",
});

export default async function Home() {
  const { t } = await getI18n();
  const topCharacters = await getTopCharacters(18);
  const marqueeItems = topCharacters.length > 0 ? [...topCharacters, ...topCharacters] : [];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: absoluteUrl(),
          description:
            "Plateforme gratuite de power scaling : tierlists et brackets entre personnages anime.",
        }}
      />
      <div className="space-y-4">
        <section
          className="relative rounded-[36px] border px-7 py-12 text-center sm:px-10 md:px-12 md:py-16 lg:px-20 lg:py-20"
          style={{
            borderColor: "var(--border-strong)",
            background: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[36px]"
            style={{
              background:
                "radial-gradient(900px 480px at 55% 10%, rgba(234,179,8,0.22) 0%, rgba(250,204,21,0.10) 45%, transparent 78%)",
            }}
          />
          <div className="relative">
            <p
              className="mx-auto inline-flex rounded-full border px-5 py-2 text-[0.72rem] font-bold uppercase tracking-[0.2em]"
              style={{
                color: "var(--accent)",
                borderColor: "color-mix(in srgb, var(--accent) 35%, transparent)",
                background: "var(--accent-dim)",
              }}
            >
              {t.home.badge}
            </p>
            <h1
              className="mt-7 px-[0.08em] pb-[0.06em] font-black leading-[1.06] tracking-[-0.025em]"
              style={{ fontSize: "clamp(3.1rem, 9vw, 7.2rem)", color: "var(--foreground)" }}
            >
              {t.homeHero.title1} {t.homeHero.title2}{" "}
              <span
                className="inline-block pb-[0.05em]"
                style={{
                  background: "linear-gradient(90deg, #eab308 5%, #facc15 45%, #fef08a 85%)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                {t.homeHero.highlight}
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-[color:var(--muted-strong)]">
              {t.homeHero.subtitle}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/create" className="btn-primary inline-flex items-center gap-2">
                <CirclePlus size={18} />
                {t.nav.create}
              </Link>
              <Link href="/explore" className="btn-ghost">
                {t.nav.explore}
              </Link>
            </div>
          </div>
        </section>

        {marqueeItems.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-[color:var(--border)] py-4">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-[color:var(--muted)]">
              {t.homeHero.coversTopFallback}
            </p>
            <div className="flex gap-3 animate-[marquee_40s_linear_infinite] w-max">
              {marqueeItems.map((c, i) => (
                <div
                  key={`${c.id}-${i}`}
                  className="h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)]"
                  style={
                    c.coverUrl
                      ? { backgroundImage: `url(${c.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : undefined
                  }
                  title={c.title}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
