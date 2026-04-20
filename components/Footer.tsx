import Link from "next/link";
import { Music } from "lucide-react";
import { getI18n } from "@/lib/i18n";

export default async function Footer() {
  const { t } = await getI18n();
  const f = t.footer;

  const columns = [
    {
      title: f.features,
      links: [
        { label: f.createBracket, href: "/create-bracket" },
        { label: f.createTierlist, href: "/create-tierlist" },
        { label: f.play, href: "/explore" },
        { label: f.myBrackets, href: "/my-brackets" },
        { label: f.myTierlists, href: "/my-brackets?tab=tierlists" },
      ],
    },
    {
      title: f.support,
      links: [
        { label: f.faq, href: "/faq" },
        { label: f.guide, href: "/guide" },
        { label: f.resources, href: "/resources" },
        { label: f.about, href: "/about" },
        { label: f.contact, href: "mailto:contact@musiklash.com" },
        { label: f.copyright, href: "/copyright" },
      ],
    },
    {
      title: f.legal,
      links: [
        { label: f.privacy, href: "/privacy" },
        { label: f.terms, href: "/terms" },
        { label: f.legalNotice, href: "/legal" },
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
              className="inline-flex items-center gap-2 font-bold"
              style={{ fontSize: "1rem", letterSpacing: "-0.02em", color: "var(--foreground)" }}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}
              >
                <Music size={13} className="text-white" />
              </span>
              Musi<span style={{ color: "var(--accent)" }}>Klash</span>
            </Link>
            <p
              className="mt-3 text-sm leading-relaxed"
              style={{ color: "var(--muted)", maxWidth: "18rem" }}
            >
              Fais s&apos;affronter tes sons, partage tes classements, défie tes amis.
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
            <span>© 2026 MusiKlash. {f.allRightsReserved}</span>
            <span style={{ color: "var(--border-strong)" }}>·</span>
            <span>
              {f.catalog}{" "}
              <a
                href="https://developers.deezer.com/api"
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--accent)" }}
                className="hover:underline"
              >
                Deezer API
              </a>
            </span>
          </div>

          {/* Right — legal + contact */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {[
              { label: f.privacy, href: "/privacy" },
              { label: f.terms, href: "/terms" },
              { label: f.legalNotice, href: "/legal" },
              { label: f.contact, href: "mailto:contact@musiklash.com" },
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
            <span style={{ color: "var(--border-strong)" }}>·</span>
            <a
              href="mailto:contact@musiklash.com"
              className="hover:underline"
              style={{ color: "var(--muted)" }}
            >
              contact@musiklash.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
