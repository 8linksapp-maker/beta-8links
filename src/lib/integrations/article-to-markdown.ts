import TurndownService from "turndown";

export type ArticleForMarkdown = {
  title: string | null;
  content: string | null;
  meta_description: string | null;
  keyword: string | null;
};

export type MarkdownArtifact = {
  slug: string;
  filePath: string;
  content: string;
};

function toKebabSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeYamlDouble(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function firstSentence(html: string, maxLen = 160): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";

  const dot = text.search(/[.!?](\s|$)/);
  const candidate = dot > 0 ? text.slice(0, dot + 1) : text;
  if (candidate.length <= maxLen) return candidate;
  const cut = candidate.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxLen * 0.5 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

function firstImageUrl(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

async function resolveUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await exists(base))) return base;
  for (let i = 1; i <= 5; i++) {
    const candidate = `${base}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error("slug_conflict");
}

export async function articleToMarkdown(
  article: ArticleForMarkdown,
  opts: { existingSlugs: (slug: string) => Promise<boolean> },
): Promise<MarkdownArtifact> {
  const seed = (article.title?.trim() || article.keyword?.trim() || "post").trim();
  const baseSlug = toKebabSlug(seed) || "post";
  const slug = await resolveUniqueSlug(baseSlug, opts.existingSlugs);

  const html = article.content || "";
  const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
  const body = td.turndown(html).trim();

  const title = (article.title || article.keyword || "Sem titulo").trim();
  const description = (article.meta_description?.trim() || firstSentence(html)).slice(0, 160);
  const pubDate = new Date().toISOString();
  const heroImage = firstImageUrl(html);
  const keyword = article.keyword?.trim() || null;

  const lines: string[] = [
    "---",
    `title: "${escapeYamlDouble(title)}"`,
    `description: "${escapeYamlDouble(description)}"`,
    `pubDate: "${pubDate}"`,
  ];
  if (heroImage) lines.push(`heroImage: "${escapeYamlDouble(heroImage)}"`);
  if (keyword) lines.push(`keyword: "${escapeYamlDouble(keyword)}"`);
  lines.push("---", "", body, "");

  return {
    slug,
    filePath: `src/content/blog/${slug}.md`,
    content: lines.join("\n"),
  };
}
