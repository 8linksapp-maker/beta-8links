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

/**
 * GET /api/integrations/gsc-data?siteId=xxx&period=30
 * Fetch Google Search Console data — keywords, positions, clicks, impressions.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  const period = parseInt(searchParams.get("period") ?? "30");

  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: site } = await supabase.from("client_sites").select("gsc_site_url, google_refresh_token").eq("id", siteId).single();

  if (!site?.google_refresh_token || !site?.gsc_site_url) {
    return NextResponse.json({ error: "Search Console not connected for this site" });
  }

  try {
    const accessToken = await getAccessToken(site.google_refresh_token);
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - period * 86400000).toISOString().split("T")[0];

    // Search Analytics — top queries
    const queriesRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site.gsc_site_url)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["query"],
          rowLimit: 5000,
          type: "web",
        }),
      }
    );

    const queriesData = await queriesRes.json();

    const keywords = (queriesData.rows ?? [])
      .map((row: any) => ({
        keyword: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: Math.round(row.ctr * 100 * 10) / 10,
        position: Math.round(row.position * 10) / 10,
      }))
      .sort((a: any, b: any) => b.clicks - a.clicks);

    // Search Analytics — daily totals
    const dailyRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site.gsc_site_url)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["date"],
          type: "web",
        }),
      }
    );

    const dailyData = await dailyRes.json();

    const daily = (dailyData.rows ?? []).map((row: any) => ({
      date: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: Math.round(row.ctr * 100 * 10) / 10,
      position: Math.round(row.position * 10) / 10,
    }));

    // Totals
    const totals = {
      clicks: keywords.reduce((a: number, k: any) => a + k.clicks, 0),
      impressions: keywords.reduce((a: number, k: any) => a + k.impressions, 0),
      avgPosition: keywords.length > 0 ? Math.round(keywords.reduce((a: number, k: any) => a + k.position, 0) / keywords.length * 10) / 10 : 0,
      totalKeywords: keywords.length,
      inTop10: keywords.filter((k: any) => k.position <= 10).length,
    };

    return NextResponse.json({ keywords, daily, totals, period });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
