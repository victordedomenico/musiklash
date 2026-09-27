import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}));
vi.mock("@/lib/guest", () => ({
  getGuestIdentityFromCookies: async () => ({
    id: "eae05286-8ab3-4933-893d-6ef3a0ad6546",
    username: "TransferTest",
  }),
}));
vi.mock("@/lib/domain-transfer", async () => import("../../../lib/domain-transfer"));
vi.mock("@/lib/domain-transfer-config", async () => import("../../../lib/domain-transfer-config"));

import { GET, POST } from "./route";

afterEach(() => vi.unstubAllEnvs());

describe("cross-domain transfer form", () => {
  async function transferPage() {
    vi.stubEnv("DOMAIN_TRANSFER_SECRET", "test-only-transfer-secret");
    return GET(
      new NextRequest("https://musiklash.vercel.app/api/domain-transfer?redirect=/my-library"),
    );
  }

  it("preserves the browser POST origin and accepts the signed guest handoff", async () => {
    const response = await transferPage();
    expect(response.headers.get("referrer-policy")).toBe("strict-origin");
    expect(response.headers.get("cache-control")).toContain("no-store");
    const html = await response.text();
    const ticket = html.match(/name="ticket" value="([^"]+)"/)?.[1];
    expect(ticket).toBeTruthy();
    const body = new URLSearchParams({
      ticket: ticket!,
      storage: JSON.stringify({ theme: "dark" }),
    });
    const result = await POST(
      new NextRequest("https://musiklash.fun/api/domain-transfer", {
        method: "POST",
        headers: { origin: "https://musiklash.vercel.app" },
        body,
      }),
    );
    expect(result.status).toBe(200);
    expect(result.cookies.get("mk_guest_id")?.value).toBe("eae05286-8ab3-4933-893d-6ef3a0ad6546");
    const restoredHtml = await result.text();
    expect(restoredHtml).not.toContain("Transfert terminé");
    const completionUrl = restoredHtml.match(
      /https:\/\/musiklash.vercel.app\/api\/domain-transfer\?complete=[^"\s]+/,
    )?.[0];
    expect(completionUrl).toBeTruthy();
    const complete = await GET(new NextRequest(completionUrl!));
    expect(complete.status).toBe(303);
    expect(complete.headers.get("location")).toBe("https://musiklash.fun/my-library");
    expect(complete.cookies.get("mk_domain_transfer_complete")?.value).toBe("1");
    expect(result.cookies.get("mk_domain_transfer_complete")).toBeUndefined();

    // A completion receipt must never be accepted as an authentication ticket.
    const replay = await POST(
      new NextRequest("https://musiklash.fun/api/domain-transfer", {
        method: "POST",
        headers: { origin: "https://musiklash.vercel.app" },
        body: new URLSearchParams({
          ticket: new URL(completionUrl!).searchParams.get("complete")!,
        }),
      }),
    );
    expect(replay.status).toBe(400);
  });

  it("does not mark a failed or unacknowledged transfer as complete", async () => {
    await transferPage();
    const invalid = await GET(
      new NextRequest("https://musiklash.vercel.app/api/domain-transfer?complete=invalid"),
    );
    expect(invalid.status).toBe(400);
    expect(invalid.cookies.get("mk_domain_transfer_complete")).toBeUndefined();
  });

  it.each(["null", "https://untrusted.example"])("still rejects origin %s", async (origin) => {
    const result = await POST(
      new NextRequest("https://musiklash.fun/api/domain-transfer", {
        method: "POST",
        headers: { origin },
        body: "ticket=invalid",
      }),
    );
    expect(result.status).toBe(403);
  });
});
