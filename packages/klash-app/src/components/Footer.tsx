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
