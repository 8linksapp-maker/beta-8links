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
 * GET /api/integrations/google-properties?siteId=xxx
 * List GA4 properties and Search Console sites the user has access to.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: site } = await supabase.from("client_sites").select("google_refresh_token").eq("id", siteId).single();
  if (!site?.google_refresh_token) return NextResponse.json({ error: "Google not connected" });

  try {
    const accessToken = await getAccessToken(site.google_refresh_token);

    // Fetch GA4 properties
    let gaProperties: Array<{ id: string; name: string; displayName: string }> = [];
    let gaError: string | null = null;
    try {
      const gaRes = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const gaData = await gaRes.json();
      console.log("[Google] GA accountSummaries response:", JSON.stringify(gaData).slice(0, 500));

      if (gaData.error) {
        gaError = `${gaData.error.code}: ${gaData.error.message}`;
        console.error("[Google] GA API error:", gaError);
      }

      for (const account of gaData.accountSummaries ?? []) {
        for (const prop of account.propertySummaries ?? []) {
          gaProperties.push({
            id: prop.property,
            name: prop.displayName ?? prop.property,
            displayName: `${account.displayName} / ${prop.displayName}`,
          });
        }
      }
    } catch (e) {
      gaError = String(e);
      console.error("[Google] GA properties error:", e);
    }

    // Fetch Search Console sites
    let gscSites: Array<{ siteUrl: string; permissionLevel: string }> = [];
    try {
      const gscRes = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const gscData = await gscRes.json();
      gscSites = (gscData.siteEntry ?? []).map((s: any) => ({
        siteUrl: s.siteUrl,
        permissionLevel: s.permissionLevel,
      }));
    } catch (e) {
      console.error("[Google] GSC sites error:", e);
    }

    return NextResponse.json({ gaProperties, gscSites, gaError });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}

/**
 * POST /api/integrations/google-properties
 * Save selected GA property and GSC site.
 */
export async function POST(request: Request) {
  const { siteId, gaPropertyId, gscSiteUrl } = await request.json();
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const update: Record<string, unknown> = {};
  if (gaPropertyId !== undefined) update.ga_property_id = gaPropertyId;
  if (gscSiteUrl !== undefined) update.gsc_site_url = gscSiteUrl;

  await supabase.from("client_sites").update(update).eq("id", siteId).eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
