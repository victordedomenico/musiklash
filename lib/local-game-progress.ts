const PROGRESS_VERSION = 1;
const STORAGE_PREFIX = "musiklash:game-progress";

export function gameProgressKey(game: string, id: string) {
  return `${STORAGE_PREFIX}:v${PROGRESS_VERSION}:${game}:${id}`;
}

export function readGameProgress<T>(
  storage: Pick<Storage, "getItem">,
  game: string,
  id: string,
  signature: string,
  isValid: (value: unknown) => value is T,
): T | null {
  try {
    const raw = storage.getItem(gameProgressKey(game, id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      version?: unknown;
      signature?: unknown;
      data?: unknown;
    };
    if (parsed.version !== PROGRESS_VERSION || parsed.signature !== signature) return null;
    return isValid(parsed.data) ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeGameProgress<T>(
  storage: Pick<Storage, "setItem">,
  game: string,
  id: string,
  signature: string,
  data: T,
) {
  storage.setItem(
    gameProgressKey(game, id),
    JSON.stringify({ version: PROGRESS_VERSION, signature, data }),
  );
}

export function clearGameProgress(storage: Pick<Storage, "removeItem">, game: string, id: string) {
  storage.removeItem(gameProgressKey(game, id));
}
