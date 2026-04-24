"use server";

import { createClient } from "@/lib/supabase/server";

export async function getSites() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("client_sites")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function addSite(url: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check plan limits
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const { data: plan } = await supabase
    .from("plans")
    .select("sites_limit")
    .eq("id", profile?.plan_id)
    .single();

  const { count } = await supabase
    .from("client_sites")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (count && plan && count >= plan.sites_limit) {
    return { error: `Limite de ${plan.sites_limit} sites atingido. Faça upgrade do plano.` };
  }

  const { data, error } = await supabase
    .from("client_sites")
    .insert({ user_id: user.id, url })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function deleteSite(siteId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_sites")
    .delete()
    .eq("id", siteId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateSite(siteId: string, updates: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_sites")
    .update(updates)
    .eq("id", siteId);

  if (error) return { error: error.message };
  return { success: true };
}
