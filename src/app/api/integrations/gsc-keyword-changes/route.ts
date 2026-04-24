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

async function fetchGscKeywords(accessToken: string, siteUrl: string, startDate: string, endDate: string) {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, dimensions: ["query"], rowLimit: 500, type: "web" }),
    }
  );
  const data = await res.json();
  return (data.rows ?? []).map((row: any) => ({
    keyword: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    position: Math.round(row.position * 10) / 10,
  }));
}

/**
 * GET /api/integrations/gsc-keyword-changes?siteId=xxx
 * Compare keyword positions: last 30 days vs previous 30 days.
 * Returns keywords that moved up/down + opportunities (position 11-20).
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

    // Current period: last 30 days
    const currentEnd = now.toISOString().split("T")[0];
    const currentStart = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];

    // Previous period: 30-60 days ago
    const prevEnd = currentStart;
    const prevStart = new Date(now.getTime() - 60 * 86400000).toISOString().split("T")[0];

    const [current, previous] = await Promise.all([
      fetchGscKeywords(accessToken, site.gsc_site_url, currentStart, currentEnd),
      fetchGscKeywords(accessToken, site.gsc_site_url, prevStart, prevEnd),
    ]);

    // Build previous position map
    const prevMap = new Map<string, number>();
    for (const kw of previous) {
      prevMap.set(kw.keyword, kw.position);
    }

    // Compare
    const changes = current
      .filter((kw: any) => prevMap.has(kw.keyword))
      .map((kw: any) => {
        const prevPos = prevMap.get(kw.keyword)!;
        const change = prevPos - kw.position; // positive = moved up
        return { ...kw, previousPosition: prevPos, change };
      })
      .filter((kw: any) => Math.abs(kw.change) >= 1);

    const movedUp = changes.filter((kw: any) => kw.change > 0).sort((a: any, b: any) => b.change - a.change).slice(0, 10);
    const movedDown = changes.filter((kw: any) => kw.change < 0).sort((a: any, b: any) => a.change - b.change).slice(0, 10);

    // Opportunities: keywords at position 11-20 with clicks
    const opportunities = current
      .filter((kw: any) => kw.position >= 11 && kw.position <= 20 && kw.clicks > 0)
      .sort((a: any, b: any) => a.position - b.position)
      .slice(0, 5);

    return NextResponse.json({
      movedUp,
      movedDown,
      opportunities,
      totalUp: changes.filter((kw: any) => kw.change > 0).length,
      totalDown: changes.filter((kw: any) => kw.change < 0).length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
