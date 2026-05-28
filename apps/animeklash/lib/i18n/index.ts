import { cookies, headers } from "next/headers";
import { resolveLocale, type Locale } from "@klash/i18n";
import { fr } from "./fr";
import { en } from "./en";
import { getCookieConsent, hasPreferencesConsent } from "@/lib/cookie-consent";

export type { Dictionary } from "./fr";
export type { Locale };

export async function getLocale(): Promise<Locale> {
  const consent = await getCookieConsent();
  const canUsePreferenceCookies = hasPreferencesConsent(consent);
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  return resolveLocale({
    canUsePreferenceCookies,
    cookieLocale: cookieStore.get("locale")?.value,
    requestHeaders,
  });
}

export function getDictionary(locale: Locale) {
  return locale === "en" ? en : fr;
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
