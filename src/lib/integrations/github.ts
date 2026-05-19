/**
 * GitHub Contents API helpers for committing markdown files to a repo.
 * Shared between /api/integrations/github-publish and /api/articles/[id]/publish.
 */

export class GitHubAuthError extends Error {
  constructor(message = "GitHub auth failed") {
    super(message);
    this.name = "GitHubAuthError";
  }
}

export class GitHubRepoError extends Error {
  constructor(message = "GitHub repo error") {
    super(message);
    this.name = "GitHubRepoError";
  }
}

export type CommitFileArgs = {
  token: string;
  repo: string;
  filePath: string;
  content: string;
  commitMessage: string;
};

export type CommitFileResult = {
  url: string | null;
  sha: string | null;
};

async function getExistingSha(token: string, repo: string, filePath: string): Promise<string | undefined> {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 200) {
    const data = await res.json();
    return data.sha as string | undefined;
  }
  if (res.status === 404) return undefined;
  if (res.status === 401) throw new GitHubAuthError();
  if (res.status === 403) throw new GitHubRepoError();
  const text = await res.text().catch(() => "");
  throw new Error(`GitHub contents lookup failed (${res.status}): ${text.slice(0, 200)}`);
}

/**
 * Returns true if `src/content/blog/{slug}.md` already exists in the repo.
 * Used by article-to-markdown for slug dedup.
 */
export async function blogSlugExists(token: string, repo: string, slug: string): Promise<boolean> {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/src/content/blog/${slug}.md`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 200) return true;
  if (res.status === 404) return false;
  if (res.status === 401) throw new GitHubAuthError();
  if (res.status === 403) throw new GitHubRepoError();
  const text = await res.text().catch(() => "");
  throw new Error(`GitHub slug check failed (${res.status}): ${text.slice(0, 200)}`);
}

/**
 * Creates or updates a single file in a GitHub repo.
 * Throws GitHubAuthError on 401, GitHubRepoError on 403/404, generic Error otherwise.
 */
export async function commitFileToRepo({ token, repo, filePath, content, commitMessage }: CommitFileArgs): Promise<CommitFileResult> {
  const sha = await getExistingSha(token, repo, filePath);

  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: commitMessage,
      content: Buffer.from(content).toString("base64"),
      ...(sha ? { sha } : {}),
    }),
  });

  if (res.status === 401) throw new GitHubAuthError();
  if (res.status === 403 || res.status === 404) throw new GitHubRepoError();

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = (errData?.message as string | undefined) ?? `GitHub error: ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  return {
    url: (data?.content?.html_url as string | undefined) ?? null,
    sha: (data?.content?.sha as string | undefined) ?? null,
  };
}
