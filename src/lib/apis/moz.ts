/**
 * Moz Domain Authority API (Official v2)
 * Docs: https://moz.com/help/links-api
 */

export interface MozResult {
  da: number;
  pa: number;
  spam: number;
  rootDomainsToRootDomain: number;
  externalPagesToRootDomain: number;
}

const MOZ_API_KEY = process.env.MOZ_API_KEY ?? "";

export async function getMozDA(domain: string): Promise<MozResult> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\/$/, "");

  if (!MOZ_API_KEY) {
    console.warn("[Moz] MOZ_API_KEY not configured");
    return { da: 0, pa: 0, spam: 0, rootDomainsToRootDomain: 0, externalPagesToRootDomain: 0 };
  }

  const res = await fetch("https://lsapi.seomoz.com/v2/url_metrics", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${MOZ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ targets: [cleanDomain] }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Moz API HTTP ${res.status}`);
  const data = await res.json();
  const result = data.results?.[0];

  if (!result) return { da: 0, pa: 0, spam: 0, rootDomainsToRootDomain: 0, externalPagesToRootDomain: 0 };

  return {
    da: result.domain_authority ?? 0,
    pa: result.page_authority ?? 0,
    spam: result.spam_score ?? 0,
    rootDomainsToRootDomain: result.root_domains_to_root_domain ?? 0,
    externalPagesToRootDomain: result.external_pages_to_root_domain ?? 0,
  };
}

/**
 * Batch DA lookup — up to 30 domains at once (saves API rows)
 */
export async function getMozDABatch(domains: string[]): Promise<Record<string, MozResult>> {
  if (!MOZ_API_KEY || domains.length === 0) return {};

  const cleaned = domains.map(d => d.replace(/^https?:\/\//, "").replace(/\/.*$/, ""));

  // Moz API allows up to 30 targets per request
  const results: Record<string, MozResult> = {};
  for (let i = 0; i < cleaned.length; i += 30) {
    const batch = cleaned.slice(i, i + 30);

    const res = await fetch("https://lsapi.seomoz.com/v2/url_metrics", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${MOZ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ targets: batch }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) continue;
    const data = await res.json();

    for (const r of data.results ?? []) {
      const domain = r.root_domain ?? r.page ?? "";
      results[domain] = {
        da: r.domain_authority ?? 0,
        pa: r.page_authority ?? 0,
        spam: r.spam_score ?? 0,
        rootDomainsToRootDomain: r.root_domains_to_root_domain ?? 0,
        externalPagesToRootDomain: r.external_pages_to_root_domain ?? 0,
      };
    }
  }

  return results;
}
