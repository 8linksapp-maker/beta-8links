import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBacklinkSummary } from "@/lib/apis/dataforseo";

/**
 * POST /api/admin/update-network-metrics
 * For each network site: gets AP + backlinks from DataForSEO, counts articles from sitemap.
 * Processes 5 in parallel. Only updates sites with da=0 (not yet fetched).
 * Body: { force?: boolean } — if true, updates all sites regardless of current da.
 */
export async function POST(request: Request) {
  const { force } = await request.json().catch(() => ({}));
  const supabase = await createClient();

  let query = supabase.from("network_sites").select("id, domain, vercel_url, da").eq("status", "active");
  if (!force) {
    query = query.eq("da", 0);
  }

  const { data: sites } = await query.order("domain").limit(100);
  if (!sites || sites.length === 0) {
    return NextResponse.json({ message: "Todos os sites já têm métricas", processed: 0 });
  }

  const results: Array<{ domain: string; success: boolean; da?: number; backlinks?: number; articles?: number; error?: string }> = [];

  // Process in batches of 5
  const batchSize = 5;
  for (let i = 0; i < sites.length; i += batchSize) {
    const batch = sites.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(async (site) => {
      try {
        // 1. Get AP + backlinks from DataForSEO
        let da = 0;
        let totalBacklinks = 0;
        let referringDomains = 0;

        if (process.env.DATAFORSEO_LOGIN) {
          try {
            const result = await getBacklinkSummary(site.domain);
            const summary = result?.tasks?.[0]?.result?.[0];
            const rawRank = summary?.rank ?? 0;
            da = Math.min(100, Math.round(rawRank / 10));
            totalBacklinks = summary?.backlinks ?? 0;
            referringDomains = summary?.referring_domains ?? 0;
          } catch (e) {
            // DataForSEO might not have data for new domains
            console.log(`[NetworkMetrics] DataForSEO error for ${site.domain}: ${e}`);
          }
        }

        // 2. Count articles from sitemap (free)
        let articleCount = 0;
        const sitemapUrl = site.vercel_url
          ? `${site.vercel_url}/sitemap.xml`
          : `https://${site.domain}/sitemap.xml`;

        try {
          const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(5000) });
          if (res.ok) {
            const text = await res.text();
            // Count <url> or <loc> entries, minus homepage and standard pages
            const locMatches = text.match(/<loc>/gi);
            const totalUrls = locMatches?.length ?? 0;
            // Estimate: subtract ~5 for standard pages (home, about, contact, category, etc)
            articleCount = Math.max(0, totalUrls - 5);
          }
        } catch {}

        // 3. Update DB — don't overwrite DA if Moz already set it
        const update: Record<string, any> = {};
        if (site.da === 0 && da > 0) update.da = da; // Only set DA if currently 0

        // Store backlinks and articles in site_context
        const { data: current } = await supabase.from("network_sites").select("site_context").eq("id", site.id).single();
        const ctx = current?.site_context ?? {};
        ctx.totalBacklinks = totalBacklinks;
        ctx.referringDomains = referringDomains;
        ctx.articleCount = articleCount;
        ctx.metricsUpdatedAt = new Date().toISOString();
        update.site_context = ctx;

        await supabase.from("network_sites").update(update).eq("id", site.id);

        return {
          domain: site.domain,
          success: true,
          da,
          backlinks: totalBacklinks,
          articles: articleCount,
        };
      } catch (error) {
        return { domain: site.domain, success: false, error: String(error) };
      }
    }));
    results.push(...batchResults);
  }

  return NextResponse.json({
    processed: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    totalCost: `$${(results.filter(r => r.success).length * 0.001).toFixed(3)}`,
    results,
  });
}
