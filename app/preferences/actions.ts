"use server";

import { cookies } from "next/headers";
import { getCookieConsent, hasPreferencesConsent, setCookieConsent } from "@/lib/cookie-consent";

export async function setLocale(locale: "fr" | "en") {
  const consent = await getCookieConsent();
  if (!hasPreferencesConsent(consent)) {
    return { persisted: false };
  }
  const cookieStore = await cookies();
  cookieStore.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return { persisted: true };
}

export async function setTheme(theme: "dark" | "light") {
  const consent = await getCookieConsent();
  if (!hasPreferencesConsent(consent)) {
    return { persisted: false };
  }
  const cookieStore = await cookies();
  cookieStore.set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return { persisted: true };
}

export async function saveCookieConsent(input: {
  preferences: boolean;
  analytics: boolean;
}) {
  const consent = await setCookieConsent({
    preferences: Boolean(input.preferences),
    analytics: Boolean(input.analytics),
  });
  if (!consent.preferences) {
    const cookieStore = await cookies();
    cookieStore.delete("theme");
    cookieStore.delete("locale");
  }
  return { ok: true, consent };
}

export async function getCurrentCookieConsent() {
  const consent = await getCookieConsent();
  return {
    essential: true,
    preferences: Boolean(consent?.preferences),
    analytics: Boolean(consent?.analytics),
    updatedAt: consent?.updatedAt ?? null,
  };
}
