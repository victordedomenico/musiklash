import { NextResponse, type NextRequest } from "next/server";

const LEGACY_DOMAIN = "musiklash.vercel.app";
const TRANSFER_PATH = "/api/domain-transfer";

/**
 * The old Vercel alias cannot share cookies or localStorage with musiklash.fun.
 * Send navigations through a same-origin handoff before making the canonical redirect.
 */
export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? request.nextUrl.host).toLowerCase();
  const isNavigation = request.method === "GET" || request.method === "HEAD";

  if (host === LEGACY_DOMAIN && isNavigation && request.nextUrl.pathname !== TRANSFER_PATH) {
    const transferUrl = new URL(TRANSFER_PATH, request.url);
    transferUrl.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(transferUrl, 307);
  }

  return NextResponse.next();
}
