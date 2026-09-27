import { describe, expect, it } from "vitest";
import {
  createDomainTransferTicket,
  readDomainTransferTicket,
  sanitizeTransferredStorage,
} from "./domain-transfer";

const secret = "a test-only secret";

describe("domain transfer ticket", () => {
  it("keeps the session, guest identity, and original path confidential in transit", () => {
    const ticket = createDomainTransferTicket(
      {
        redirectTo: "/bracket-game/room/room-123?resume=1",
        guest: { id: "guest-123", username: "Victor" },
        session: { accessToken: "access", refreshToken: "refresh" },
      },
      secret,
      100,
    );

    expect(ticket).not.toContain("access");
    expect(readDomainTransferTicket(ticket, secret, 101)).toMatchObject({
      redirectTo: "/bracket-game/room/room-123?resume=1",
      guest: { id: "guest-123", username: "Victor" },
      session: { accessToken: "access", refreshToken: "refresh" },
    });
  });

  it("fails closed for a changed or expired ticket", () => {
    const ticket = createDomainTransferTicket(
      { redirectTo: "/", guest: null, session: null },
      secret,
      100,
    );

    expect(readDomainTransferTicket(`${ticket}x`, secret, 101)).toBeNull();
    expect(readDomainTransferTicket(ticket, secret, 100 + 5 * 60 * 1000 + 1)).toBeNull();
  });
});

describe("transferred local state", () => {
  it("keeps resumable games and excludes foreign or oversized browser values", () => {
    const storage = sanitizeTransferredStorage({
      "musiklash:bracket-progress:v1:bracket-123": "saved bracket",
      "musiklash:game-progress:v1:blindtest:blindtest-123": "saved blindtest",
      "musiklash:multiplayer-rooms:v1": "saved rooms",
      theme: "dark",
      foreign: "do not transfer",
      "musiklash:game-progress:v1:too-big": "x".repeat(256 * 1024 + 1),
    });

    expect(storage).toEqual({
      "musiklash:bracket-progress:v1:bracket-123": "saved bracket",
      "musiklash:game-progress:v1:blindtest:blindtest-123": "saved blindtest",
      "musiklash:multiplayer-rooms:v1": "saved rooms",
      theme: "dark",
    });
  });
});
