import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/articles/[id]/publish-status
 * Returns which integrations are connected on the article's site so the UI can
 * decide which modal to open before calling POST /publish.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: article } = await supabase
    .from("articles")
    .select("client_site_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!article) return NextResponse.json({ error: "Artigo não encontrado" }, { status: 404 });

  const { data: site } = await supabase
    .from("client_sites")
    .select("id, url, wp_url, wp_username, wp_app_password, github_token, github_repo")
    .eq("id", article.client_site_id)
    .single();
  if (!site) return NextResponse.json({ error: "Site não encontrado" }, { status: 404 });

  return NextResponse.json({
    hasWp: !!(site.wp_url && site.wp_username && site.wp_app_password),
    hasGithub: !!(site.github_token && site.github_repo),
    siteId: site.id,
    siteUrl: site.url,
  });
}
