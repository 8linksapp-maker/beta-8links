import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/integrations/github-content?siteId=xxx
 * List content files from GitHub repo (for Astro/Next/Hugo sites).
 * Searches recursively for .md and .mdx files.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: site } = await supabase.from("client_sites").select("github_token, github_repo").eq("id", siteId).single();

  if (!site?.github_token || !site?.github_repo) {
    console.log("[GH Content] Missing:", { hasToken: !!site?.github_token, repo: site?.github_repo });
    return NextResponse.json({ error: "GitHub not connected or no repo selected" });
  }

  const token = site.github_token;
  const repo = site.github_repo;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };

  // Directories to search, ordered by priority
  const contentDirs = [
    "src/content/blog",
    "src/content/posts",
    "src/content",
    "content/blog",
    "content/posts",
    "content",
    "posts",
    "blog",
    "_posts",
    "src/pages/blog",
    "src/pages/posts",
    "pages/blog",
  ];

  type Article = { name: string; path: string; url: string; size: number };
  let articles: Article[] = [];

  // Helper to extract .md/.mdx files from a directory listing, with one level of recursion
  async function scanDir(dir: string): Promise<Article[]> {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/${dir}`, { headers });
      if (!res.ok) return [];
      const files = await res.json();
      if (!Array.isArray(files)) return [];

      const mdFiles: Article[] = files
        .filter((f: any) => f.type === "file" && (f.name.endsWith(".md") || f.name.endsWith(".mdx")))
        .map((f: any) => ({
          name: f.name.replace(/\.(md|mdx)$/, "").replace(/-/g, " "),
          path: f.path,
          url: f.html_url,
          size: f.size,
        }));

      // Check subdirectories (one level deep) — common for Astro content collections
      const subdirs = files.filter((f: any) => f.type === "dir");
      const subResults = await Promise.all(
        subdirs.slice(0, 20).map(async (sub: any) => {
          try {
            const subRes = await fetch(`https://api.github.com/repos/${repo}/contents/${sub.path}`, { headers });
            if (!subRes.ok) return [];
            const subFiles = await subRes.json();
            if (!Array.isArray(subFiles)) return [];
            return subFiles
              .filter((f: any) => f.type === "file" && (f.name.endsWith(".md") || f.name.endsWith(".mdx")))
              .map((f: any) => ({
                name: f.name.replace(/\.(md|mdx)$/, "").replace(/-/g, " "),
                path: f.path,
                url: f.html_url,
                size: f.size,
              }));
          } catch { return []; }
        })
      );

      return [...mdFiles, ...subResults.flat()];
    } catch { return []; }
  }

  // Try each content directory until we find articles
  for (const dir of contentDirs) {
    const found = await scanDir(dir);
    if (found.length > 0) {
      articles = found;
      console.log(`[GH Content] Found ${found.length} articles in ${dir} for repo ${repo}`);
      break;
    }
  }

  // If nothing found in known dirs, try the repo root for any .md files (excluding README)
  if (articles.length === 0) {
    try {
      const rootRes = await fetch(`https://api.github.com/repos/${repo}/contents/`, { headers });
      if (rootRes.ok) {
        const rootFiles = await rootRes.json();
        if (Array.isArray(rootFiles)) {
          articles = rootFiles
            .filter((f: any) => f.type === "file" && (f.name.endsWith(".md") || f.name.endsWith(".mdx")) && f.name.toLowerCase() !== "readme.md")
            .map((f: any) => ({
              name: f.name.replace(/\.(md|mdx)$/, "").replace(/-/g, " "),
              path: f.path,
              url: f.html_url,
              size: f.size,
            }));
        }
      }
    } catch {}
  }

  if (articles.length === 0) {
    console.log(`[GH Content] No articles found in repo ${repo}. Searched: ${contentDirs.join(", ")}`);
  }

  return NextResponse.json({
    repo: repo,
    articles,
    total: articles.length,
    source: "github",
  });
}
