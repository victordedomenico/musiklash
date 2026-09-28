import { describe, expect, it } from "vitest";
import {
  normalizeMusicText,
  pickOfficialYoutubeMatch,
  scoreYoutubeCandidate,
} from "./youtube";

describe("youtube official matching", () => {
  it("normalizes accents and punctuation", () => {
    expect(normalizeMusicText("A l'ammoniaque")).toBe("a l ammoniaque");
  });

  it("prefers the verified artist official upload", () => {
    const picked = pickOfficialYoutubeMatch(
      [
        {
          videoId: "fake1",
          title: "PNL - Ryuk",
          channelTitle: "Kenzi",
          verified: false,
          views: 1_500_000,
        },
        {
          videoId: "fake2",
          title: "PNL - Ryuk (remix)",
          channelTitle: "Miguel_Prod",
          verified: false,
          views: 2_000_000,
        },
        {
          videoId: "official",
          title: "Daft Punk - Get Lucky (Official Audio) ft. Pharrell Williams",
          channelTitle: "Daft Punk",
          verified: true,
          views: 800_000_000,
        },
      ],
      "Daft Punk",
      "Get Lucky",
    );
    expect(picked?.videoId).toBe("official");
  });

  it("rejects fan uploads when no official channel match exists", () => {
    const picked = pickOfficialYoutubeMatch(
      [
        {
          videoId: "fake1",
          title: "PNL - Ryuk",
          channelTitle: "Kenzi",
          verified: false,
          views: 1_500_000,
        },
        {
          videoId: "fake2",
          title: "PNL - Ryuk (remix)",
          channelTitle: "Miguel_Prod",
          verified: false,
          views: 2_000_000,
        },
        {
          videoId: "fake3",
          title: "PNL - Ryuk (Slowed & Reverb)",
          channelTitle: "Slow & Reverbs 105",
          verified: false,
          views: 20_000,
        },
      ],
      "PNL",
      "Ryuk",
    );
    expect(picked).toBeNull();
  });

  it("accepts Topic / VEVO artist channels", () => {
    expect(
      scoreYoutubeCandidate(
        {
          title: "Ryuk",
          channelTitle: "PNL - Topic",
          verified: false,
          views: 10,
        },
        "PNL",
        "Ryuk",
      ),
    ).toBeGreaterThanOrEqual(100);

    expect(
      scoreYoutubeCandidate(
        {
          title: "Get Lucky (Official Video)",
          channelTitle: "DaftPunkVEVO",
          verified: true,
          views: 10,
        },
        "Daft Punk",
        "Get Lucky",
      ),
    ).toBeGreaterThanOrEqual(100);
  });
});
