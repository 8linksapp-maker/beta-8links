import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/integrations/github-repos?siteId=xxx
 * List ALL repos the user has access to (personal + orgs).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: site } = await supabase.from("client_sites").select("github_token").eq("id", siteId).single();

  if (!site?.github_token) return NextResponse.json({ error: "GitHub not connected" });

  const headers = { Authorization: `Bearer ${site.github_token}`, Accept: "application/vnd.github+json" };

  try {
    // Fetch personal repos + org repos + repos with push access
    const [userRes, installationRes] = await Promise.all([
      fetch("https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member", { headers }),
      fetch("https://api.github.com/user/repos?per_page=100&sort=updated&type=all", { headers }),
    ]);

    const userRepos = userRes.ok ? await userRes.json() : [];
    const allRepos = installationRes.ok ? await installationRes.json() : [];

    // Merge and deduplicate
    const repoMap = new Map<string, any>();
    for (const r of [...(Array.isArray(userRepos) ? userRepos : []), ...(Array.isArray(allRepos) ? allRepos : [])]) {
      if (r.full_name && !repoMap.has(r.full_name)) {
        repoMap.set(r.full_name, {
          id: r.id,
          fullName: r.full_name,
          name: r.name,
          private: r.private,
          defaultBranch: r.default_branch,
          updatedAt: r.updated_at,
        });
      }
    }

    const repos = Array.from(repoMap.values()).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json({ repos, total: repos.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
