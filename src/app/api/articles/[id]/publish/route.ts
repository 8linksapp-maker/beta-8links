import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { articleToMarkdown } from "@/lib/integrations/article-to-markdown";
import { blogSlugExists, commitFileToRepo, GitHubAuthError, GitHubRepoError } from "@/lib/integrations/github";

type ArticleRow = {
  id: string;
  title: string | null;
  content: string | null;
  meta_description: string | null;
  keyword: string | null;
  status: string | null;
  client_site_id: string;
};

type SiteRow = {
  id: string;
  url: string;
  wp_url: string | null;
  wp_username: string | null;
  wp_app_password: string | null;
  github_token: string | null;
  github_repo: string | null;
  github_username: string | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * POST /api/articles/[id]/publish
 * Publishes an article to the integration configured on its client_site.
 * Routes WordPress vs GitHub based on what's connected (or body.via override).
 * Returns 400 with code "no_integration" / "choose_integration" / "wp_not_configured"
 * so the UI can open the right just-in-time modal.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: articleId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { via?: "wordpress" | "github" };

  const { data: article } = await supabase
    .from("articles")
    .select("id, title, content, meta_description, keyword, status, client_site_id")
    .eq("id", articleId)
    .eq("user_id", user.id)
    .single<ArticleRow>();

  if (!article) return NextResponse.json({ error: "Artigo não encontrado" }, { status: 404 });
  if (!article.content) {
    return NextResponse.json({ error: "Esse artigo não tem conteúdo pra publicar" }, { status: 400 });
  }

  const { data: site } = await supabase
    .from("client_sites")
    .select("id, url, wp_url, wp_username, wp_app_password, github_token, github_repo, github_username")
    .eq("id", article.client_site_id)
    .single<SiteRow>();

  if (!site) return NextResponse.json({ error: "Site não encontrado" }, { status: 404 });

  const hasWp = !!(site.wp_url && site.wp_username && site.wp_app_password);
  const hasGithub = !!(site.github_token && site.github_repo);

  let chosen: "wordpress" | "github" | null = null;
  if (body.via === "wordpress" || body.via === "github") {
    chosen = body.via;
  } else if (hasWp && !hasGithub) {
    chosen = "wordpress";
  } else if (hasGithub && !hasWp) {
    chosen = "github";
  } else if (hasWp && hasGithub) {
    return NextResponse.json({
      error: "Esse site tem mais de uma integração. Escolha onde publicar.",
      code: "choose_integration",
      available: ["wordpress", "github"],
    }, { status: 400 });
  } else {
    return NextResponse.json({
      error: "Conecte WordPress ou GitHub antes de publicar.",
      code: "no_integration",
      siteId: site.id,
      siteUrl: site.url,
    }, { status: 400 });
  }

  if (chosen === "wordpress") {
    if (!hasWp) {
      return NextResponse.json({
        error: "Conecte seu WordPress antes de publicar",
        code: "wp_not_configured",
        siteId: site.id,
        siteUrl: site.url,
      }, { status: 400 });
    }
    return publishToWordPress(supabase, article, site);
  }

  if (!hasGithub) {
    return NextResponse.json({
      error: "Conecte o GitHub antes de publicar.",
      code: "no_integration",
      siteId: site.id,
      siteUrl: site.url,
    }, { status: 400 });
  }
  return publishToGithub(supabase, article, site);
}

async function publishToWordPress(supabase: SupabaseServerClient, article: ArticleRow, site: SiteRow) {
  const baseUrl = site.wp_url!.replace(/\/+$/, "");
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

    await supabase
      .from("articles")
      .update({
        status: "published",
        published_url: publishedUrl,
        published_at: new Date().toISOString(),
        wp_post_id: post.id,
      })
      .eq("id", article.id);

    return NextResponse.json({ success: true, publishedUrl, postId: post.id, via: "wordpress" });
  } catch (error) {
    console.error("[publish] WP connection failed:", error);
    return NextResponse.json({
      error: "Não conseguimos falar com seu WordPress. Verifique se está no ar.",
    }, { status: 502 });
  }
}

async function publishToGithub(supabase: SupabaseServerClient, article: ArticleRow, site: SiteRow) {
  const token = site.github_token!;
  const repo = site.github_repo!;

  try {
    const md = await articleToMarkdown(article, {
      existingSlugs: (slug) => blogSlugExists(token, repo, slug),
    });

    const commitMessage = `Publica artigo: ${article.title || article.keyword || md.slug}`;

    await commitFileToRepo({
      token,
      repo,
      filePath: md.filePath,
      content: md.content,
      commitMessage,
    });

    const base = site.url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const publishedUrl = `https://${base}/blog/${md.slug}/`;

    await supabase
      .from("articles")
      .update({
        status: "published",
        published_url: publishedUrl,
        published_at: new Date().toISOString(),
      })
      .eq("id", article.id);

    return NextResponse.json({ success: true, publishedUrl, via: "github" });
  } catch (error) {
    if (error instanceof GitHubAuthError) {
      return NextResponse.json({
        error: "Sua conexão com GitHub venceu. Reconecte em Integrações.",
        code: "github_auth_failed",
      }, { status: 401 });
    }
    if (error instanceof GitHubRepoError) {
      return NextResponse.json({
        error: "Não conseguimos acessar o repositório. Confira se ele existe e se você tem permissão.",
        code: "github_repo_error",
      }, { status: 502 });
    }
    if (error instanceof Error && error.message === "slug_conflict") {
      return NextResponse.json({
        error: "Já existe artigo com nome parecido no repo. Mude o título e tente de novo.",
        code: "slug_conflict",
      }, { status: 409 });
    }
    console.error("[publish] GitHub publish failed:", error);
    return NextResponse.json({
      error: "Não conseguimos publicar no GitHub agora. Tente de novo em alguns segundos.",
    }, { status: 502 });
  }
}
