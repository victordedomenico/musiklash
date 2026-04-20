import Link from "next/link";
import { Menu, UserCircle2 } from "lucide-react";
import { getI18n } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { signOut, updateGuestUsername } from "@/app/(auth)/actions";
import ThemeToggle from "@/components/ThemeToggle";
import LocaleToggle from "@/components/LocaleToggle";
import SidebarNavLinks from "@/components/SidebarNavLinks";
import SidebarVolumeControl from "@/components/SidebarVolumeControl";
import { BrandMark } from "@/components/BrandLogo";
import { getGuestIdentityFromCookies } from "@/lib/guest";

type SiteSidebarProps = {
  theme: "dark" | "light";
  locale: "fr" | "en";
};

export default async function SiteSidebar({ theme, locale }: Readonly<SiteSidebarProps>) {
  const { t } = await getI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const guestIdentity = user ? null : await getGuestIdentityFromCookies();

  const topLinks = [
    { href: "/", label: t.nav.home, icon: "home" as const },
    { href: "/explore", label: t.nav.explore, icon: "search" as const },
    { href: "/create", label: t.nav.create, icon: "create" as const },
  ];

  const bottomLinks = [
    { href: "/my-brackets", label: t.nav.myLibrary, icon: "library" as const },
  ];

  const helperLinks = [
    { href: "/guide", label: t.nav.guide, icon: "guide" as const },
    ...(user ? [{ href: "/settings", label: t.nav.settings, icon: "settings" as const }] : []),
  ];

  const authSection = user ? (
    <form action={signOut} className="mt-6 lg:mt-8">
      <button
        type="submit"
        className="w-full rounded-2xl border px-4 py-3 text-left text-base font-semibold lg:py-4 lg:text-[1.03rem]"
        style={{
          borderColor: "var(--border-strong)",
          color: "var(--foreground)",
          background: "var(--surface-2)",
        }}
      >
        {t.nav.logout}
      </button>
    </form>
  ) : (
    <div className="mt-6 space-y-3 lg:mt-8">
      {guestIdentity ? (
        <div
          className="rounded-2xl border px-4 py-3"
          style={{
            borderColor: "var(--border-strong)",
            color: "var(--foreground)",
            background: "var(--surface-2)",
          }}
        >
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>
            Mode invite
          </p>
          <p className="mt-1 text-sm font-semibold">{guestIdentity.username}</p>
          <form action={updateGuestUsername} className="mt-3 space-y-2">
            <input
              type="text"
              name="username"
              defaultValue={guestIdentity.username}
              minLength={3}
              maxLength={24}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                color: "var(--foreground)",
              }}
            />
            <button type="submit" className="btn-ghost w-full justify-center text-sm">
              Modifier le pseudo
            </button>
          </form>
        </div>
      ) : null}
      <Link
        href="/login"
        className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-base lg:py-4 lg:text-[1.03rem]"
        style={{
          borderColor: "var(--border-strong)",
          color: "var(--foreground)",
          background: "var(--surface-2)",
        }}
      >
        <UserCircle2 size={20} />
        <span className="font-semibold">{t.nav.login}</span>
      </Link>
    </div>
  );

  return (
    <>
      <div className="sticky top-2 z-30 lg:hidden">
        <details className="group">
          <summary
            className="site-sidebar flex list-none items-center justify-between rounded-2xl border px-3 py-2.5 [&::-webkit-details-marker]:hidden"
            style={{ borderColor: "var(--border-strong)" }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark size={36} />
              <div className="min-w-0">
                <p className="truncate text-base font-black leading-none" style={{ color: "var(--foreground)" }}>
                  MusiKlash
                </p>
                <p className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>
                  {t.sidebar.tagline}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle current={theme} />
              <LocaleToggle current={locale} />
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--foreground)" }}
              >
                <Menu size={16} />
              </span>
            </div>
          </summary>

          <div
            className="site-sidebar mt-2 rounded-2xl border p-3"
            style={{ borderColor: "var(--border-strong)" }}
          >
            <div className="space-y-1.5">
              <SidebarNavLinks links={topLinks} />
              <SidebarNavLinks links={bottomLinks} />
            </div>
            <SidebarVolumeControl label={t.sidebar.previewVolume} />

            <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--border)" }}>
              <p
                className="mb-4 px-2 text-[0.72rem] font-bold uppercase tracking-[0.32em]"
                style={{ color: "var(--muted)" }}
              >
                {t.nav.assistance}
              </p>
              <SidebarNavLinks links={helperLinks} />
            </div>

            {authSection}
          </div>
        </details>
      </div>

      <aside className="site-sidebar hidden rounded-2xl border p-3 sm:p-4 lg:block lg:rounded-3xl lg:p-5">
        <div className="mb-6 flex items-center gap-3 px-1 lg:mb-8">
          <BrandMark size={44} />
          <div>
            <p
              className="text-[1.45rem] font-black leading-none tracking-tight sm:text-[1.65rem]"
              style={{ color: "var(--foreground)" }}
            >
              MusiKlash
            </p>
            <p
              className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.24em] sm:text-[0.66rem] sm:tracking-[0.28em]"
              style={{ color: "var(--muted)" }}
            >
              {t.sidebar.tagline}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <SidebarNavLinks links={topLinks} />
          <SidebarNavLinks links={bottomLinks} />
        </div>

        <div className="mt-5 flex items-center gap-2 px-2 lg:mt-7">
          <ThemeToggle current={theme} />
          <LocaleToggle current={locale} />
        </div>
        <SidebarVolumeControl label={t.sidebar.previewVolume} />

        <div className="mt-7 border-t pt-6 lg:mt-10 lg:pt-8" style={{ borderColor: "var(--border)" }}>
          <p
            className="mb-4 px-2 text-[0.72rem] font-bold uppercase tracking-[0.35em]"
            style={{ color: "var(--muted)" }}
          >
            {t.nav.assistance}
          </p>
          <SidebarNavLinks links={helperLinks} />
        </div>
        {authSection}
      </aside>
    </>
  );
}
