"use server";

import { createClient } from "@/lib/supabase/server";

export async function getUpcomingSessions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("club_sessions")
    .select("*, club_candidates(id, user_id, selected, profiles(name))")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(3);

  return data ?? [];
}

export async function getReplays(search?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("club_replays")
    .select("*, club_sessions(title, scheduled_at)")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`title.ilike.%${search}%,niche.ilike.%${search}%,site_analyzed.ilike.%${search}%`);
  }

  const { data } = await query;
  return data ?? [];
}

export async function submitCandidature(sessionId: string, siteId: string, goal: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check if already submitted for this session
  const { data: existing } = await supabase
    .from("club_candidates")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (existing) return { error: "Você já se candidatou para esta sessão." };

  const { error } = await supabase.from("club_candidates").insert({
    session_id: sessionId,
    user_id: user.id,
    client_site_id: siteId,
    goal,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function getMyCandidatures() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("club_candidates")
    .select("*, club_sessions(title, scheduled_at, status)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}
