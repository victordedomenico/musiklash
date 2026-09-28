import { describe, expect, it } from "vitest";
import { youtubeEmbedUrl, youtubeMusicWatchUrl } from "./youtube-embed";

describe("youtubeEmbedUrl", () => {
  it("builds a youtube.com embed URL", () => {
    const url = youtubeEmbedUrl("dQw4w9WgXcQ");
    expect(url).toContain("https://www.youtube.com/embed/dQw4w9WgXcQ?");
    expect(url).toContain("rel=0");
    expect(url).toContain("enablejsapi=1");
    expect(url).not.toContain("autoplay=1");
  });

  it("adds autoplay when requested", () => {
    const url = youtubeEmbedUrl("dQw4w9WgXcQ", { autoplay: true });
    expect(url).toContain("autoplay=1");
  });

  it("adds origin when requested", () => {
    const url = youtubeEmbedUrl("dQw4w9WgXcQ", { origin: "http://localhost:3000" });
    expect(url).toContain("origin=http%3A%2F%2Flocalhost%3A3000");
  });
});

describe("youtubeMusicWatchUrl", () => {
  it("uses music.youtube.com", () => {
    expect(youtubeMusicWatchUrl("5ilumXn0rPc")).toBe(
      "https://music.youtube.com/watch?v=5ilumXn0rPc",
    );
  });
});
