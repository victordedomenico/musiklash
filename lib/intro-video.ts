export const INTRO_VIDEO_STORAGE_KEY = "mk_intro_video_seen";
export const INTRO_VIDEO_SRC = "/promo/musiklash-promo.mp4";

export function hasSeenIntroVideo(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(INTRO_VIDEO_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markIntroVideoSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INTRO_VIDEO_STORAGE_KEY, "1");
  } catch {
    // localStorage unavailable — skip persistence
  }
}
