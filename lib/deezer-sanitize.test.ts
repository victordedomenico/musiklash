import { describe, expect, it } from "vitest";
import { sanitizePreviewUrl } from "./deezer-sanitize";

describe("sanitizePreviewUrl", () => {
  it("accepts legacy Deezer CDN preview URLs", () => {
    const url = "https://cdns-preview-4.dzcdn.net/stream/c-4a9b8c7d6e5f.mp3";
    expect(sanitizePreviewUrl(url)).toBe(url);
  });

  it("accepts current Deezer CDN preview URLs (cdnt-preview/api)", () => {
    const url =
      "https://cdnt-preview.dzcdn.net/api/1/1/6/a/2/0/6a2c0a5670afe821e08fc5154909534a.mp3?hdnea=exp=1781275553~acl=/api/1/1/6/a/2/0/6a2c0a5670afe821e08fc5154909534a.mp3*~data=user_id=0,application_id=42~hmac=219a5f59";
    expect(sanitizePreviewUrl(url)).toBe(url);
  });

  it("normalizes http to https", () => {
    const url = "http://cdns-preview-0.dzcdn.net/stream/c-abc.mp3";
    expect(sanitizePreviewUrl(url)).toBe("https://cdns-preview-0.dzcdn.net/stream/c-abc.mp3");
  });

  it("rejects full-track or third-party URLs", () => {
    expect(sanitizePreviewUrl("https://evil.com/stream/track.mp3")).toBeNull();
    expect(sanitizePreviewUrl("https://e-cdns-proxy-1.dzcdn.net/mobile/1/abc")).toBeNull();
    expect(sanitizePreviewUrl("https://api.deezer.com/track/1")).toBeNull();
    expect(sanitizePreviewUrl("")).toBeNull();
    expect(sanitizePreviewUrl(null)).toBeNull();
  });
});
