"use server";

import { createClient } from "@/lib/supabase/server";

export async function getArticles(siteId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("articles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (siteId) {
    query = query.eq("client_site_id", siteId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function createArticle(siteId: string, keyword: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("articles")
    .insert({
      user_id: user.id,
      client_site_id: siteId,
      keyword,
      status: "draft",
      credits_used: 10,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function updateArticle(articleId: string, updates: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("articles")
    .update(updates)
    .eq("id", articleId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteArticle(articleId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("articles")
    .delete()
    .eq("id", articleId);

  if (error) return { error: error.message };
  return { success: true };
}
