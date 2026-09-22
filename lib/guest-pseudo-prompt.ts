const DISMISSED_STORAGE_KEY = "mk_pseudo_prompt_dismissed";

const GAME_ROUTE_PREFIXES = [
  "/bracket-game",
  "/tierlist",
  "/blindtest",
  "/battle-feat",
  "/smash-pass",
  "/stream-clash",
  "/lucky-wheel",
  "/create-bracket",
  "/create-tierlist",
  "/create-blindtest",
  "/create-blindtest-eclair",
  "/create-battlefeat",
  "/create-smash-pass",
  "/create-stream-clash",
];

export function isGameRoute(pathname: string): boolean {
  return GAME_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function hasDismissedPseudoPrompt(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(DISMISSED_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markPseudoPromptDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, "1");
  } catch {
    // localStorage unavailable — skip persistence
  }
}
