import "server-only";

import { cookies, headers } from "next/headers";
import {
  resolveLocale,
  buildDictionary,
  type Locale,
  type Dictionary,
} from "@klash/i18n";
import { getCurrentVertical } from "@klash/klash-config";
import { getCookieConsent, hasPreferencesConsent } from "@klash/klash-app/lib/cookie-consent";

export type { Dictionary, Locale };

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
  const { i18nOverrides } = getCurrentVertical();
  return buildDictionary(locale, i18nOverrides);
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
