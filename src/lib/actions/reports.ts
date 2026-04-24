"use server";

import { createClient } from "@/lib/supabase/server";

export async function getReports(siteId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("reports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (siteId) {
    query = query.eq("client_site_id", siteId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function generateReport(siteId: string, type: "weekly" | "monthly") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch all data for the report
  const [
    { data: site },
    { data: backlinks },
    { data: keywords },
    { data: articles },
    { data: achievements },
  ] = await Promise.all([
    supabase.from("client_sites").select("*").eq("id", siteId).single(),
    supabase.from("backlinks").select("status, da_at_creation, created_at").eq("client_site_id", siteId),
    supabase.from("keywords").select("keyword, position_current, position_previous, search_volume, in_top_10").eq("client_site_id", siteId),
    supabase.from("articles").select("title, status, content_score, published_at").eq("client_site_id", siteId),
    supabase.from("achievements").select("label, icon, unlocked_at").eq("user_id", user.id).order("unlocked_at", { ascending: false }).limit(5),
  ]);

  const reportData = {
    site: { url: site?.url, da: site?.da_current, score: site?.seo_score, phase: site?.phase },
    backlinks: {
      total: backlinks?.length ?? 0,
      published: backlinks?.filter(b => b.status === "published" || b.status === "indexed").length ?? 0,
      avgDa: backlinks?.length ? Math.round(backlinks.reduce((a, b) => a + (b.da_at_creation ?? 0), 0) / backlinks.length) : 0,
    },
    keywords: {
      total: keywords?.length ?? 0,
      inTop10: keywords?.filter(k => k.in_top_10).length ?? 0,
      improved: keywords?.filter(k => k.position_current && k.position_previous && k.position_current < k.position_previous).length ?? 0,
    },
    articles: {
      total: articles?.length ?? 0,
      published: articles?.filter(a => a.status === "published").length ?? 0,
      avgScore: articles?.length ? Math.round(articles.reduce((a, b) => a + b.content_score, 0) / articles.length) : 0,
    },
    achievements: achievements ?? [],
    generatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      client_site_id: siteId,
      type,
      data: reportData,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}
