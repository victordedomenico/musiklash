import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const LEGACY_DOMAIN = "musiklash.vercel.app";
export const CANONICAL_ORIGIN = "https://musiklash.fun";

const TICKET_VERSION = 1;
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const MAX_TRANSFER_AGE_MS = 5 * 60 * 1000;
const MAX_STORAGE_ENTRIES = 100;
const MAX_STORAGE_VALUE_BYTES = 256 * 1024;
const MAX_STORAGE_TOTAL_BYTES = 1024 * 1024;

export type DomainTransferPayload = {
  version: typeof TICKET_VERSION;
  expiresAt: number;
  redirectTo: string;
  guest: { id: string; username: string } | null;
  session: { accessToken: string; refreshToken: string } | null;
};

function encode(value: Buffer) {
  return value.toString("base64url");
}

function decode(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Jeton de transfert invalide.");
  return Buffer.from(value, "base64url");
}

function encryptionKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

function isSafeRedirect(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

function isValidPayload(value: unknown): value is DomainTransferPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<DomainTransferPayload>;
  const guest = payload.guest;
  const session = payload.session;

  return (
    payload.version === TICKET_VERSION &&
    typeof payload.expiresAt === "number" &&
    Number.isFinite(payload.expiresAt) &&
    isSafeRedirect(payload.redirectTo) &&
    (guest === null ||
      (typeof guest === "object" &&
        typeof guest.id === "string" &&
        typeof guest.username === "string")) &&
    (session === null ||
      (typeof session === "object" &&
        typeof session.accessToken === "string" &&
        typeof session.refreshToken === "string"))
  );
}

/** A server-only secret. DATABASE_URL is always present where Prisma can run. */
export function getDomainTransferSecret() {
  const secret = process.env.DOMAIN_TRANSFER_SECRET ?? process.env.DATABASE_URL;
  if (!secret) throw new Error("La cle de transfert de domaine est absente.");
  return secret;
}

export function createDomainTransferTicket(
  input: Omit<DomainTransferPayload, "version" | "expiresAt">,
  secret: string,
  now = Date.now(),
) {
  const payload: DomainTransferPayload = {
    ...input,
    version: TICKET_VERSION,
    expiresAt: now + MAX_TRANSFER_AGE_MS,
  };
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${encode(iv)}.${encode(tag)}.${encode(encrypted)}`;
}

export function readDomainTransferTicket(ticket: string, secret: string, now = Date.now()) {
  try {
    const parts = ticket.split(".");
    if (parts.length !== 3) return null;

    const [ivPart, tagPart, encryptedPart] = parts;
    const iv = decode(ivPart);
    const tag = decode(tagPart);
    const encrypted = decode(encryptedPart);
    if (iv.length !== IV_BYTES || tag.length !== AUTH_TAG_BYTES || encrypted.length === 0) return null;

    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const payload: unknown = JSON.parse(decrypted.toString("utf8"));
    if (!isValidPayload(payload) || payload.expiresAt < now) return null;
    return payload;
  } catch {
    return null;
  }
}

function isTransferableStorageKey(key: string) {
  return (
    key === "theme" ||
    key === "musiklash:preview-volume" ||
    key === "mk_intro_video_seen" ||
    key === "mk_pseudo_prompt_dismissed" ||
    key === "musiklash:multiplayer-rooms:v1" ||
    key.startsWith("musiklash:bracket-progress:v1:") ||
    key.startsWith("musiklash:game-progress:v1:")
  );
}

/** Browser storage is untrusted; retain only MusiKlash's bounded local state. */
export function sanitizeTransferredStorage(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const saved: Record<string, string> = {};
  let totalBytes = 0;
  for (const [key, item] of Object.entries(value)) {
    if (Object.keys(saved).length >= MAX_STORAGE_ENTRIES || !isTransferableStorageKey(key)) continue;
    if (typeof item !== "string") continue;

    const bytes = Buffer.byteLength(item, "utf8");
    if (bytes > MAX_STORAGE_VALUE_BYTES || totalBytes + bytes > MAX_STORAGE_TOTAL_BYTES) continue;
    saved[key] = item;
    totalBytes += bytes;
  }
  return saved;
}
