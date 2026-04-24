import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/integrations/save-wordpress
 * Save WordPress credentials after successful test.
 */
export async function POST(request: Request) {
  const { siteId, wpUrl, wpUsername, wpAppPassword } = await request.json();

  if (!siteId || !wpUrl || !wpUsername || !wpAppPassword) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Verify the site belongs to the user
  const { data: site } = await supabase
    .from("client_sites")
    .select("id")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .single();

  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const { error } = await supabase
    .from("client_sites")
    .update({
      wp_url: wpUrl.replace(/\/+$/, ""),
      wp_username: wpUsername,
      wp_app_password: wpAppPassword, // TODO: encrypt before storing
    })
    .eq("id", siteId);

  if (error) return NextResponse.json({ error: error.message });

  return NextResponse.json({ success: true });
}
