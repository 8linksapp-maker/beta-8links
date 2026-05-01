/**
 * Normalize a URL by collapsing repeated slashes in the path while preserving
 * the protocol (https://). Handles common user mistakes like trailing/leading
 * slashes when domains and paths are concatenated.
 *
 *   normalizeUrl("https://site.com.br//")          → "https://site.com.br/"
 *   normalizeUrl("https://site.com.br//categoria") → "https://site.com.br/categoria"
 *   normalizeUrl("  https://site.com.br/page  ")   → "https://site.com.br/page"
 */
export function normalizeUrl(input: string): string {
  if (!input) return input;
  const trimmed = input.trim();
  return trimmed.replace(/(https?:\/\/)|\/+/g, (match, protocol) => protocol ?? "/");
}

/**
 * Join a base URL with a path, collapsing the slashes in between.
 *
 *   joinUrl("https://site.com/", "/categoria")  → "https://site.com/categoria"
 *   joinUrl("https://site.com",  "categoria")   → "https://site.com/categoria"
 *   joinUrl("https://site.com/", "https://...") → "https://..." (passthrough for absolute)
 */
export function joinUrl(base: string, path: string): string {
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return normalizeUrl(path);
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  return `${cleanBase}/${cleanPath}`;
}
