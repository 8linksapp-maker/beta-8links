"use server";

import { createClient } from "@/lib/supabase/server";

export async function getResellerClients() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("reseller_clients")
    .select("*, client_sites(url, da_current, seo_score, phase)")
    .eq("reseller_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function addResellerClient(name: string, email: string, phone: string, siteUrl: string, monthlyCharge: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Create site for the client
  const { data: site, error: siteError } = await supabase
    .from("client_sites")
    .insert({ user_id: user.id, url: siteUrl })
    .select()
    .single();

  if (siteError || !site) return { error: siteError?.message ?? "Failed to create site" };

  // Create reseller client record
  const { data, error } = await supabase
    .from("reseller_clients")
    .insert({
      reseller_id: user.id,
      name,
      email,
      phone,
      client_site_id: site.id,
      monthly_charge: monthlyCharge,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function getResellerStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clients } = await supabase
    .from("reseller_clients")
    .select("monthly_charge")
    .eq("reseller_id", user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const { data: plan } = await supabase
    .from("plans")
    .select("price_brl")
    .eq("id", profile?.plan_id)
    .single();

  const totalRevenue = clients?.reduce((acc, c) => acc + Number(c.monthly_charge), 0) ?? 0;
  const planCost = plan?.price_brl ?? 0;

  return {
    clientCount: clients?.length ?? 0,
    totalRevenue,
    planCost,
    profit: totalRevenue - planCost,
  };
}
