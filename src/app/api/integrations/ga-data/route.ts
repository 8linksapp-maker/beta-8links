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
 * GET /api/integrations/ga-data?siteId=xxx&period=30
 * Fetch Google Analytics data for a site.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  const period = parseInt(searchParams.get("period") ?? "30");

  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: site } = await supabase.from("client_sites").select("ga_property_id, google_refresh_token").eq("id", siteId).single();

  if (!site?.google_refresh_token || !site?.ga_property_id) {
    return NextResponse.json({
      error: "Google Analytics not connected for this site",
      debug: { hasToken: !!site?.google_refresh_token, gaPropertyId: site?.ga_property_id ?? null }
    });
  }

  try {
    const accessToken = await getAccessToken(site.google_refresh_token);
    if (!accessToken) {
      return NextResponse.json({ error: "Failed to get Google access token — refresh token may be expired" });
    }
    const propertyId = site.ga_property_id.replace("properties/", "");

    // GA4 Data API — get sessions, users, pageviews
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - period * 86400000).toISOString().split("T")[0];

    const gaRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "screenPageViews" },
          { name: "bounceRate" },
        ],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
    });

    const gaData = await gaRes.json();

    if (gaData.error) {
      return NextResponse.json({
        error: gaData.error.message ?? "Google Analytics API error",
        code: gaData.error.code,
        status: gaData.error.status,
        propertyId,
      });
    }

    // Parse into daily data
    const daily = (gaData.rows ?? []).map((row: any) => ({
      date: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
      pageviews: parseInt(row.metricValues[2].value),
      bounceRate: parseFloat(row.metricValues[3].value),
    }));

    // Totals
    const totals = daily.reduce((acc: any, d: any) => ({
      sessions: acc.sessions + d.sessions,
      users: acc.users + d.users,
      pageviews: acc.pageviews + d.pageviews,
    }), { sessions: 0, users: 0, pageviews: 0 });

    return NextResponse.json({ daily, totals, period });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
