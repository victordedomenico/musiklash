import "server-only";

import { getCurrentVertical } from "@klash/klash-config";

/** `source` column value for the active vertical (use in server actions on create). */
export function getItemSource(): string {
  return getCurrentVertical().source;
}
