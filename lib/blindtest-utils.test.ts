import { describe, it, expect } from "vitest";
import {
  speedFactor,
  scoreAnswer,
  maxTrackPoints,
  POINTS_TITLE_MAX,
  POINTS_ARTIST_MAX,
  POINTS_PER_TRACK_MAX,
  TIMER_SECONDS,
} from "./blindtest-utils";

describe("speedFactor", () => {
  it("is 1 for an instant answer", () => {
    expect(speedFactor(0)).toBe(1);
  });

  it("is the floor (0.5) at the buzzer", () => {
    expect(speedFactor(TIMER_SECONDS * 1000)).toBeCloseTo(0.5);
  });

  it("clamps answers past the timer to the floor", () => {
    expect(speedFactor(TIMER_SECONDS * 2000)).toBeCloseTo(0.5);
  });

  it("decreases monotonically with elapsed time", () => {
    const early = speedFactor(5_000);
    const late = speedFactor(20_000);
    expect(early).toBeGreaterThan(late);
  });
});

describe("scoreAnswer", () => {
  it("awards full points for an instant correct title + artist", () => {
    const { points, titlePoints, artistPoints } = scoreAnswer(true, true, 0);
    expect(titlePoints).toBe(POINTS_TITLE_MAX);
    expect(artistPoints).toBe(POINTS_ARTIST_MAX);
    expect(points).toBe(POINTS_TITLE_MAX + POINTS_ARTIST_MAX);
  });

  it("awards 0 for a wrong answer", () => {
    expect(scoreAnswer(false, false, 0)).toEqual({
      points: 0,
      titlePoints: 0,
      artistPoints: 0,
    });
  });

  it("scores only the correct field", () => {
    const { titlePoints, artistPoints } = scoreAnswer(true, false, 0);
    expect(titlePoints).toBe(POINTS_TITLE_MAX);
    expect(artistPoints).toBe(0);
  });

  it("gives half points for a correct answer at the buzzer", () => {
    const { points } = scoreAnswer(true, true, TIMER_SECONDS * 1000);
    expect(points).toBe(Math.round((POINTS_TITLE_MAX + POINTS_ARTIST_MAX) * 0.5));
  });

  it("rewards a faster correct answer with more points", () => {
    const fast = scoreAnswer(true, false, 2_000).points;
    const slow = scoreAnswer(true, false, 25_000).points;
    expect(fast).toBeGreaterThan(slow);
  });
});

describe("maxTrackPoints", () => {
  it("counts title + artist in multi-artist mode", () => {
    expect(maxTrackPoints(false)).toBe(POINTS_PER_TRACK_MAX);
    expect(maxTrackPoints(false)).toBe(POINTS_TITLE_MAX + POINTS_ARTIST_MAX);
  });

  it("counts only the title in single-artist mode", () => {
    expect(maxTrackPoints(true)).toBe(POINTS_TITLE_MAX);
  });
});
