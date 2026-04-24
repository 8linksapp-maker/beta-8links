import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBacklinkSummary } from "@/lib/apis/dataforseo";

/**
 * POST /api/admin/raw-ranks
 * Gets RAW rank values from DataForSEO for all network sites.
 * No formula applied — just the raw numbers for analysis.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: sites } = await supabase.from("network_sites").select("id, domain, da").eq("status", "active").order("domain");

  if (!sites?.length) return NextResponse.json({ error: "No sites" });

  const results: Array<{ domain: string; rank100: number; rawRank1000: number; backlinks: number; refDomains: number; currentAP: number }> = [];

  // Process 5 at a time
  for (let i = 0; i < sites.length; i += 5) {
    const batch = sites.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(async (site) => {
      try {
        // bulk_ranks with one_hundred scale
        const bulkRes = await fetch("https://api.dataforseo.com/v3/backlinks/bulk_ranks/live", {
          method: "POST",
          headers: { "Authorization": "Basic " + Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString("base64"), "Content-Type": "application/json" },
          body: JSON.stringify([{ targets: [site.domain], rank_scale: "one_hundred" }]),
        });
        const bulkData = await bulkRes.json();
        const rankItem = bulkData?.tasks?.[0]?.result?.[0];

        // Also get backlink summary for context
        const result = await getBacklinkSummary(site.domain);
        const summary = result?.tasks?.[0]?.result?.[0];

        return {
          domain: site.domain,
          rank100: rankItem?.rank ?? 0,
          rawRank1000: summary?.rank ?? 0,
          backlinks: summary?.backlinks ?? 0,
          refDomains: summary?.referring_domains ?? 0,
          currentAP: site.da,
        };
      } catch {
        return { domain: site.domain, rank100: 0, rawRank1000: 0, backlinks: 0, refDomains: 0, currentAP: site.da };
      }
    }));
    results.push(...batchResults);
  }

  // Sort by rank100 desc
  results.sort((a, b) => b.rank100 - a.rank100);

  // Stats
  const withRank = results.filter(r => r.rank100 > 0);
  const stats = {
    total: results.length,
    withRank100: withRank.length,
    withoutRank: results.length - withRank.length,
    min100: withRank.length > 0 ? Math.min(...withRank.map(r => r.rank100)) : 0,
    max100: withRank.length > 0 ? Math.max(...withRank.map(r => r.rank100)) : 0,
    avg100: withRank.length > 0 ? Math.round(withRank.reduce((s, r) => s + r.rank100, 0) / withRank.length * 10) / 10 : 0,
  };

  return NextResponse.json({ stats, results });
}
