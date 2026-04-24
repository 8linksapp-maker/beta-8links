"use server";

import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Unauthorized");

  return { supabase, user };
}

export async function getAdminStats() {
  const { supabase } = await requireAdmin();

  // Total users
  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  // Active subscriptions
  const { count: activeSubscriptions } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .not("plan_id", "is", null);

  // MRR - sum of active plan prices
  const { data: activePlans } = await supabase
    .from("profiles")
    .select("plan_id, plans(price)")
    .not("plan_id", "is", null);

  const mrr = activePlans?.reduce((sum, p) => {
    const plan = p.plans as unknown as { price: number } | null;
    return sum + (plan?.price ?? 0);
  }, 0) ?? 0;

  // Churn rate (mock - will be calculated from subscription history later)
  const churnRate = 4.2;

  return {
    totalUsers: totalUsers ?? 0,
    mrr,
    churnRate,
    activeSubscriptions: activeSubscriptions ?? 0,
  };
}

export async function getAllUsers(search?: string) {
  const { supabase } = await requireAdmin();

  let query = supabase
    .from("profiles")
    .select("*, plans(name, price)")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data } = await query;
  return data ?? [];
}

export async function updateUserRole(userId: string, role: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getNetworkSites() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("network_sites")
    .select("*")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function addNetworkSite(domain: string, niche: string, da: number, type: string) {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("network_sites")
    .insert({ domain, niche, da, type })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function deleteNetworkSite(siteId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("network_sites")
    .delete()
    .eq("id", siteId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getEventLogs(limit: number = 50) {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("event_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
