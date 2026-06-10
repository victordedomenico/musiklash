import type { Metadata } from "next";
import Link from "next/link";
import { CirclePlus } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import { getI18n } from "@/lib/i18n";
import { absoluteUrl, buildPageMetadata, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Tournois sourates & islam en ligne gratuits",
  description:
    "Crée des brackets et tierlists islamiques. Vote pour tes sourates, prophètes et mosquées préférés. IslamKlash — 100 % gratuit.",
  path: "/",
});

const FEATURED_SURAHS = [
  { id: "1", name: "Al-Fatiha", arabic: "الفاتحة" },
  { id: "2", name: "Al-Baqara", arabic: "البقرة" },
  { id: "18", name: "Al-Kahf", arabic: "الكهف" },
  { id: "36", name: "Ya-Sin", arabic: "يس" },
  { id: "55", name: "Ar-Rahman", arabic: "الرحمن" },
  { id: "67", name: "Al-Mulk", arabic: "الملك" },
  { id: "112", name: "Al-Ikhlas", arabic: "الإخلاص" },
  { id: "97", name: "Al-Qadr", arabic: "القدر" },
  { id: "56", name: "Al-Waqi'a", arabic: "الواقعة" },
  { id: "103", name: "Al-'Asr", arabic: "العصر" },
  { id: "113", name: "Al-Falaq", arabic: "الفلق" },
  { id: "114", name: "An-Nas", arabic: "الناس" },
];

export default async function Home() {
  const { t } = await getI18n();
  const marqueeItems = [...FEATURED_SURAHS, ...FEATURED_SURAHS];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: absoluteUrl(),
          description:
            "Plateforme gratuite de tournois islamiques : brackets et tierlists autour des sourates, prophètes et mosquées.",
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
                "radial-gradient(900px 480px at 55% 10%, rgba(21,128,61,0.22) 0%, rgba(34,197,94,0.10) 45%, transparent 78%)",
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
                  background: "linear-gradient(90deg, #15803d 5%, #22c55e 45%, #86efac 85%)",
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

        <section className="overflow-hidden rounded-2xl border border-[color:var(--border)] py-4">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-[color:var(--muted)]">
            {t.homeHero.coversTopFallback}
          </p>
          <div className="home-covers-mask">
            <div className="home-covers-track">
              {marqueeItems.map((s, i) => (
                <div
                  key={`${s.id}-${i}`}
                  className="home-cover-item flex flex-col items-center justify-center text-center px-1 bg-[color:var(--surface-2)]"
                >
                  <span className="text-xl font-bold" style={{ color: "var(--accent)" }}>{s.arabic}</span>
                  <span className="mt-1 text-[9px] leading-tight" style={{ color: "var(--muted)" }}>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
