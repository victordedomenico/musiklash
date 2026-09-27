import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

describe("legacy domain proxy", () => {
  it("sends legacy navigations through the same-origin transfer route", () => {
    const response = proxy(
      new NextRequest("https://musiklash.vercel.app/bracket-game/room/room-123?resume=1"),
    );

    expect(response.headers.get("location")).toBe(
      "https://musiklash.vercel.app/api/domain-transfer?redirect=%2Fbracket-game%2Froom%2Froom-123%3Fresume%3D1",
    );
  });

  it("does not redirect the canonical domain or the handoff endpoint", () => {
    expect(proxy(new NextRequest("https://musiklash.fun/explore")).headers.get("location")).toBeNull();
    expect(
      proxy(new NextRequest("https://musiklash.vercel.app/api/domain-transfer")).headers.get("location"),
    ).toBeNull();
  });
});
