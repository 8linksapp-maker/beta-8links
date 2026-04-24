import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RAPIDAPI_KEY = "75ac442425mshb7f8a38378e8c64p186c34jsn7070a3443466";
const RAPIDAPI_HOST = "domain-da-pa-check5.p.rapidapi.com";

async function getMozDA(domain: string): Promise<{ da: number; pa: number; spam: number }> {
  const res = await fetch(`https://${RAPIDAPI_HOST}/lookup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": RAPIDAPI_KEY,
    },
    body: JSON.stringify({ target: domain }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return {
    da: data.domain_authority ?? data.da ?? 0,
    pa: data.page_authority ?? data.pa ?? 0,
    spam: data.spam_score ?? 0,
  };
}

/**
 * POST /api/admin/moz-ranks
 * Gets Moz DA/PA/Spam Score for all network sites.
 * Body: { save?: boolean } — if true, updates da in DB
 */
export async function POST(request: Request) {
  const { save } = await request.json().catch(() => ({}));
  const supabase = await createClient();

  const { data: sites } = await supabase.from("network_sites").select("id, domain, da").eq("status", "active").order("domain");
  if (!sites?.length) return NextResponse.json({ error: "No sites" });

  const results: Array<{ domain: string; da: number; pa: number; spam: number; success: boolean; error?: string }> = [];

  // Process 3 at a time (RapidAPI rate limits)
  for (let i = 0; i < sites.length; i += 3) {
    const batch = sites.slice(i, i + 3);
    const batchResults = await Promise.all(batch.map(async (site) => {
      try {
        const moz = await getMozDA(site.domain);

        if (save) {
          // Update DA and store Moz metrics in site_context
          const { data: current } = await supabase.from("network_sites").select("site_context").eq("id", site.id).single();
          const ctx = current?.site_context ?? {};
          ctx.mozDA = moz.da;
          ctx.mozPA = moz.pa;
          ctx.mozSpam = moz.spam;
          ctx.mozUpdatedAt = new Date().toISOString();

          await supabase.from("network_sites").update({
            da: moz.da,
            site_context: ctx,
          }).eq("id", site.id);
        }

        return { domain: site.domain, ...moz, success: true };
      } catch (error) {
        return { domain: site.domain, da: 0, pa: 0, spam: 0, success: false, error: String(error) };
      }
    }));
    results.push(...batchResults);

    // Small delay between batches to respect rate limits
    if (i + 3 < sites.length) await new Promise(r => setTimeout(r, 500));
  }

  results.sort((a, b) => b.da - a.da);

  const withDA = results.filter(r => r.da > 0);
  const stats = {
    total: results.length,
    withDA: withDA.length,
    withoutDA: results.length - withDA.length,
    minDA: withDA.length > 0 ? Math.min(...withDA.map(r => r.da)) : 0,
    maxDA: withDA.length > 0 ? Math.max(...withDA.map(r => r.da)) : 0,
    avgDA: withDA.length > 0 ? Math.round(withDA.reduce((s, r) => s + r.da, 0) / withDA.length * 10) / 10 : 0,
    saved: !!save,
  };

  return NextResponse.json({ stats, results });
}
