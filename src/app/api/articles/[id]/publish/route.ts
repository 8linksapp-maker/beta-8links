import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/articles/[id]/publish
 * Publishes an article to WordPress using the credentials saved on its client_site.
 * Returns 400 with code "wp_not_configured" if WP isn't set up — the UI uses this
 * to trigger the just-in-time setup modal.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: articleId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Load article + its site
  const { data: article } = await supabase
    .from("articles")
    .select("id, title, content, meta_description, keyword, status, client_site_id")
    .eq("id", articleId)
    .eq("user_id", user.id)
    .single();

  if (!article) return NextResponse.json({ error: "Artigo não encontrado" }, { status: 404 });
  if (!article.content) {
    return NextResponse.json({ error: "Esse artigo não tem conteúdo pra publicar" }, { status: 400 });
  }

  const { data: site } = await supabase
    .from("client_sites")
    .select("id, url, wp_url, wp_username, wp_app_password")
    .eq("id", article.client_site_id)
    .single();

  if (!site) return NextResponse.json({ error: "Site não encontrado" }, { status: 404 });

  // JIT trigger — UI uses code "wp_not_configured" to open the connect modal
  if (!site.wp_url || !site.wp_username || !site.wp_app_password) {
    return NextResponse.json({
      error: "Conecte seu WordPress antes de publicar",
      code: "wp_not_configured",
      siteId: site.id,
      siteUrl: site.url,
    }, { status: 400 });
  }

  // Publish to WordPress
  const baseUrl = site.wp_url.replace(/\/+$/, "");
  const auth = Buffer.from(`${site.wp_username}:${site.wp_app_password}`).toString("base64");

  try {
    const res = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: article.title || article.keyword,
        content: article.content,
        excerpt: article.meta_description ?? "",
        status: "publish",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[publish] WP rejected (${res.status}):`, text.slice(0, 500));
      if (res.status === 401) {
        return NextResponse.json({
          error: "Sua senha de aplicativo do WordPress venceu. Reconecte em Integrações.",
          code: "wp_auth_failed",
        }, { status: 401 });
      }
      return NextResponse.json({
        error: "Seu WordPress recusou a publicação. Tente reconectar a integração.",
      }, { status: 502 });
    }

    const post = await res.json();
    const publishedUrl = post.link as string;

    // Update article record
    await supabase
      .from("articles")
      .update({
        status: "published",
        published_url: publishedUrl,
        published_at: new Date().toISOString(),
        wp_post_id: post.id,
      })
      .eq("id", articleId);

    return NextResponse.json({ success: true, publishedUrl, postId: post.id });
  } catch (error) {
    console.error("[publish] WP connection failed:", error);
    return NextResponse.json({
      error: "Não conseguimos falar com seu WordPress. Verifique se está no ar.",
    }, { status: 502 });
  }
}
