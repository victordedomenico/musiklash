import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import SiteSidebar from "@/components/SiteSidebar";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { getCookieConsent, hasPreferencesConsent } from "@/lib/cookie-consent";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "MusiKlash — Fais s'affronter tes sons",
  description:
    "Crée des tournois musicaux, vote en écoutant chaque extrait et partage tes classements. Brackets, tierlists, blindtests et BattleFeat — gratuit, sans pub.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieConsent = await getCookieConsent();
  const canUsePreferenceCookies = hasPreferencesConsent(cookieConsent);
  const theme = canUsePreferenceCookies && cookieStore.get("theme")?.value === "light" ? "light" : "dark";
  const locale = canUsePreferenceCookies && cookieStore.get("locale")?.value === "en" ? "en" : "fr";

  return (
    <html
      lang={locale}
      data-theme={theme}
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="min-h-full">
        <div className="site-layout">
          <SiteSidebar theme={theme} locale={locale} />
          <main className="site-main">{children}</main>
        </div>
        <CookieConsentBanner initialConsent={cookieConsent} />
        <Analytics />
      </body>
    </html>
  );
}
