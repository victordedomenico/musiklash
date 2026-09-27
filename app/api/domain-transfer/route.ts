import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGuestIdentityFromCookies } from "@/lib/guest";
import { DOMAIN_TRANSFER_COMPLETE_COOKIE } from "@/lib/domain-transfer-config";
import {
  CANONICAL_ORIGIN,
  LEGACY_DOMAIN,
  createDomainTransferTicket,
  getDomainTransferSecret,
  readDomainTransferTicket,
  sanitizeTransferredStorage,
} from "@/lib/domain-transfer";

const LEGACY_ORIGIN = `https://${LEGACY_DOMAIN}`;

function isLegacyRequest(request: NextRequest) {
  return (request.headers.get("host") ?? request.nextUrl.host).toLowerCase() === LEGACY_DOMAIN;
}

function safeRedirect(value: string | null) {
  if (!value) return "/";
  try {
    const target = new URL(value, CANONICAL_ORIGIN);
    return target.origin === CANONICAL_ORIGIN ? `${target.pathname}${target.search}` : "/";
  } catch {
    return "/";
  }
}

function escapeHtmlAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/\"/g, "&quot;").replace(/</g, "&lt;");
}

function htmlResponse(html: string, status = 200) {
  return new NextResponse(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      // Form POSTs use no-cors mode: no-referrer also turns Origin into "null",
      // which the receiving endpoint correctly refuses. Send only the origin.
      "referrer-policy": "strict-origin",
    },
  });
}

function transferForm(ticket: string) {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>MusiKlash</title></head>
<body>
<form hidden id="transfer" method="post" action="${CANONICAL_ORIGIN}/api/domain-transfer">
  <input type="hidden" name="ticket" value="${ticket}">
  <input id="storage" type="hidden" name="storage" value="{}">
</form>
<script>
(() => {
  const allowed = (key) => key === "theme" || key === "musiklash:preview-volume" ||
    key === "mk_intro_video_seen" || key === "mk_pseudo_prompt_dismissed" ||
    key === "musiklash:multiplayer-rooms:v1" || key.startsWith("musiklash:bracket-progress:v1:") ||
    key.startsWith("musiklash:game-progress:v1:");
  const values = {};
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length && Object.keys(values).length < 100; i += 1) {
      const key = localStorage.key(i);
      if (!key || !allowed(key)) continue;
      const value = localStorage.getItem(key);
      const bytes = value === null ? 0 : new TextEncoder().encode(value).byteLength;
      if (value === null || bytes > 262144 || total + bytes > 1048576) continue;
      values[key] = value;
      total += bytes;
    }
  } catch (_) {}
  document.getElementById("storage").value = JSON.stringify(values);
  document.getElementById("transfer").submit();
})();
</script>
<noscript><p>Active JavaScript puis recharge cette page pour reprendre aussi les parties solo en cours.</p></noscript>
</body></html>`;
}

function restorePage(storage: Record<string, string>, redirectTo: string, receipt: string) {
  const serializedStorage = JSON.stringify(storage).replace(/</g, "\\u003c");
  const serializedRedirect = JSON.stringify(redirectTo).replace(/</g, "\\u003c");
  const completionUrl = new URL("/api/domain-transfer", LEGACY_ORIGIN);
  completionUrl.searchParams.set("complete", receipt);
  const serializedCompletion = JSON.stringify(completionUrl.toString());
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>MusiKlash</title></head>
<body>
<script>
let restored = false;
try {
  for (const [key, value] of Object.entries(${serializedStorage})) {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
  }
  restored = true;
} catch (_) {}
window.location.replace(restored ? ${serializedCompletion} : ${serializedRedirect});
</script>
<noscript><a href="${escapeHtmlAttribute(redirectTo)}">Continuer vers MusiKlash</a></noscript>
</body></html>`;
}

export async function GET(request: NextRequest) {
  if (!isLegacyRequest(request)) return NextResponse.redirect(new URL("/", CANONICAL_ORIGIN), 308);

  const completion = request.nextUrl.searchParams.get("complete");
  if (completion) {
    const receipt = readDomainTransferTicket(completion, getDomainTransferSecret());
    if (!receipt || receipt.purpose !== "complete") return new NextResponse(null, { status: 400 });
    const response = NextResponse.redirect(
      new URL(safeRedirect(receipt.redirectTo), CANONICAL_ORIGIN),
      303,
    );
    response.headers.set("cache-control", "private, no-store");
    response.cookies.set(DOMAIN_TRANSFER_COMPLETE_COOKIE, "1", {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  const redirectTo = safeRedirect(request.nextUrl.searchParams.get("redirect"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const session = user ? (await supabase.auth.getSession()).data.session : null;
  const guest = await getGuestIdentityFromCookies();

  if (!session && !guest) {
    return NextResponse.redirect(new URL(redirectTo, CANONICAL_ORIGIN), 308);
  }

  const ticket = createDomainTransferTicket(
    {
      redirectTo,
      guest: guest ? { id: guest.id, username: guest.username } : null,
      session:
        session && user && session.user.id === user.id
          ? { accessToken: session.access_token, refreshToken: session.refresh_token }
          : null,
    },
    getDomainTransferSecret(),
  );
  return htmlResponse(transferForm(ticket));
}

export async function POST(request: NextRequest) {
  if (isLegacyRequest(request)) return new NextResponse(null, { status: 405 });
  if (request.nextUrl.origin !== CANONICAL_ORIGIN) return new NextResponse(null, { status: 404 });

  const origin = request.headers.get("origin");
  if (origin && origin !== LEGACY_ORIGIN) return new NextResponse(null, { status: 403 });

  const form = await request.formData();
  const ticket = form.get("ticket");
  if (typeof ticket !== "string") return new NextResponse(null, { status: 400 });

  const payload = readDomainTransferTicket(ticket, getDomainTransferSecret());
  if (!payload || payload.purpose === "complete") return new NextResponse(null, { status: 400 });

  if (payload.session) {
    const supabase = await createClient();
    const { error } = await supabase.auth.setSession({
      access_token: payload.session.accessToken,
      refresh_token: payload.session.refreshToken,
    });
    if (error) return new NextResponse("La session n'a pas pu être transférée.", { status: 401 });
  }

  let rawStorage: unknown = {};
  const storageField = form.get("storage");
  if (typeof storageField === "string") {
    try {
      rawStorage = JSON.parse(storageField);
    } catch {
      // Invalid local browser state must not prevent the identity transfer.
    }
  }
  const storage = sanitizeTransferredStorage(rawStorage);
  // A separate receipt contains no session credentials. Only the successful
  // destination page acknowledges completion, after restoring local storage.
  const receipt = createDomainTransferTicket(
    { purpose: "complete", redirectTo: payload.redirectTo, guest: null, session: null },
    getDomainTransferSecret(),
  );
  const response = htmlResponse(restorePage(storage, payload.redirectTo, receipt));
  if (payload.guest) {
    response.cookies.set("mk_guest_id", payload.guest.id, {
      path: "/",
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
    });
    response.cookies.set("mk_guest_username", payload.guest.username, {
      path: "/",
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
