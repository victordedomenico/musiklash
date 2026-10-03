import { describe, expect, it } from "vitest";
import {
  normalizeMusicText,
  pickOfficialYoutubeMatch,
  scoreYoutubeCandidate,
} from "./youtube";
import { titleContainsTrack, titleMatchRatio, titleSearchVariants } from "./youtube-match";

describe("youtube official matching", () => {
  it("normalizes accents and punctuation", () => {
    expect(normalizeMusicText("A l'ammoniaque")).toBe("a l ammoniaque");
  });

  it("builds Booska freestyle title variants", () => {
    expect(titleSearchVariants("Booska tenue 2 motard 3")).toEqual(
      expect.arrayContaining(["Booska tenue 2 motard 3", "tenue 2 motard 3", "tenue de motard 3"]),
    );
  });

  it("matches official Tenue De Motard 3 despite Deezer Booska naming", () => {
    expect(
      titleMatchRatio("Djadja & Dinaz - Tenue De Motard 3", "Booska tenue 2 motard 3"),
    ).toBeGreaterThanOrEqual(0.75);
  });

  it("rejects Pacha Mama / Maa Vue for short Maes titles", () => {
    expect(titleContainsTrack("Pacha Mama", "Mama", "Maes")).toBe(false);
    expect(titleContainsTrack("Maa Vue- Kuv Niam", "Vue", "Maes")).toBe(false);
    expect(titleContainsTrack("Maes - Mama (Clip Officiel)", "Mama", "Maes")).toBe(true);
    expect(titleContainsTrack("Maes - Vue", "Vue", "Maes")).toBe(true);

    expect(
      scoreYoutubeCandidate(
        {
          title: "Pacha Mama",
          channelTitle: "Maes - Topic",
          verified: false,
          views: 1_000_000,
        },
        "Maes",
        "Mama",
      ),
    ).toBe(-Infinity);

    expect(
      scoreYoutubeCandidate(
        {
          title: "Maes - Mama (Clip Officiel)",
          channelTitle: "Maes officiel",
          verified: true,
          views: 10_000_000,
        },
        "Maes",
        "Mama",
      ),
    ).toBeGreaterThanOrEqual(100);
  });

  it("rejects Tenue de motard 2 when Deezer asks for episode 3", () => {
    expect(
      scoreYoutubeCandidate(
        {
          title: "Djadja & Dinaz - Tenue de motard 2 [Audio Officiel]",
          channelTitle: "Djadja & Dinaz",
          verified: true,
          views: 1_000_000,
        },
        "Djadja & Dinaz",
        "Booska tenue 2 motard 3",
      ),
    ).toBe(-Infinity);
  });

  it("rejects unverified artist-named uploads", () => {
    expect(
      scoreYoutubeCandidate(
        {
          title: "Djadja et dinaz- freestyle booska tenue de motard 3",
          channelTitle: "djadja & dinaz",
          verified: false,
          views: 967,
        },
        "Djadja & Dinaz",
        "Booska tenue 2 motard 3",
      ),
    ).toBeLessThan(100);
  });

  it("prefers the verified artist upload over Booska-P when both qualify", () => {
    const picked = pickOfficialYoutubeMatch(
      [
        {
          videoId: "m0yA7CV1uVE",
          title: "Djadja et dinaz- freestyle booska tenue de motard 3",
          channelTitle: "djadja & dinaz",
          verified: false,
          views: 967,
        },
        {
          videoId: "dzM70Nt22js",
          title: "Djadja et Dinaz - Freestyle Booska Tenue de Motard 3",
          channelTitle: "Booska-P",
          verified: true,
          views: 6_134_419,
        },
        {
          videoId: "_WNBH6h5zeU",
          title: "Djadja & Dinaz - Tenue De Motard 3",
          channelTitle: "Djadja & Dinaz",
          verified: true,
          views: 1_531_757,
        },
      ],
      "Djadja & Dinaz",
      "Booska tenue 2 motard 3",
    );
    expect(picked?.videoId).toBe("_WNBH6h5zeU");
  });

  it("accepts verified Booska-P when the artist upload is missing", () => {
    const picked = pickOfficialYoutubeMatch(
      [
        {
          videoId: "m0yA7CV1uVE",
          title: "Djadja et dinaz- freestyle booska tenue de motard 3",
          channelTitle: "djadja & dinaz",
          verified: false,
          views: 967,
        },
        {
          videoId: "dzM70Nt22js",
          title: "Djadja et Dinaz - Freestyle Booska Tenue de Motard 3",
          channelTitle: "Booska-P",
          verified: true,
          views: 6_134_419,
        },
      ],
      "Djadja & Dinaz",
      "Booska tenue 2 motard 3",
    );
    expect(picked?.videoId).toBe("dzM70Nt22js");
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
