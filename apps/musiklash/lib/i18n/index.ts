import { cookies, headers } from "next/headers";
import { fr } from "./fr";
import { en } from "./en";
import { getCookieConsent, hasPreferencesConsent } from "@/lib/cookie-consent";

export type Locale = "fr" | "en";
export type { Dictionary } from "./fr";

const FRANCOPHONE_MAJOR_COUNTRIES = new Set([
  "FR",
  "BE",
  "CH",
  "CA",
  "LU",
  "MC",
  "SN",
  "CI",
  "CM",
  "CD",
  "CG",
  "GA",
  "BJ",
  "BF",
  "NE",
  "TG",
  "ML",
  "GN",
  "CF",
  "TD",
  "KM",
  "DJ",
  "MG",
  "BI",
  "RW",
  "HT",
]);

function isFrenchRequest(requestHeaders: Headers): boolean {
  const country = requestHeaders.get("x-vercel-ip-country");
  if (country) {
    return FRANCOPHONE_MAJOR_COUNTRIES.has(country.toUpperCase());
  }

  const acceptLanguage = requestHeaders.get("accept-language");
  if (!acceptLanguage) {
    return false;
  }

  return acceptLanguage
    .split(",")
    .map((token) => token.split(";")[0]?.trim().toLowerCase())
    .some((token) => token?.startsWith("fr"));
}

async function inferLocaleFromRequest(): Promise<Locale> {
  const requestHeaders = await headers();
  return isFrenchRequest(requestHeaders) ? "fr" : "en";
}

export async function getLocale(): Promise<Locale> {
  const consent = await getCookieConsent();
  const canUsePreferenceCookies = hasPreferencesConsent(consent);

  if (canUsePreferenceCookies) {
    const cookieStore = await cookies();
    const locale = cookieStore.get("locale")?.value;
    if (locale === "fr" || locale === "en") {
      return locale;
    }
  }

  return inferLocaleFromRequest();
}

export function getDictionary(locale: Locale) {
  return locale === "en" ? en : fr;
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
