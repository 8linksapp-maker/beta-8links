export type ExtractedLink = { href: string; text: string };

/** Extracts <a href="...">text</a> from HTML or [text](url) from Markdown. */
export function extractLinks(content: string): ExtractedLink[] {
  const out: ExtractedLink[] = [];

  const htmlRe = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = htmlRe.exec(content)) !== null) {
    const href = m[1].trim();
    const text = m[2].replace(/<[^>]+>/g, "").trim();
    out.push({ href, text });
  }

  const mdRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  while ((m = mdRe.exec(content)) !== null) {
    out.push({ href: m[2].trim(), text: m[1].trim() });
  }

  return out;
}

/** Returns null for relative/invalid URLs (which are treated as internal). */
export function extractDomain(url: string): string | null {
  try {
    if (!/^https?:\/\//i.test(url)) return null;
    const u = new URL(url);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

/** True if both URLs point to the same canonical resource (ignoring scheme, www, trailing slash). */
export function sameUrl(a: string, b: string): boolean {
  return canonicalize(a) === canonicalize(b);
}

function canonicalize(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./i, "")}${u.pathname}`.toLowerCase().replace(/\/$/, "");
  } catch {
    return url.toLowerCase().replace(/\/$/, "");
  }
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string; offendingLinks?: string[] };

/**
 * Validates that the article content contains the authorized backlink and
 * has no unauthorized external links.
 *
 * Rules:
 *  - Content MUST contain at least one link to `targetUrl` (same canonical URL).
 *  - Any other link is OK ONLY if its domain matches:
 *    - the target_url's domain (other pages of the client site), OR
 *    - the publisher's domain (internal links of the network site), OR
 *    - is relative (no scheme).
 */
export function validateBacklinkContent(params: {
  content: string;
  targetUrl: string;
  publisherDomain: string;
}): ValidationResult {
  const { content, targetUrl, publisherDomain } = params;

  const targetDomain = extractDomain(targetUrl);
  if (!targetDomain) {
    return { ok: false, reason: `URL de destino inválida: ${targetUrl}` };
  }

  const links = extractLinks(content);

  const hasOriginal = links.some((l) => sameUrl(l.href, targetUrl));
  if (!hasOriginal) {
    return {
      ok: false,
      reason: `O link autorizado para ${targetUrl} foi removido do artigo. Restaure-o antes de publicar.`,
    };
  }

  const publisher = publisherDomain.replace(/^www\./i, "").toLowerCase();
  const offending: string[] = [];

  for (const link of links) {
    const linkDomain = extractDomain(link.href);
    if (!linkDomain) continue;
    if (linkDomain === targetDomain) continue;
    if (linkDomain === publisher) continue;
    offending.push(link.href);
  }

  if (offending.length > 0) {
    const unique = Array.from(new Set(offending));
    return {
      ok: false,
      reason: `Links externos não autorizados detectados (${unique.length}). Apenas links para ${targetDomain} são permitidos.`,
      offendingLinks: unique,
    };
  }

  return { ok: true };
}
