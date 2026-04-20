import { cookies } from "next/headers";
import { fr } from "./fr";
import { en } from "./en";
import { getCookieConsent, hasPreferencesConsent } from "@/lib/cookie-consent";

export type Locale = "fr" | "en";
export type { Dictionary } from "./fr";

export async function getLocale(): Promise<Locale> {
  const consent = await getCookieConsent();
  if (!hasPreferencesConsent(consent)) {
    return "fr";
  }
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value;
  return locale === "en" ? "en" : "fr";
}

export function getDictionary(locale: Locale) {
  return locale === "en" ? en : fr;
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
