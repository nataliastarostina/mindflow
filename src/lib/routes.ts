export function getEditorHref(mapId: string): string {
  const params = new URLSearchParams({ mapId });
  return `/editor/?${params.toString()}`;
}

export function getSharedHref(slug: string): string {
  const params = new URLSearchParams({ s: slug });
  return `/editor/?${params.toString()}`;
}

export function buildShareUrl(slug: string): string {
  if (typeof window === 'undefined') return '';
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
  // Short link: https://<host><basePath>/?s=<slug> — root forwards to editor.
  return `${window.location.origin}${basePath}/?s=${encodeURIComponent(slug)}`;
}
