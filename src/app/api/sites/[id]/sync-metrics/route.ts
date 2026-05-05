import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBacklinkSummary } from "@/lib/apis/dataforseo";

// Cooldown between syncs per site (controls DataForSEO + Google API costs).
const SYNC_COOLDOWN_DAYS = 30;
const SYNC_COOLDOWN_MS = SYNC_COOLDOWN_DAYS * 86400000;

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
  if (!data.access_token) throw new Error("token_expired");
  return data.access_token;
}

// Match the user's site against GSC properties they own.
// Tries the site URL with/without trailing slash, http/https, and sc-domain: prefix variants.
function findMatchingGscSite(userSiteUrl: string, gscSites: Array<{ siteUrl: string }>): string | null {
  const normalize = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
  const target = normalize(userSiteUrl);

  // Exact match (any protocol/slash variant)
  for (const s of gscSites) {
    if (normalize(s.siteUrl) === target) return s.siteUrl;
  }
  // sc-domain: variant
  const targetDomain = target.replace(/^www\./, "");
  for (const s of gscSites) {
    if (s.siteUrl.startsWith("sc-domain:")) {
      const domain = s.siteUrl.replace(/^sc-domain:/, "").toLowerCase();
      if (domain === targetDomain) return s.siteUrl;
    }
  }
  return null;
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: siteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: site, error: siteErr } = await supabase
    .from("client_sites")
    .select("id, url, google_refresh_token, gsc_site_url, last_synced_at")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .single();

  if (siteErr || !site) return NextResponse.json({ error: "Site não encontrado" }, { status: 404 });
  if (!site.google_refresh_token) {
    return NextResponse.json({ error: "Conecte com o Google primeiro" }, { status: 400 });
  }

  // Cooldown: only one full sync per 30 days per site (limits API spend).
  if (site.last_synced_at) {
    const elapsedMs = Date.now() - new Date(site.last_synced_at).getTime();
    if (elapsedMs < SYNC_COOLDOWN_MS) {
      const daysLeft = Math.ceil((SYNC_COOLDOWN_MS - elapsedMs) / 86400000);
      return NextResponse.json({
        error: `Você atualizou recentemente. Pode atualizar de novo em ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}.`,
        daysLeft,
        nextAvailableAt: new Date(new Date(site.last_synced_at).getTime() + SYNC_COOLDOWN_MS).toISOString(),
      }, { status: 429 });
    }
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(site.google_refresh_token);
  } catch {
    return NextResponse.json({ error: "Sua conexão com o Google venceu. Conecte de novo." }, { status: 401 });
  }

  // If we don't have a GSC property URL yet, try to auto-pick one that matches this site
  let gscSiteUrl = site.gsc_site_url as string | null;
  if (!gscSiteUrl) {
    const sitesRes = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const sitesData = await sitesRes.json();
    const gscSites = (sitesData.siteEntry ?? []) as Array<{ siteUrl: string; permissionLevel: string }>;
    if (gscSites.length === 0) {
      return NextResponse.json({
        error: "Esse site ainda não tá no Google Search Console. Cadastre em search.google.com primeiro.",
      }, { status: 400 });
    }
    const match = findMatchingGscSite(site.url, gscSites);
    if (!match) {
      return NextResponse.json({
        error: "Não achamos seu site na sua conta do Google. Confira se cadastrou no Search Console com o mesmo endereço.",
        availableSites: gscSites.map(s => s.siteUrl),
      }, { status: 400 });
    }
    gscSiteUrl = match;
    await supabase.from("client_sites").update({ gsc_site_url: gscSiteUrl }).eq("id", siteId);
  }

  // Fetch last 28 days totals
  const now = new Date();
  const endDate = now.toISOString().split("T")[0];
  const startDate = new Date(now.getTime() - 28 * 86400000).toISOString().split("T")[0];

  const queryRes = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(gscSiteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, dimensions: [], rowLimit: 1, type: "web" }),
    }
  );
  const queryData = await queryRes.json();
  if (queryData.error) {
    return NextResponse.json({ error: "O Google recusou o pedido. Tente reconectar." }, { status: 502 });
  }

  const totals = queryData.rows?.[0];
  const clicks = Math.round(totals?.clicks ?? 0);
  const impressions = Math.round(totals?.impressions ?? 0);
  const avgPosition = totals?.position ? Math.round(totals.position * 10) / 10 : null;

  // Fetch backlink summary (DA + total backlinks) from DataForSEO
  let da: number | null = null;
  let backlinksTotal: number | null = null;
  try {
    const cleanDomain = site.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const summary = await getBacklinkSummary(cleanDomain);
    const result = summary?.tasks?.[0]?.result?.[0];
    if (result) {
      da = Math.min(100, Math.round((result.rank ?? 0) / 10));
      backlinksTotal = result.backlinks ?? null;
    }
  } catch (e) {
    console.error("[sync-metrics] DataForSEO backlink summary failed:", e);
    // Don't fail the whole sync — GSC succeeded already
  }

  const updatePayload: Record<string, unknown> = {
    gsc_clicks_28d: clicks,
    gsc_impressions_28d: impressions,
    gsc_avg_position: avgPosition,
    last_synced_at: new Date().toISOString(),
  };
  if (da !== null) updatePayload.da_current = da;
  if (backlinksTotal !== null) updatePayload.external_backlinks_total = backlinksTotal;

  await supabase.from("client_sites").update(updatePayload).eq("id", siteId);

  return NextResponse.json({
    success: true,
    clicks,
    impressions,
    avgPosition,
    da,
    backlinksTotal,
  });
}
