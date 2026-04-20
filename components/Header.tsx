import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import { ChevronDown, Library, Music, Plus, Swords } from "lucide-react";
import { getI18n } from "@/lib/i18n";
import { cookies } from "next/headers";
import ThemeToggle from "./ThemeToggle";
import LocaleToggle from "./LocaleToggle";
import { getCookieConsent, hasPreferencesConsent } from "@/lib/cookie-consent";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { t, locale } = await getI18n();
  const cookieStore = await cookies();
  const consent = await getCookieConsent();
  const canUsePreferenceCookies = hasPreferencesConsent(consent);
  const theme = canUsePreferenceCookies && cookieStore.get("theme")?.value === "light" ? "light" : "dark";

  return (
    <header className="sticky top-0 z-40 w-full" style={{ background: "color-mix(in srgb, var(--background) 88%, transparent)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)" }}>
      <div className="page-shell flex items-center gap-6 py-3.5">

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-extrabold tracking-tight"
          style={{ fontSize: "1.1rem", letterSpacing: "-0.03em", color: "var(--foreground)" }}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}
          >
            <Music size={15} className="text-white" />
          </span>
          Musi<span style={{ color: "var(--accent)" }}>Klash</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-1 md:flex" style={{ marginLeft: "0.5rem" }}>
          {[
            { href: "/explore", label: t.nav.explore },
            { href: "/guide", label: t.nav.guide },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="nav-link rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              {label}
            </Link>
          ))}
          {user && (
            <Link href="/my-brackets" className="nav-link rounded-lg px-3 py-2 text-sm font-medium transition-colors">
              {t.nav.myLibrary}
            </Link>
          )}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle current={theme} />
          <LocaleToggle current={locale} />

          {user ? (
            <>
              {/* Dropdown create */}
              <div className="group relative">
                <button
                  className="btn-primary"
                  style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
                >
                  <Plus size={15} />
                  {t.nav.create}
                  <ChevronDown size={13} style={{ opacity: 0.7 }} />
                </button>
                <div
                  className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-44 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
                    padding: "0.35rem",
                  }}
                >
                  {[
                    { href: "/create-bracket", icon: <Swords size={14} />, label: t.nav.createBracket },
                    { href: "/create-tierlist", icon: <Library size={14} />, label: t.nav.createTierlist },
                    { href: "/create-blindtest", icon: <Music size={14} />, label: t.nav.createBlindtest },
                  ].map(({ href, icon, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
                      style={{ color: "var(--muted-strong)" }}
                    >
                      <span style={{ color: "var(--accent)", opacity: 0.8 }}>{icon}</span>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>

              <Link
                href="/my-brackets"
                className="btn-ghost md:hidden"
                style={{ padding: "0.5rem 0.75rem" }}
              >
                <Library size={16} />
              </Link>

              <form action={signOut}>
                <button
                  type="submit"
                  className="btn-ghost"
                  style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
                >
                  {t.nav.logout}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="btn-ghost"
                style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
              >
                {t.nav.login}
              </Link>
              <Link
                href="/signup"
                className="btn-primary"
                style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem" }}
              >
                {t.nav.signup}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
