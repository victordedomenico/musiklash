import { NextRequest, NextResponse } from "next/server";
import { resolvePlayerIdentity } from "@/lib/guest";

function isSafeRedirect(path: string | null): path is string {
  if (!path) return false;
  return path.startsWith("/") && !path.startsWith("//");
}

export async function GET(request: NextRequest) {
  const redirectParam = request.nextUrl.searchParams.get("redirect");
  const redirectTo = isSafeRedirect(redirectParam) ? redirectParam : "/";

  try {
    await resolvePlayerIdentity();
  } catch {
    // If guest session cannot be created, send the user to login instead.
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
