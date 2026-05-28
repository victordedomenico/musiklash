import type { Metadata } from "next";
import Link from "next/link";
import { CirclePlus } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import { getI18n } from "@/lib/i18n";
import { getTopAnime } from "@/lib/top-anime";
import { absoluteUrl, buildPageMetadata, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Tournois anime en ligne gratuits",
  description:
    "Crée des brackets, tierlists et blindtests autour des animés. Vote pour tes séries, openings et personnages préférés. AnimeKlash — 100 % gratuit.",
  path: "/",
});

export default async function Home() {
  const { t } = await getI18n();
  const topAnime = await getTopAnime(18);
  const marqueeItems = topAnime.length > 0 ? [...topAnime, ...topAnime] : [];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: absoluteUrl(),
          description:
            "Plateforme gratuite de jeux animé : brackets, tierlists, blindtests openings, Smash or Pass et Stream Clash.",
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${absoluteUrl("/explore")}?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
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
                "radial-gradient(900px 480px at 55% 10%, rgba(239,68,68,0.22) 0%, rgba(249,115,22,0.10) 45%, transparent 78%)",
            }}
          />
          <div className="relative">
            <p
              className="mx-auto inline-flex rounded-full border px-5 py-2 text-[0.72rem] font-bold uppercase tracking-[0.2em]"
              style={{
                color: "#ff4b7d",
                borderColor: "rgba(255,75,125,0.35)",
                background: "rgba(255,75,125,0.12)",
              }}
            >
              {t.homeHero.newBadge}
            </p>
            <h1
              className="mt-7 px-[0.08em] pb-[0.06em] font-black leading-[1.06] tracking-[-0.025em]"
              style={{ fontSize: "clamp(3.1rem, 9vw, 7.2rem)", color: "var(--foreground)" }}
            >
              {t.homeHero.title1} {t.homeHero.title2}
              <br />
              <span
                className="inline-block pb-[0.05em]"
                style={{
                  background:
                    "linear-gradient(90deg, #ff5a8b 5%, #ff8f74 35%, #7ce3ff 70%, #5effd6 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {t.homeHero.highlight}
              </span>{" "}
              {t.homeHero.title3}
            </h1>
            <p
              className="mx-auto mt-7 max-w-[860px] text-[1.48rem] leading-relaxed"
              style={{ color: "var(--muted-strong)" }}
            >
              {t.homeHero.subtitle}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/create"
                className="btn-primary"
                style={{ padding: "1.05rem 2rem", fontSize: "1.1rem", borderRadius: "1rem" }}
              >
                <CirclePlus size={19} />
                {t.homeHero.ctaCreate}
              </Link>
              <Link
                href="/explore"
                className="btn-ghost"
                style={{ padding: "1.05rem 2.75rem", fontSize: "1.1rem", borderRadius: "1rem" }}
              >
                {t.homeHero.ctaExplore}
              </Link>
            </div>
            {marqueeItems.length > 0 ? (
              <div className="mt-8">
                <p
                  className="mb-3 text-xs font-semibold uppercase tracking-[0.14em]"
                  style={{ color: "var(--muted-strong)" }}
                >
                  Animés en tendance
                </p>
                <div className="home-covers-mask">
                  <div className="home-covers-track">
                    {marqueeItems.map((anime, index) => (
                      <a
                        key={`${anime.id}-${index}`}
                        href={anime.url}
                        target="_blank"
                        rel="noreferrer"
                        className="home-cover-item"
                        aria-label={anime.title}
                        title={anime.title}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={anime.coverUrl}
                          alt={anime.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}
