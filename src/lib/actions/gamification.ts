"use server";

import { createClient } from "@/lib/supabase/server";
import { ACHIEVEMENTS } from "@/lib/constants";
import type { AchievementType } from "@/lib/types";

export async function getAchievements() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("achievements")
    .select("*")
    .eq("user_id", user.id)
    .order("unlocked_at", { ascending: false });

  return data ?? [];
}

export async function checkAndUnlockAchievements() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get current state
  const [
    { count: backlinksCount },
    { count: articlesCount },
    { data: sites },
    { data: existing },
  ] = await Promise.all([
    supabase.from("backlinks").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "published"),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "published"),
    supabase.from("client_sites").select("da_current, seo_score").eq("user_id", user.id),
    supabase.from("achievements").select("achievement_type").eq("user_id", user.id),
  ]);

  const unlocked = new Set(existing?.map(a => a.achievement_type) ?? []);
  const maxDa = Math.max(...(sites?.map(s => s.da_current) ?? [0]));
  const newAchievements: AchievementType[] = [];

  // Check each achievement
  const checks: [boolean, AchievementType][] = [
    [(backlinksCount ?? 0) >= 1, "first_backlink"],
    [maxDa >= 10, "da_10"],
    [maxDa >= 20, "da_20"],
    [maxDa >= 30, "da_30"],
    [maxDa >= 50, "da_50"],
    [(backlinksCount ?? 0) >= 100, "backlinks_100"],
    [(backlinksCount ?? 0) >= 500, "backlinks_500"],
    [(articlesCount ?? 0) >= 1, "first_article"],
    [(articlesCount ?? 0) >= 10, "articles_10"],
  ];

  for (const [condition, type] of checks) {
    if (condition && !unlocked.has(type)) {
      const def = ACHIEVEMENTS.find(a => a.type === type);
      if (def) {
        newAchievements.push(type);
        await supabase.from("achievements").insert({
          user_id: user.id,
          achievement_type: type,
          label: def.label,
          description: def.description,
          icon: def.icon,
        });
      }
    }
  }

  return newAchievements;
}

export async function calculateSeoScore(siteId: string): Promise<number> {
  const supabase = await createClient();

  const [
    { data: site },
    { count: backlinksCount },
    { data: keywords },
    { count: articlesCount },
  ] = await Promise.all([
    supabase.from("client_sites").select("da_current").eq("id", siteId).single(),
    supabase.from("backlinks").select("*", { count: "exact", head: true }).eq("client_site_id", siteId).eq("status", "published"),
    supabase.from("keywords").select("in_top_10").eq("client_site_id", siteId),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("client_site_id", siteId).eq("status", "published"),
  ]);

  const da = site?.da_current ?? 0;
  const kwTop10 = keywords?.filter(k => k.in_top_10).length ?? 0;
  const kwTotal = keywords?.length ?? 1;

  // Score calculation: DA (25%) + Keywords (25%) + Backlinks (25%) + Content (25%)
  const daScore = Math.min(100, (da / 50) * 100) * 0.25;
  const kwScore = Math.min(100, (kwTop10 / Math.max(kwTotal, 1)) * 100) * 0.25;
  const blScore = Math.min(100, ((backlinksCount ?? 0) / 100) * 100) * 0.25;
  const ctScore = Math.min(100, ((articlesCount ?? 0) / 10) * 100) * 0.25;

  return Math.round(daScore + kwScore + blScore + ctScore);
}
