/** Append a query param to a path that may already include search params. */
export function withSearchQuery(base: string, q: string): string {
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}q=${encodeURIComponent(q)}`;
}
