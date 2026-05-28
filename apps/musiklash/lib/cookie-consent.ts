import "server-only";

import { cookies } from "next/headers";

export const COOKIE_CONSENT_KEY = "mk_cookie_consent";
export const COOKIE_CONSENT_VERSION = "2026-04";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export type CookieConsent = {
  essential: true;
  preferences: boolean;
  analytics: boolean;
  version: string;
  updatedAt: string;
};

export const COOKIE_CONSENT_DEFAULT: CookieConsent = {
  essential: true,
  preferences: false,
  analytics: false,
  version: COOKIE_CONSENT_VERSION,
  updatedAt: new Date(0).toISOString(),
};

function normalizeConsent(value: unknown): CookieConsent | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<CookieConsent>;
  if (typeof raw.preferences !== "boolean" || typeof raw.analytics !== "boolean") {
    return null;
  }

  return {
    essential: true,
    preferences: raw.preferences,
    analytics: raw.analytics,
    version:
      typeof raw.version === "string" && raw.version.length > 0
        ? raw.version
        : COOKIE_CONSENT_VERSION,
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt.length > 0
        ? raw.updatedAt
        : new Date().toISOString(),
  };
}

export function serializeCookieConsent(consent: CookieConsent): string {
  return JSON.stringify(consent);
}

export function parseCookieConsent(raw: string | undefined): CookieConsent | null {
  if (!raw) return null;
  try {
    return normalizeConsent(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function getCookieConsent(): Promise<CookieConsent | null> {
  const cookieStore = await cookies();
  return parseCookieConsent(cookieStore.get(COOKIE_CONSENT_KEY)?.value);
}

export function hasPreferencesConsent(consent: CookieConsent | null): boolean {
  return Boolean(consent?.preferences);
}

export function hasAnalyticsConsent(consent: CookieConsent | null): boolean {
  return Boolean(consent?.analytics);
}

export async function setCookieConsent(
  consent: Omit<CookieConsent, "essential" | "updatedAt" | "version">,
) {
  const cookieStore = await cookies();
  const normalized: CookieConsent = {
    essential: true,
    preferences: Boolean(consent.preferences),
    analytics: Boolean(consent.analytics),
    version: COOKIE_CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
  };
  cookieStore.set(COOKIE_CONSENT_KEY, serializeCookieConsent(normalized), {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
  });
  return normalized;
}
