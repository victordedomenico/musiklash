export type Locale = "fr" | "en";

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

export function isFrenchRequest(requestHeaders: Headers): boolean {
  const country = requestHeaders.get("x-vercel-ip-country");
  if (country) {
    return FRANCOPHONE_MAJOR_COUNTRIES.has(country.toUpperCase());
  }

  const acceptLanguage = requestHeaders.get("accept-language");
  if (!acceptLanguage) return false;

  return acceptLanguage
    .split(",")
    .map((token) => token.split(";")[0]?.trim().toLowerCase())
    .some((token) => token?.startsWith("fr"));
}

export function inferLocaleFromHeaders(requestHeaders: Headers): Locale {
  return isFrenchRequest(requestHeaders) ? "fr" : "en";
}

export function resolveLocale(params: {
  canUsePreferenceCookies: boolean;
  cookieLocale?: string;
  requestHeaders: Headers;
}): Locale {
  const { canUsePreferenceCookies, cookieLocale, requestHeaders } = params;

  if (canUsePreferenceCookies && (cookieLocale === "fr" || cookieLocale === "en")) {
    return cookieLocale;
  }

  return inferLocaleFromHeaders(requestHeaders);
}
