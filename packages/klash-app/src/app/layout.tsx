import { cookies } from "next/headers";

import SiteSidebar from "@klash/klash-app/components/SiteSidebar";
import CookieConsentBanner from "@klash/klash-app/components/CookieConsentBanner";
import Footer from "@klash/klash-app/components/Footer";
import JsonLd from "@klash/klash-app/components/JsonLd";
import {
  getCookieConsent,
  hasAnalyticsConsent,
  hasPreferencesConsent,
} from "@klash/klash-app/lib/cookie-consent";
import { Analytics } from "@vercel/analytics/next";
import { getLocale } from "@klash/klash-app/lib/i18n";
import { absoluteUrl, rootMetadata, SITE_DESCRIPTION, SITE_NAME } from "@klash/klash-app/lib/seo";

export const metadata = rootMetadata;

// The root layout reads cookies() / locale on every request (auth, guest
// sessions, theme, cookie-consent), so the whole app is inherently dynamic.
// Without this, Next 16 attempts to statically prerender /_not-found and
// throws "Expected workStore to be initialized" because cookies() runs
// outside a request scope during static export.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieConsent = await getCookieConsent();
  const canUsePreferenceCookies = hasPreferencesConsent(cookieConsent);
  const canUseAnalyticsCookies = hasAnalyticsConsent(cookieConsent);
  const theme = canUsePreferenceCookies && cookieStore.get("theme")?.value === "light" ? "light" : "dark";
  const locale = await getLocale();

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
            email: process.env.NEXT_PUBLIC_KLASH_CONTACT_EMAIL ?? "contact@klash.app",
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
        <CookieConsentBanner initialConsent={cookieConsent} />
        {canUseAnalyticsCookies ? <Analytics /> : null}
      </body>
    </html>
  );
}
