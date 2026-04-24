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
 * GET /api/integrations/gsc-pages?siteId=xxx&period=30
 * Top pages by clicks from Google Search Console.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  const period = parseInt(searchParams.get("period") ?? "30");

  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: site } = await supabase.from("client_sites").select("gsc_site_url, google_refresh_token").eq("id", siteId).single();

  if (!site?.google_refresh_token || !site?.gsc_site_url) {
    return NextResponse.json({ error: "Search Console not connected" });
  }

  try {
    const accessToken = await getAccessToken(site.google_refresh_token);
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - period * 86400000).toISOString().split("T")[0];

    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site.gsc_site_url)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["page"],
          rowLimit: 20,
          type: "web",
        }),
      }
    );

    const data = await res.json();

    const pages = (data.rows ?? [])
      .map((row: any) => ({
        page: row.keys[0],
        path: row.keys[0].replace(/^https?:\/\/[^/]+/, "") || "/",
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: Math.round(row.ctr * 100 * 10) / 10,
        position: Math.round(row.position * 10) / 10,
      }))
      .sort((a: any, b: any) => b.clicks - a.clicks);

    return NextResponse.json({ pages, period });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
