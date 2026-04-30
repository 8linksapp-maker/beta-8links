import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { domain, queries } = await request.json();
  if (!domain || !queries?.length) return NextResponse.json({ error: "Informe o domínio e ao menos uma busca para analisar." }, { status: 400 });

  const results = [];

  // ChatGPT check
  if (process.env.OPENAI_API_KEY) {
    try {
      const { checkChatGPTVisibility } = await import("@/lib/apis/openai");
      for (const query of queries.slice(0, 5)) {
        const result = await checkChatGPTVisibility(query, domain);
        results.push({ platform: "chatgpt", query, cited: result.siteFound, citationUrl: result.citationUrl, snippet: result.citationSnippet });
      }
    } catch (e) { console.error("ChatGPT check failed:", e); }
  }

  // Perplexity check
  if (process.env.PERPLEXITY_API_KEY) {
    try {
      const { checkPerplexityVisibility } = await import("@/lib/apis/perplexity");
      for (const query of queries.slice(0, 5)) {
        const result = await checkPerplexityVisibility(query, domain);
        results.push({ platform: "perplexity", query, cited: result.siteFound, citationUrl: result.citationUrl });
      }
    } catch (e) { console.error("Perplexity check failed:", e); }
  }

  // Google AI Overview check
  if (process.env.DATAFORSEO_LOGIN) {
    try {
      const { checkAIOverview } = await import("@/lib/apis/dataforseo");
      for (const query of queries.slice(0, 5)) {
        const result = await checkAIOverview(query);
        const refs = result?.tasks?.[0]?.result?.[0]?.items ?? [];
        const cited = refs.some((r: any) => r.domain?.includes(domain));
        results.push({ platform: "google_aio", query, cited, citationUrl: cited ? refs.find((r: any) => r.domain?.includes(domain))?.url : null });
      }
    } catch (e) { console.error("Google AIO check failed:", e); }
  }

  // Gemini check
  if (process.env.GEMINI_API_KEY) {
    try {
      const { checkGeminiVisibility } = await import("@/lib/apis/gemini");
      for (const query of queries.slice(0, 5)) {
        const result = await checkGeminiVisibility(query, domain);
        results.push({ platform: "gemini", query, cited: result.siteFound, citationUrl: result.citationUrl });
      }
    } catch (e) { console.error("Gemini check failed:", e); }
  }

  if (results.length === 0) {
    console.error("[ai-visibility] no AI providers configured (missing OPENAI_API_KEY/ANTHROPIC_API_KEY/GOOGLE_AI_API_KEY)");
    return NextResponse.json({ error: "Análise de visibilidade em IAs temporariamente indisponível. Tente novamente em alguns instantes." });
  }

  const total = results.length;
  const cited = results.filter(r => r.cited).length;
  const score = total > 0 ? Math.round((cited / total) * 100) : 0;

  return NextResponse.json({ results, score, total, cited });
}
