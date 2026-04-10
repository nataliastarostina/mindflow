export function getEditorHref(mapId: string): string {
  const params = new URLSearchParams({ mapId });
  return `/editor/?${params.toString()}`;
}
