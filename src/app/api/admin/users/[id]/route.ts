import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, name, role, plan_id, subscription_status, created_at, last_active_at")
    .eq("id", id)
    .single();

  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Get sites
  const { data: sites } = await supabase
    .from("client_sites")
    .select("id, url, niche_primary, da_current, created_at, autopilot_active")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  // Get backlinks
  const { data: backlinks } = await supabase
    .from("backlinks")
    .select("id, anchor_text, target_url, article_title, status, published_url, created_at, network_site_id")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    user: {
      id: profile.id,
      name: profile.name || profile.email?.split("@")[0] || "Sem nome",
      email: profile.email,
      plan: profile.plan_id || "starter",
      role: profile.role || "client",
      status: profile.subscription_status || "trialing",
      joined: profile.created_at?.split("T")[0] || "",
      lastActive: profile.last_active_at,
    },
    sites: sites ?? [],
    backlinks: backlinks ?? [],
  });
}
