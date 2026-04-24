import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    // Check if file exists (to get SHA for updates)
    let sha: string | undefined;
    try {
      const existsRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
        headers: { Authorization: `Bearer ${site.github_token}` },
      });
      if (existsRes.ok) {
        const existsData = await existsRes.json();
        sha = existsData.sha;
      }
    } catch { /* file doesn't exist, that's fine */ }

    // Create or update file
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${site.github_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: commitMessage ?? `Add article: ${filePath}`,
        content: Buffer.from(content).toString("base64"),
        ...(sha ? { sha } : {}),
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      return NextResponse.json({ error: errData.message ?? `GitHub error: ${res.status}` });
    }

    const data = await res.json();

    return NextResponse.json({
      success: true,
      url: data.content?.html_url,
      sha: data.content?.sha,
      message: `Artigo publicado em ${repo}/${filePath}`,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
