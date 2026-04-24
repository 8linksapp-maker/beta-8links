import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function scrapeSite(site: any, supabase: any): Promise<{ domain: string; success: boolean; error?: string; summary?: string }> {
  const url = site.vercel_url || `https://${site.domain}`;
  try {
    const homeRes = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { "User-Agent": "8links-bot/1.0" } });
    if (!homeRes.ok) return { domain: site.domain, success: false, error: `HTTP ${homeRes.status}` };

    const html = await homeRes.text();
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const metaDesc = metaMatch ? metaMatch[1].trim() : "";

    const h1s: string[] = [];
    let m; const h1R = /<h1[^>]*>([^<]*)<\/h1>/gi;
    while ((m = h1R.exec(html)) !== null) h1s.push(m[1].trim());
    const h2s: string[] = [];
    const h2R = /<h2[^>]*>([^<]*)<\/h2>/gi;
    while ((m = h2R.exec(html)) !== null) h2s.push(m[1].trim());

    let sobreContent = "";
    try {
      const sobreRes = await fetch(`${url}/sobre`, { signal: AbortSignal.timeout(5000), headers: { "User-Agent": "8links-bot/1.0" } });
      if (sobreRes.ok) {
        const sobreHtml = await sobreRes.text();
        const mainMatch = sobreHtml.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
        if (mainMatch) sobreContent = mainMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
      }
    } catch {}

    const contextParts = [
      title && `Título: ${title}`,
      metaDesc && `Descrição: ${metaDesc}`,
      h1s.length > 0 && `H1: ${h1s.join(", ")}`,
      h2s.length > 0 && `H2: ${h2s.slice(0, 5).join(", ")}`,
      sobreContent && `Página Sobre: ${sobreContent}`,
    ].filter(Boolean).join("\n");

    let gptResult: any = null;
    if (process.env.OPENAI_API_KEY && contextParts.length > 20) {
      try {
        const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-4.1-nano",
            messages: [{ role: "user", content: `Analise este site e retorne JSON com:
1. "summary": resumo de 1-2 frases do que o site é, em português
2. "categories": array com 2-4 categorias de conteúdo do site
3. "brandVoice": tom de voz (informal, profissional, técnico ou educativo)
4. "audience": público-alvo em 1 frase

Domínio: ${site.domain}
Nicho declarado: ${site.niche}
${contextParts}

Responda APENAS o JSON.` }],
            temperature: 0.2, max_tokens: 200,
          }),
        });
        if (gptRes.ok) {
          const d = await gptRes.json();
          try { gptResult = JSON.parse(d.choices?.[0]?.message?.content?.trim() ?? ""); } catch {}
        }
      } catch {}
    }

    const siteContext = {
      title, metaDescription: metaDesc,
      headings: { h1: h1s, h2: h2s.slice(0, 10) },
      sobreExcerpt: sobreContent || null,
      gptSummary: gptResult?.summary ?? "",
      categories: gptResult?.categories ?? [],
      brandVoice: gptResult?.brandVoice ?? "",
      audience: gptResult?.audience ?? "",
      scrapedAt: new Date().toISOString(),
    };

    await supabase.from("network_sites").update({
      site_context: siteContext,
      categories: gptResult?.categories ?? [],
      brand_voice: gptResult?.brandVoice ?? null,
    }).eq("id", site.id);

    return { domain: site.domain, success: true, summary: gptResult?.summary ?? title };
  } catch (error) {
    return { domain: site.domain, success: false, error: String(error) };
  }
}

/**
 * POST /api/admin/scrape-network
 * Scrapes all network sites without context, 5 in parallel.
 */
export async function POST(request: Request) {
  const { siteId } = await request.json().catch(() => ({}));
  const supabase = await createClient();

  let query = supabase.from("network_sites").select("id, domain, niche, vercel_url, site_context").eq("status", "active");
  if (siteId) {
    query = query.eq("id", siteId);
  } else {
    query = query.or("site_context.is.null,site_context->>gptSummary.is.null,site_context->>gptSummary.eq.");
  }

  const { data: sites } = await query.limit(100);
  if (!sites || sites.length === 0) {
    return NextResponse.json({ message: "Todos os sites já foram processados", processed: 0 });
  }

  // Process in batches of 5 in parallel
  const results: Array<{ domain: string; success: boolean; error?: string; summary?: string }> = [];
  const batchSize = 5;

  for (let i = 0; i < sites.length; i += batchSize) {
    const batch = sites.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(site => scrapeSite(site, supabase)));
    results.push(...batchResults);
  }

  return NextResponse.json({
    processed: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  });
}
