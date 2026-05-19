/**
 * Standalone smoke test pro pipeline de slug-dedup do articleToMarkdown.
 * Replica a logica do src/lib/integrations/article-to-markdown.ts pra exercitar
 * sem bundler. Cenario 5.1 do spec.
 *
 * Uso: node scripts/qa/slug-dedup-test.mjs
 */
import TurndownService from "turndown";

function toKebabSlug(input) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeYamlDouble(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function firstSentence(html, maxLen = 160) {
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

function firstImageUrl(html) {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

async function resolveUniqueSlug(base, exists) {
  if (!(await exists(base))) return base;
  for (let i = 1; i <= 5; i++) {
    const candidate = `${base}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error("slug_conflict");
}

async function articleToMarkdown(article, opts) {
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

  const lines = [
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

// -------- TESTS --------
const tests = [];
let pass = 0, fail = 0;
function assert(cond, label, detail = "") {
  tests.push({ ok: !!cond, label, detail });
  if (cond) pass++; else fail++;
}
const neverExists = async () => false;
const alwaysExists = async () => true;
const existsSet = (set) => async (slug) => set.has(slug);

{
  const md = await articleToMarkdown(
    { title: "Como crescer no SEO", content: "<p>conteudo</p>", meta_description: "descricao", keyword: "seo" },
    { existingSlugs: neverExists },
  );
  assert(md.slug === "como-crescer-no-seo", "T1 slug base livre", `got=${md.slug}`);
  assert(md.filePath === "src/content/blog/como-crescer-no-seo.md", "T1 filePath");
}

{
  const md = await articleToMarkdown(
    { title: "Olá! Você é #1?", content: "<p>x</p>", meta_description: null, keyword: null },
    { existingSlugs: neverExists },
  );
  assert(md.slug === "ola-voce-e-1", "T2 strip acentos + special chars", `got=${md.slug}`);
}

{
  const md = await articleToMarkdown(
    { title: "Post Teste", content: "<p>x</p>", meta_description: null, keyword: null },
    { existingSlugs: existsSet(new Set(["post-teste"])) },
  );
  assert(md.slug === "post-teste-1", "T3 dedup 1 colisao → -1", `got=${md.slug}`);
}

{
  const md = await articleToMarkdown(
    { title: "Post Teste", content: "<p>x</p>", meta_description: null, keyword: null },
    { existingSlugs: existsSet(new Set(["post-teste", "post-teste-1", "post-teste-2"])) },
  );
  assert(md.slug === "post-teste-3", "T4 dedup 3 colisoes → -3", `got=${md.slug}`);
}

{
  let threw = null;
  try {
    await articleToMarkdown(
      { title: "Post Teste", content: "<p>x</p>", meta_description: null, keyword: null },
      { existingSlugs: alwaysExists },
    );
  } catch (e) { threw = e; }
  assert(threw?.message === "slug_conflict", "T5 6 colisoes → throw slug_conflict", `threw=${threw?.message}`);
}

{
  const md = await articleToMarkdown(
    { title: null, content: "<p>x</p>", meta_description: null, keyword: "fallback-key" },
    { existingSlugs: neverExists },
  );
  assert(md.slug === "fallback-key", "T6 fallback pra keyword");
}

{
  const md = await articleToMarkdown(
    { title: null, content: "<p>x</p>", meta_description: null, keyword: null },
    { existingSlugs: neverExists },
  );
  assert(md.slug === "post", "T7 fallback 'post'");
}

{
  const md = await articleToMarkdown(
    { title: "Com imagem", content: '<p>texto <img src="https://example.com/img.jpg" alt="x" /></p>', meta_description: "desc", keyword: "key" },
    { existingSlugs: neverExists },
  );
  assert(md.content.includes('heroImage: "https://example.com/img.jpg"'), "T8 heroImage extraida");
  assert(md.content.includes('keyword: "key"'), "T8 keyword no frontmatter");
}

{
  const md = await articleToMarkdown(
    { title: "Sem imagem", content: "<p>so texto</p>", meta_description: "desc", keyword: null },
    { existingSlugs: neverExists },
  );
  assert(!md.content.includes("heroImage:"), "T9 sem heroImage quando nao tem <img>");
  assert(!md.content.includes("keyword:"), "T9 sem keyword quando null");
}

{
  const md = await articleToMarkdown(
    { title: 'Titulo com "aspas"', content: "<p>x</p>", meta_description: null, keyword: null },
    { existingSlugs: neverExists },
  );
  assert(md.content.includes('title: "Titulo com \\"aspas\\""'), "T10 escapa aspas duplas no YAML", md.content.split("\n")[1]);
}

{
  const md = await articleToMarkdown(
    { title: "Headings", content: "<h2>Subt</h2><p>par</p>", meta_description: null, keyword: null },
    { existingSlugs: neverExists },
  );
  assert(md.content.includes("## Subt"), "T11 turndown atx heading");
}

{
  const md = await articleToMarkdown(
    { title: "  ---trim___me!!! ", content: "<p>x</p>", meta_description: null, keyword: null },
    { existingSlugs: neverExists },
  );
  assert(md.slug === "trim-me", "T12 trim + kebab limpo", `got=${md.slug}`);
}

// edge: title vazio mas keyword com so caracter especial
{
  const md = await articleToMarkdown(
    { title: "", content: "<p>x</p>", meta_description: null, keyword: "!!!" },
    { existingSlugs: neverExists },
  );
  // toKebabSlug("!!!") → "" → fallback "post"
  assert(md.slug === "post", "T13 keyword so caractere → fallback post", `got=${md.slug}`);
}

// edge: body com code block
{
  const md = await articleToMarkdown(
    { title: "Code", content: "<pre><code>const x = 1;</code></pre>", meta_description: null, keyword: null },
    { existingSlugs: neverExists },
  );
  assert(md.content.includes("```") || md.content.includes("    const"), "T14 turndown fenced code style", md.content);
}

console.log("\n=== Slug dedup + articleToMarkdown smoke ===\n");
for (const t of tests) {
  const tag = t.ok ? "[ok]" : "[X] ";
  const detail = t.ok ? "" : `  → ${t.detail}`;
  console.log(`${tag} ${t.label}${detail}`);
}
console.log(`\nTotal: ${pass} passed / ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
