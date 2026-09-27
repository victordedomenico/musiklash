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
    expect(await result.text()).toContain('window.location.replace("/my-library")');
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
