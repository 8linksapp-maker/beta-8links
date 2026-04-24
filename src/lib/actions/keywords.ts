"use server";

import { createClient } from "@/lib/supabase/server";

export async function getKeywords(siteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("keywords")
    .select("*")
    .eq("client_site_id", siteId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function addKeyword(siteId: string, keyword: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("keywords")
    .insert({
      client_site_id: siteId,
      user_id: user.id,
      keyword,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function deleteKeyword(keywordId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("keywords")
    .delete()
    .eq("id", keywordId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getKeywordStats(siteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: keywords } = await supabase
    .from("keywords")
    .select("position")
    .eq("client_site_id", siteId);

  if (!keywords) return null;

  const total = keywords.length;
  const withPosition = keywords.filter((k) => k.position != null);
  const inTop10 = withPosition.filter((k) => k.position <= 10).length;
  const inPage1 = withPosition.filter((k) => k.position <= 10).length;
  const avgPosition = withPosition.length > 0
    ? Math.round(withPosition.reduce((acc, k) => acc + k.position, 0) / withPosition.length)
    : 0;

  return { total, inTop10, inPage1, avgPosition };
}
