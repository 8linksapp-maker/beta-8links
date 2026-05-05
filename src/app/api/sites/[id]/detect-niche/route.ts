import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NICHE_VALUES } from "@/lib/niches";

const FETCH_TIMEOUT_MS = 8000;
const FETCH_USER_AGENT = "Mozilla/5.0 (compatible; 8linksBot/1.0; +https://8links.com.br)";
const MAX_PAGES_TO_ANALYZE = 20;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": FETCH_USER_AGENT },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Strip XML/HTML tags and collapse whitespace */
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Try to parse loc URLs from a sitemap.xml body */
function parseSitemapUrls(xml: string, limit: number): string[] {
  const urls: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    const u = match[1].trim();
    if (u && !u.endsWith(".xml")) urls.push(u);
    if (urls.length >= limit) break;
  }
  return urls;
}

/** Pull title + meta description from an HTML body */
function extractPageSignals(html: string): { title: string; description: string; h1: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
    ?? html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

  return {
    title: titleMatch ? stripTags(titleMatch[1]).slice(0, 160) : "",
    description: stripTags(descMatch?.[1] ?? ogDescMatch?.[1] ?? "").slice(0, 240),
    h1: h1Match ? stripTags(h1Match[1]).slice(0, 160) : "",
  };
}

async function findSitemapUrls(siteUrl: string): Promise<string[]> {
  const base = siteUrl.replace(/\/+$/, "");

  // 1) /sitemap.xml direct
  try {
    const res = await fetchWithTimeout(`${base}/sitemap.xml`);
    if (res.ok) {
      const xml = await res.text();
      const urls = parseSitemapUrls(xml, MAX_PAGES_TO_ANALYZE);
      if (urls.length > 0) return urls;
      // Sitemap index — try to fetch first nested sitemap
      const nested = parseSitemapUrls(xml.replace(/<\/?sitemap>/g, ""), 1);
      if (nested.length > 0) {
        const inner = await fetchWithTimeout(nested[0]);
        if (inner.ok) return parseSitemapUrls(await inner.text(), MAX_PAGES_TO_ANALYZE);
      }
    }
  } catch { /* fall through */ }

  // 2) robots.txt → sitemap directive
  try {
    const robotsRes = await fetchWithTimeout(`${base}/robots.txt`);
    if (robotsRes.ok) {
      const robots = await robotsRes.text();
      const sitemapLine = robots.split("\n").find(l => /^\s*sitemap:/i.test(l));
      if (sitemapLine) {
        const sitemapUrl = sitemapLine.replace(/^\s*sitemap:\s*/i, "").trim();
        const inner = await fetchWithTimeout(sitemapUrl);
        if (inner.ok) return parseSitemapUrls(await inner.text(), MAX_PAGES_TO_ANALYZE);
      }
    }
  } catch { /* fall through */ }

  // 3) No sitemap — fall back to homepage
  return [base];
}

async function gatherSiteSignals(siteUrl: string): Promise<{
  signals: Array<{ url: string; title: string; description: string; h1: string }>;
  source: "sitemap" | "homepage" | "none";
}> {
  const urls = await findSitemapUrls(siteUrl);
  const isHomepageOnly = urls.length === 1 && urls[0].replace(/\/+$/, "") === siteUrl.replace(/\/+$/, "");

  const limited = urls.slice(0, MAX_PAGES_TO_ANALYZE);
  const fetched = await Promise.allSettled(
    limited.map(async (url) => {
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      return { url, ...extractPageSignals(html) };
    })
  );

  const signals = fetched
    .filter((r): r is PromiseFulfilledResult<{ url: string; title: string; description: string; h1: string }> =>
      r.status === "fulfilled")
    .map((r) => r.value)
    .filter(s => s.title || s.description || s.h1);

  return {
    signals,
    source: signals.length === 0 ? "none" : isHomepageOnly ? "homepage" : "sitemap",
  };
}

async function classifyNicheWithGPT(
  signals: Array<{ title: string; description: string; h1: string }>,
  description: string | null,
): Promise<{ primary: string; alternates: string[]; confidence: "high" | "medium" | "low" }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const corpus = signals
    .slice(0, 20)
    .map((s, i) => `[${i + 1}] ${s.title}${s.description ? ` — ${s.description}` : ""}${s.h1 ? ` | ${s.h1}` : ""}`)
    .join("\n");

  const userMessage = `Classifique este site brasileiro em UM nicho da lista.

Lista de nichos válidos:
${NICHE_VALUES.join(", ")}

${description ? `Descrição que o usuário deu sobre o site:\n${description}\n\n` : ""}Páginas analisadas:
${corpus}

Devolva JSON puro nesse formato (sem markdown, sem comentários):
{ "primary": "nome do nicho", "alternates": ["até 3 alternativas"], "confidence": "high|medium|low" }

Regras:
- "primary" e "alternates" DEVEM ser um dos valores da lista de nichos
- "alternates" não inclui o "primary"
- "confidence" = high se a maioria das páginas é claramente do mesmo tema
- "confidence" = low se as páginas são muito variadas ou pouco informativas`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Você classifica sites em nichos pré-definidos. Responda apenas com JSON válido." },
        { role: "user", content: userMessage },
      ],
    }),
  });
  const completion = await res.json();
  if (completion.error) throw new Error(completion.error.message ?? "OpenAI error");

  const raw = completion.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);

  const primary = NICHE_VALUES.includes(parsed.primary) ? parsed.primary : NICHE_VALUES[0];
  const alternates = (Array.isArray(parsed.alternates) ? parsed.alternates : [])
    .filter((n: unknown): n is string => typeof n === "string" && NICHE_VALUES.includes(n) && n !== primary)
    .slice(0, 3);
  const confidence: "high" | "medium" | "low" =
    parsed.confidence === "high" || parsed.confidence === "low" ? parsed.confidence : "medium";

  return { primary, alternates, confidence };
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: siteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: site } = await supabase
    .from("client_sites")
    .select("id, url, site_context")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .single();

  if (!site) return NextResponse.json({ error: "Site não encontrado" }, { status: 404 });

  const description: string | null = (site.site_context as any)?.gptSummary ?? null;

  // 1) Pull signals from the site
  const { signals, source } = await gatherSiteSignals(site.url);

  if (signals.length === 0) {
    return NextResponse.json({
      error: "Não conseguimos ler nada do seu site. Está no ar? Você pode escolher manualmente.",
      code: "site_unreachable",
    }, { status: 502 });
  }

  // 2) Classify with GPT
  let classification: Awaited<ReturnType<typeof classifyNicheWithGPT>>;
  try {
    classification = await classifyNicheWithGPT(signals, description);
  } catch (e) {
    console.error("[detect-niche] GPT failed:", e);
    return NextResponse.json({
      error: "Não conseguimos analisar agora. Escolha manualmente.",
      code: "classify_failed",
    }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    suggestion: classification,
    pagesAnalyzed: signals.length,
    source, // 'sitemap' | 'homepage' | 'none'
  });
}
