import type { AnchorType } from "./types";

export type AnchorPlan = {
  text: string;
  type: AnchorType;
};

const PARTIAL_TEMPLATES: ((k: string) => string)[] = [
  (k) => `guia de ${k}`,
  (k) => `${k} para iniciantes`,
  (k) => `como ${k} funciona`,
  (k) => `melhor ${k}`,
  (k) => `tudo sobre ${k}`,
  (k) => `${k} na prática`,
  (k) => `dicas de ${k}`,
  (k) => `o que é ${k}`,
];

const GENERIC_OPTIONS = [
  "clique aqui",
  "saiba mais",
  "veja aqui",
  "leia mais",
  "neste link",
  "confira",
  "acesse o site",
];

function brandFromUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, "");
    const root = host.split(".")[0] || host;
    return root.charAt(0).toUpperCase() + root.slice(1);
  } catch {
    return "site";
  }
}

function nakedUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

/**
 * Plan a diverse set of anchors for a batch of backlinks.
 * Distribution avoids exact-match over-optimization (Penguin penalty):
 *   ~10% exact, ~30% partial, ~20% branded, ~20% generic, ~20% url
 * For count === 1, returns a single exact anchor (the user's own).
 */
export function planAnchors(opts: {
  keyword: string;
  targetUrl: string;
  count: number;
  customAnchor?: string;
}): AnchorPlan[] {
  const count = Math.max(1, Math.floor(opts.count));
  const exact = (opts.customAnchor && opts.customAnchor.trim()) || opts.keyword;
  const brand = brandFromUrl(opts.targetUrl);
  const naked = nakedUrl(opts.targetUrl);

  if (count === 1) {
    return [{ text: exact, type: "exact" }];
  }

  // Target distribution
  let exactN = Math.max(1, Math.round(count * 0.1));
  let partialN = Math.max(1, Math.round(count * 0.3));
  let brandedN = Math.max(1, Math.round(count * 0.2));
  let genericN = Math.max(1, Math.round(count * 0.2));
  let urlN = count - (exactN + partialN + brandedN + genericN);

  // If rounding overshot the count, trim from less-critical buckets first.
  while (exactN + partialN + brandedN + genericN + urlN > count) {
    if (urlN > 0) urlN--;
    else if (genericN > 1) genericN--;
    else if (brandedN > 1) brandedN--;
    else if (partialN > 1) partialN--;
    else exactN--;
  }
  while (exactN + partialN + brandedN + genericN + urlN < count) urlN++;

  const buckets: Record<AnchorType, AnchorPlan[]> = {
    exact: Array.from({ length: exactN }, () => ({ text: exact, type: "exact" as const })),
    partial: Array.from({ length: partialN }, (_, i) => ({
      text: PARTIAL_TEMPLATES[i % PARTIAL_TEMPLATES.length](exact.toLowerCase()),
      type: "partial" as const,
    })),
    branded: Array.from({ length: brandedN }, () => ({ text: brand, type: "branded" as const })),
    generic: Array.from({ length: genericN }, (_, i) => ({
      text: GENERIC_OPTIONS[i % GENERIC_OPTIONS.length],
      type: "generic" as const,
    })),
    url: Array.from({ length: urlN }, () => ({ text: naked, type: "url" as const })),
  };

  // Round-robin interleave so partner sites don't get the same type back-to-back
  const order: AnchorType[] = ["partial", "branded", "generic", "url", "exact"];
  const out: AnchorPlan[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const t of order) {
      const next = buckets[t].shift();
      if (next) {
        out.push(next);
        added = true;
      }
    }
  }
  return out;
}

export const ANCHOR_TYPE_LABEL: Record<AnchorType, string> = {
  exact: "Exata",
  partial: "Parcial",
  branded: "Marca",
  generic: "Genérica",
  url: "URL nua",
};

const GENERIC_LOOKUP = new Set(GENERIC_OPTIONS.map(g => g.toLowerCase()));

/**
 * Classify a free-text anchor against the keyword and target URL so we can
 * still record the right anchor_type when the user types their own.
 */
export function classifyAnchor(opts: {
  text: string;
  keyword: string;
  targetUrl: string;
}): AnchorType {
  const t = opts.text.trim().toLowerCase();
  if (!t) return "partial";
  const kw = opts.keyword.trim().toLowerCase();
  const brand = brandFromUrl(opts.targetUrl).toLowerCase();
  const naked = nakedUrl(opts.targetUrl).toLowerCase();

  if (t === naked || /^https?:\/\//.test(opts.text.trim())) return "url";
  if (kw && t === kw) return "exact";
  if (brand && t === brand) return "branded";
  if (GENERIC_LOOKUP.has(t)) return "generic";
  if (kw && t.includes(kw)) return "partial";
  return "generic";
}
