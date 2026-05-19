import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { commitFileToRepo, GitHubAuthError, GitHubRepoError } from "@/lib/integrations/github";

/**
 * POST /api/integrations/github-publish
 * Publish a markdown file to a GitHub repo (for Astro, Next.js, Hugo, etc.)
 */
export async function POST(request: Request) {
  const { siteId, repo, filePath, content, commitMessage } = await request.json();

  if (!siteId || !repo || !filePath || !content) {
    return NextResponse.json({ error: "siteId, repo, filePath e content são obrigatórios" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: site } = await supabase.from("client_sites").select("github_token").eq("id", siteId).single();
  if (!site?.github_token) return NextResponse.json({ error: "GitHub not connected" });

  try {
    const result = await commitFileToRepo({
      token: site.github_token,
      repo,
      filePath,
      content,
      commitMessage: commitMessage ?? `Add article: ${filePath}`,
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      sha: result.sha,
      message: `Artigo publicado em ${repo}/${filePath}`,
    });
  } catch (error) {
    if (error instanceof GitHubAuthError) {
      return NextResponse.json({ error: "Sua conexão com GitHub venceu. Reconecte em Integrações." });
    }
    if (error instanceof GitHubRepoError) {
      return NextResponse.json({ error: "Não conseguimos acessar o repositório. Confira se ele existe e se você tem permissão." });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) });
  }
}
