import { cookies } from "next/headers";
import "./globals.css";
import SiteSidebar from "@/components/SiteSidebar";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import SiteIntroVideo from "@/components/SiteIntroVideo";
import GuestPseudoPrompt from "@/components/GuestPseudoPrompt";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { getCookieConsent, hasAnalyticsConsent, hasPreferencesConsent } from "@/lib/cookie-consent";
import { Analytics } from "@vercel/analytics/next";
import { getI18n } from "@/lib/i18n";
import { absoluteUrl, rootMetadata, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { hasCustomGuestUsername } from "@/lib/guest";

export const metadata = rootMetadata;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieConsent = await getCookieConsent();
  const canUsePreferenceCookies = hasPreferencesConsent(cookieConsent);
  const canUseAnalyticsCookies = hasAnalyticsConsent(cookieConsent);
  const storedTheme = canUsePreferenceCookies ? cookieStore.get("theme")?.value : null;
  const theme =
    storedTheme === "light" || storedTheme === "system" || storedTheme === "dark"
      ? storedTheme
      : "dark";
  const { locale, t } = await getI18n();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isRegisteredUser = Boolean(
    user && !user.is_anonymous && !user.email?.endsWith("@guest.bracketfight.local"),
  );
  const needsGuestPseudo = !isRegisteredUser && !(await hasCustomGuestUsername());

  return (
    <html
      lang={locale}
      data-theme={theme}
      data-scroll-behavior="smooth"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: absoluteUrl(),
            logo: absoluteUrl("/icon"),
            description: SITE_DESCRIPTION,
            email: "contact@musiklash.com",
            sameAs: [],
          }}
        />
        <div className="site-layout">
          <SiteSidebar theme={theme} locale={locale} />
          <main className="site-main">
            {children}
            <Footer />
          </main>
        </div>
        <SiteIntroVideo labels={t.introVideo} />
        <GuestPseudoPrompt needsPseudo={needsGuestPseudo} texts={t.pseudoPrompt} />
        <CookieConsentBanner initialConsent={cookieConsent} />
        {canUseAnalyticsCookies ? <Analytics /> : null}
      </body>
    </html>
  );
}
