import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/integrations/save-wordpress
 * Save WordPress credentials. The wp_url is ALWAYS the registered site URL —
 * we ignore any wp_url from the request body to prevent users from connecting
 * a site they don't own.
 */
export async function POST(request: Request) {
  const { siteId, wpUsername, wpAppPassword } = await request.json();

  if (!siteId || !wpUsername || !wpAppPassword) {
    return NextResponse.json({ error: "Preencha usuário e senha de aplicativo." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Verify ownership AND pull the site's registered URL — that's what we save.
  const { data: site } = await supabase
    .from("client_sites")
    .select("id, url")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .single();

  if (!site) return NextResponse.json({ error: "Site não encontrado" }, { status: 404 });

  const wpUrl = (site.url ?? "").replace(/\/+$/, "");
  if (!wpUrl) {
    return NextResponse.json({ error: "Esse site não tem URL cadastrada." }, { status: 400 });
  }

  const { error } = await supabase
    .from("client_sites")
    .update({
      wp_url: wpUrl,
      wp_username: wpUsername,
      wp_app_password: wpAppPassword, // TODO: encrypt before storing
    })
    .eq("id", siteId);

  if (error) return NextResponse.json({ error: error.message });

  return NextResponse.json({ success: true });
}
