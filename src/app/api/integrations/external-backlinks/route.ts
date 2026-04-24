import { NextResponse } from "next/server";
import { getBacklinks } from "@/lib/apis/dataforseo";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/integrations/external-backlinks?siteId=xxx[&refresh=true]
 *
 * Loads external backlinks from DB cache.
 * Only calls DataForSEO on first load (no cache) or when refresh=true.
 * Backlinks created within the platform (table `backlinks`) are mixed in by the frontend.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  const forceRefresh = searchParams.get("refresh") === "true";

  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const supabase = await createClient();

  // Load site info
  const { data: site } = await supabase.from("client_sites").select("url, backlinks_fetched_at").eq("id", siteId).single();
  if (!site?.url) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  // Check if we have cached data
  const hasCachedData = !!site.backlinks_fetched_at;

  if (hasCachedData && !forceRefresh) {
    // Return from DB
    const { data: cached } = await supabase
      .from("external_backlinks")
      .select("*")
      .eq("client_site_id", siteId)
      .order("authority_points", { ascending: false });

    const backlinks = (cached ?? []).map(row => ({
      domainFrom: row.domain_from,
      urlFrom: row.url_from ?? "",
      urlTo: row.url_to ?? "",
      pageTitle: row.page_title ?? "",
      anchor: row.anchor ?? "",
      textPre: row.text_pre ?? "",
      textPost: row.text_post ?? "",
      linkContext: row.link_context ?? "",
      dofollow: row.dofollow,
      lastSeen: row.last_seen ?? "",
      authorityPoints: row.authority_points,
      backlinkCount: row.backlink_count,
    }));

    return NextResponse.json({
      backlinks,
      total: backlinks.reduce((s, b) => s + b.backlinkCount, 0),
      totalBacklinks: backlinks.reduce((s, b) => s + b.backlinkCount, 0),
      totalDomains: backlinks.length,
      source: "cache",
      fetchedAt: site.backlinks_fetched_at,
    });
  }

  // Fetch from DataForSEO
  if (!process.env.DATAFORSEO_LOGIN) {
    return NextResponse.json({ error: "DataForSEO not configured" });
  }

  try {
    const cleanDomain = site.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const result = await getBacklinks(cleanDomain, 100, "one_per_domain");
    const resultData = result?.tasks?.[0]?.result?.[0];
    const items = resultData?.items ?? [];

    const backlinks = items.map((item: any) => ({
      domainFrom: item.domain_from ?? "",
      urlFrom: item.url_from ?? "",
      urlTo: item.url_to ?? "",
      pageTitle: item.page_from_title ?? "",
      anchor: item.anchor ?? "",
      textPre: item.text_pre ?? "",
      textPost: item.text_post ?? "",
      linkContext: [item.text_pre, item.anchor, item.text_post].filter(Boolean).join("").trim() || item.anchor || "",
      dofollow: item.dofollow ?? false,
      lastSeen: item.last_seen ?? "",
      da: Math.min(100, Math.round((item.domain_from_rank ?? 0) / 10)),
      backlinkCount: item.group_count ?? item.links_count ?? 1,
    }));

    // Save to DB — delete old ones first, then insert fresh
    await supabase.from("external_backlinks").delete().eq("client_site_id", siteId);

    if (backlinks.length > 0) {
      const rows = backlinks.map((bl: any) => ({
        client_site_id: siteId,
        domain_from: bl.domainFrom,
        url_from: bl.urlFrom || null,
        url_to: bl.urlTo || null,
        page_title: bl.pageTitle || null,
        anchor: bl.anchor || null,
        text_pre: bl.textPre || null,
        text_post: bl.textPost || null,
        link_context: bl.linkContext || null,
        dofollow: bl.dofollow,
        authority_points: bl.da ?? bl.authorityPoints ?? 0,
        backlink_count: bl.backlinkCount,
        last_seen: bl.lastSeen || null,
      }));

      const { error: insertError } = await supabase.from("external_backlinks").insert(rows);
      if (insertError) console.error("[ExternalBacklinks] Insert error:", insertError);
    }

    // Mark fetch timestamp
    await supabase.from("client_sites").update({ backlinks_fetched_at: new Date().toISOString() }).eq("id", siteId);

    return NextResponse.json({
      backlinks,
      total: resultData?.total_count ?? 0,
      totalBacklinks: resultData?.total_count ?? 0,
      totalDomains: backlinks.length,
      source: "dataforseo",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[ExternalBacklinks] Error:", error);
    return NextResponse.json({ error: String(error) });
  }
}
