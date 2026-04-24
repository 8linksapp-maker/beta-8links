import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  return data.access_token;
}

async function fetchGsc(accessToken: string, siteUrl: string, startDate: string, endDate: string, dimensions: string[]) {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, dimensions, rowLimit: 5000, type: "web" }),
    }
  );
  return res.json();
}

/**
 * GET /api/integrations/gsc-keywords-full?siteId=xxx
 * Returns keywords with their ranking URL, clicks, impressions, position,
 * and position change vs previous 30 days.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: site } = await supabase.from("client_sites").select("gsc_site_url, google_refresh_token").eq("id", siteId).single();

  if (!site?.google_refresh_token || !site?.gsc_site_url) {
    return NextResponse.json({ error: "Search Console not connected" });
  }

  try {
    const accessToken = await getAccessToken(site.google_refresh_token);
    const now = new Date();

    // Current: last 30 days with query+page
    const curEnd = now.toISOString().split("T")[0];
    const curStart = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];

    // Previous: 30-60 days ago, query only (for position comparison)
    const prevEnd = curStart;
    const prevStart = new Date(now.getTime() - 60 * 86400000).toISOString().split("T")[0];

    const [curData, prevData] = await Promise.all([
      fetchGsc(accessToken, site.gsc_site_url, curStart, curEnd, ["query", "page"]),
      fetchGsc(accessToken, site.gsc_site_url, prevStart, prevEnd, ["query"]),
    ]);

    // Build previous position map
    const prevMap = new Map<string, number>();
    for (const row of (prevData.rows ?? [])) {
      prevMap.set(row.keys[0], Math.round(row.position * 10) / 10);
    }

    // Aggregate current data: group by keyword, keep best URL (most clicks)
    const kwMap = new Map<string, {
      keyword: string;
      url: string;
      clicks: number;
      impressions: number;
      position: number;
      ctr: number;
    }>();

    for (const row of (curData.rows ?? [])) {
      const keyword = row.keys[0];
      const url = row.keys[1];
      const existing = kwMap.get(keyword);

      if (!existing || row.clicks > existing.clicks) {
        kwMap.set(keyword, {
          keyword,
          url,
          clicks: row.clicks,
          impressions: row.impressions,
          position: Math.round(row.position * 10) / 10,
          ctr: Math.round(row.ctr * 100 * 10) / 10,
        });
      }
    }

    // Get backlink counts per URL from DB
    const { data: blData } = await supabase
      .from("external_backlinks")
      .select("url_to, backlink_count")
      .eq("client_site_id", siteId);

    const blMap = new Map<string, number>();
    for (const bl of (blData ?? [])) {
      if (bl.url_to) {
        const existing = blMap.get(bl.url_to) ?? 0;
        blMap.set(bl.url_to, existing + (bl.backlink_count ?? 1));
      }
    }

    // Build final list
    const keywords = Array.from(kwMap.values())
      .map(kw => {
        const prevPos = prevMap.get(kw.keyword);
        const change = prevPos ? Math.round((prevPos - kw.position) * 10) / 10 : 0;
        const backlinks = blMap.get(kw.url) ?? 0;
        const path = kw.url.replace(/^https?:\/\/[^/]+/, "") || "/";

        return {
          keyword: kw.keyword,
          url: kw.url,
          path,
          clicks: kw.clicks,
          impressions: kw.impressions,
          position: kw.position,
          ctr: kw.ctr,
          change,
          backlinks,
        };
      })
      .sort((a, b) => b.clicks - a.clicks);

    // Totals
    const totals = {
      totalKeywords: keywords.length,
      totalClicks: keywords.reduce((s, k) => s + k.clicks, 0),
      totalImpressions: keywords.reduce((s, k) => s + k.impressions, 0),
      inTop10: keywords.filter(k => k.position <= 10).length,
      avgPosition: keywords.length > 0
        ? Math.round(keywords.reduce((s, k) => s + k.position, 0) / keywords.length * 10) / 10
        : 0,
      totalUp: keywords.filter(k => k.change > 0).length,
      totalDown: keywords.filter(k => k.change < 0).length,
    };

    return NextResponse.json({ keywords, totals });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
