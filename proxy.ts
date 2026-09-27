import { NextResponse, type NextRequest } from "next/server";

import {
  LEGACY_DOMAIN,
  CANONICAL_ORIGIN,
  DOMAIN_TRANSFER_COMPLETE_COOKIE,
} from "./lib/domain-transfer-config";
const TRANSFER_PATH = "/api/domain-transfer";

/**
 * The old Vercel alias cannot share cookies or localStorage with musiklash.fun.
 * Send navigations through a same-origin handoff before making the canonical redirect.
 */
export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? request.nextUrl.host).toLowerCase();
  const isNavigation = request.method === "GET" || request.method === "HEAD";

  if (host === LEGACY_DOMAIN && isNavigation && request.nextUrl.pathname !== TRANSFER_PATH) {
    if (request.cookies.get(DOMAIN_TRANSFER_COMPLETE_COOKIE)?.value === "1") {
      const destination = new URL(CANONICAL_ORIGIN);
      destination.pathname = request.nextUrl.pathname;
      destination.search = request.nextUrl.search;
      const response = NextResponse.redirect(destination, 307);
      response.headers.set("cache-control", "private, no-store");
      return response;
    }
    const transferUrl = new URL(TRANSFER_PATH, request.url);
    transferUrl.searchParams.set(
      "redirect",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(transferUrl, 307);
  }

  return NextResponse.next();
}
