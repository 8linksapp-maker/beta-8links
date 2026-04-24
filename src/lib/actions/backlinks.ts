"use server";

import { createClient } from "@/lib/supabase/server";

export async function getBacklinks(siteId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("backlinks")
    .select("*, network_sites(domain, niche, da)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (siteId) {
    query = query.eq("client_site_id", siteId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getBacklinkStats(siteId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let query = supabase
    .from("backlinks")
    .select("status, da_at_creation")
    .eq("user_id", user.id);

  if (siteId) {
    query = query.eq("client_site_id", siteId);
  }

  const { data: backlinks } = await query;
  if (!backlinks) return null;

  const total = backlinks.length;
  const published = backlinks.filter(b => b.status === "published" || b.status === "indexed").length;
  const indexed = backlinks.filter(b => b.status === "indexed").length;
  const avgDa = backlinks.length > 0
    ? Math.round(backlinks.reduce((acc, b) => acc + (b.da_at_creation ?? 0), 0) / backlinks.length)
    : 0;

  // This month count
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = backlinks.filter(b => new Date(b.status !== "queued" ? now : now) >= firstOfMonth).length;

  return { total, published, indexed, avgDa, thisMonth };
}
