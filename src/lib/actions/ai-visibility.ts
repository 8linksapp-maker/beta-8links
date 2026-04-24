"use server";

import { createClient } from "@/lib/supabase/server";

export async function getAIVisibilityChecks(siteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("ai_visibility_checks")
    .select("*")
    .eq("client_site_id", siteId)
    .order("checked_at", { ascending: false });

  return data ?? [];
}

export async function getAIVisibilityScore(siteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: checks } = await supabase
    .from("ai_visibility_checks")
    .select("cited")
    .eq("client_site_id", siteId);

  if (!checks || checks.length === 0) return null;

  const total = checks.length;
  const cited = checks.filter((c) => c.cited === true).length;
  const score = Math.round((cited / total) * 100);

  return { score, cited, total };
}

export async function getAIVisibilityByPlatform(siteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: checks } = await supabase
    .from("ai_visibility_checks")
    .select("platform, cited")
    .eq("client_site_id", siteId);

  if (!checks) return [];

  const platformMap: Record<string, { total: number; cited: number }> = {};

  for (const check of checks) {
    if (!platformMap[check.platform]) {
      platformMap[check.platform] = { total: 0, cited: 0 };
    }
    platformMap[check.platform].total++;
    if (check.cited) {
      platformMap[check.platform].cited++;
    }
  }

  return Object.entries(platformMap).map(([platform, counts]) => ({
    platform,
    total: counts.total,
    cited: counts.cited,
    score: counts.total > 0 ? Math.round((counts.cited / counts.total) * 100) : 0,
  }));
}
