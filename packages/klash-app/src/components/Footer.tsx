import Link from "next/link";
import { getI18n } from "@klash/klash-app/lib/i18n";
import { BrandMark } from "@klash/klash-app/components/BrandLogo";

export default async function Footer() {
  const { t } = await getI18n();
  const f = t.footer;
  const sidebar = t.sidebar;

  const columns = [
    {
      title: f.features,
      links: [
        { label: f.createBracket, href: "/create-bracket" },
        { label: f.createTierlist, href: "/create-tierlist" },
        { label: f.play, href: "/explore" },
        { label: f.myBrackets, href: "/my-library" },
        { label: f.myTierlists, href: "/my-library?tab=tierlists" },
      ],
    },
    {
      title: f.support,
      links: [
        { label: f.faq, href: "/faq" },
        { label: f.guide, href: "/guide" },
        { label: f.resources, href: "/resources" },
        { label: f.about, href: "/about" },
        { label: f.contact, href: `mailto:${process.env.NEXT_PUBLIC_KLASH_CONTACT_EMAIL ?? "contact@klash.app"}` },
        { label: f.copyright, href: "/copyright" },
      ],
    },
    {
      title: f.legal,
      links: [
        { label: f.privacy, href: "/privacy" },
        { label: f.terms, href: "/terms" },
        { label: f.legalNotice, href: "/legal" },
        { label: f.privacyRights, href: "/privacy-rights" },
        { label: f.cookieSettings, href: "/cookies" },
      ],
    },
  ];

  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
        marginTop: "4rem",
      }}
    >
      {/* ── Main grid ── */}
      <div className="page-shell py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-3"
              style={{ color: "var(--foreground)" }}
            >
              <BrandMark size={36} />
              <div>
                <p className="text-[1.2rem] font-black leading-none tracking-tight">{process.env.NEXT_PUBLIC_KLASH_NAME ?? "Klash"}</p>
                <p
                  className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: "var(--muted)" }}
                >
                  {sidebar.tagline}
                </p>
              </div>
            </Link>
            <p
              className="mt-3 text-sm leading-relaxed"
              style={{ color: "var(--muted)", maxWidth: "18rem" }}
            >
              {f.description}
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <p
                className="mb-4 text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--muted)" }}
              >
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors"
                      style={{ color: "var(--muted-strong)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── TMDB attribution (verticaux consommant l'API TMDB) ── */}
      {process.env.NEXT_PUBLIC_KLASH_TMDB_ATTRIBUTION === "true" && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          <div
            className="page-shell flex flex-wrap items-center gap-x-3 gap-y-2 py-4 text-xs"
            style={{ color: "var(--muted)" }}
          >
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noreferrer"
              aria-label="The Movie Database (TMDB)"
              className="inline-flex shrink-0"
            >
              <TmdbLogo />
            </a>
            <span style={{ maxWidth: "42rem" }}>
              Données séries &amp; films fournies par TMDB. Cette application utilise l&apos;API
              TMDB mais n&apos;est ni approuvée ni certifiée par TMDB.
            </span>
          </div>
        </div>
      )}

      {/* ── Bottom bar ── */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <div
          className="page-shell flex flex-col gap-3 py-5 text-xs md:flex-row md:items-center md:justify-between"
          style={{ color: "var(--muted)" }}
        >
          {/* Left — copyright + catalog */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} {process.env.NEXT_PUBLIC_KLASH_NAME ?? "Klash"}. {f.allRightsReserved}</span>
            <span style={{ color: "var(--border-strong)" }}>·</span>
            <span>
              {f.catalog}{" "}
              <a
                href={process.env.NEXT_PUBLIC_KLASH_API_CREDIT_URL ?? "#"}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--accent)" }}
                className="hover:underline"
              >
                {process.env.NEXT_PUBLIC_KLASH_API_CREDIT_LABEL ?? "API"}
              </a>
            </span>
          </div>

          {/* Right — legal + contact */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {[
              { label: f.privacy, href: "/privacy" },
              { label: f.terms, href: "/terms" },
              { label: f.legalNotice, href: "/legal" },
              { label: f.privacyRights, href: "/privacy-rights" },
              { label: f.cookieSettings, href: "/cookies" },
              { label: f.contact, href: `mailto:${process.env.NEXT_PUBLIC_KLASH_CONTACT_EMAIL ?? "contact@klash.app"}` },
            ].map((link, i, arr) => (
              <span key={link.label} className="inline-flex items-center gap-4">
                <Link
                  href={link.href}
                  className="hover:underline transition-colors"
                  style={{ color: "var(--muted)" }}
                >
                  {link.label}
                </Link>
                {i < arr.length - 1 && (
                  <span style={{ color: "var(--border-strong)" }}>·</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/** Logo officiel TMDB (mark horizontal « tmdb » dégradé). */
function TmdbLogo() {
  return (
    <svg
      viewBox="0 0 273.42 35.52"
      role="img"
      aria-label="TMDB"
      style={{ height: 14, width: "auto", display: "block" }}
    >
      <defs>
        <linearGradient id="tmdb-grad" y1="17.76" x2="273.42" y2="17.76" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#90cea1" />
          <stop offset=".56" stopColor="#3cbec9" />
          <stop offset="1" stopColor="#00b3e5" />
        </linearGradient>
      </defs>
      <path
        fill="url(#tmdb-grad)"
        d="M191.85 35.37h63.9a17.67 17.67 0 0017.67-17.67A17.67 17.67 0 00255.75 0h-63.9a17.67 17.67 0 00-17.67 17.7 17.67 17.67 0 0017.67 17.67zm-181.75.05h7.8V6.92H28V0H0v6.9h10.1zm28.1 0H46V8.25h.1l8.95 27.15h6L70.3 8.25h.1V35.4h7.8V0H66.45l-8.2 23.1h-.1L50 0H38.2zM89.14.12h11.7a33.56 33.56 0 018.08 1 18.52 18.52 0 016.67 3.08 15.09 15.09 0 014.53 5.52 18.5 18.5 0 011.67 8.25 16.91 16.91 0 01-1.62 7.58 16.3 16.3 0 01-4.38 5.5 19.24 19.24 0 01-6.35 3.37 24.53 24.53 0 01-7.55 1.15H89.14zm7.8 28.2h4a21.66 21.66 0 005-.55A10.58 10.58 0 00110 26a8.73 8.73 0 002.68-3.35 11.9 11.9 0 001-5.08 9.87 9.87 0 00-1-4.52 9.17 9.17 0 00-2.63-3.18A11.61 11.61 0 00106.22 8a17.06 17.06 0 00-4.68-.63h-4.6zM133.09.12h13.2a32.87 32.87 0 014.63.33 12.66 12.66 0 014.17 1.3 7.94 7.94 0 013 2.72 8.34 8.34 0 011.15 4.65 7.48 7.48 0 01-1.67 5 9.13 9.13 0 01-4.43 2.82V17a10.28 10.28 0 013.18 1 8.51 8.51 0 012.45 1.85 7.79 7.79 0 011.57 2.62 9.16 9.16 0 01.55 3.2 8.52 8.52 0 01-1.2 4.68 9.32 9.32 0 01-3.1 3 13.38 13.38 0 01-4.27 1.65 22.5 22.5 0 01-4.73.5h-14.5zm7.8 14.15h5.65a7.65 7.65 0 001.78-.2 4.78 4.78 0 001.57-.65 3.43 3.43 0 001.13-1.2 3.63 3.63 0 00.42-1.8A3.3 3.3 0 00151 8.6a3.42 3.42 0 00-1.23-1.13A6.07 6.07 0 00148 6.9a9.9 9.9 0 00-1.85-.18h-5.3zm0 14.65h7a8.27 8.27 0 001.83-.2 4.67 4.67 0 001.67-.7 3.93 3.93 0 001.23-1.3 3.8 3.8 0 00.47-1.95 3.16 3.16 0 00-.62-2 4 4 0 00-1.58-1.18 8.23 8.23 0 00-2-.55 15.12 15.12 0 00-2.05-.15h-5.9z"
      />
    </svg>
  );
}
