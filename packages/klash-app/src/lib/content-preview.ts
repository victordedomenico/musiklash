/** Refresh a signed or expiring item preview URL via the generic content API. */
export async function fetchContentItemPreview(externalId: string | number): Promise<string> {
  const res = await fetch(`/api/content/item/${externalId}/preview`);
  if (!res.ok) return "";
  const data = (await res.json()) as { preview?: string };
  return data.preview ?? "";
}
