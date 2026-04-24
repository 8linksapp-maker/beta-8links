import { NextResponse } from "next/server";
import { parsePageContent } from "@/lib/apis/dataforseo";

/**
 * POST /api/integrations/scrape-site
 * Body: { url: string }
 *
 * 1. Tries sitemap.xml (and variations) to get all URLs + titles
 * 2. If no sitemap, falls back to DataForSEO parsePageContent on homepage
 * 3. Sends titles to GPT to classify niche + generate summary
 */
export async function POST(request: Request) {
  const { url } = await request.json();
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  const domain = fullUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  let pages: Array<{ url: string; title: string }> = [];
  let source = "none";

  // ── Step 1: Try sitemap ──
  const sitemapUrls = [
    `${fullUrl}/sitemap.xml`,
    `${fullUrl}/sitemap_index.xml`,
    `${fullUrl}/sitemap-posts.xml`,
    `${fullUrl}/post-sitemap.xml`,
    `https://${domain}/sitemap.xml`,
  ];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.includes("<url") && !text.includes("<sitemap")) continue;

      // Parse sitemap XML — extract <loc> tags
      const locs: string[] = [];
      const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
      let match;
      while ((match = locRegex.exec(text)) !== null) {
        locs.push(match[1]);
      }

      if (locs.length === 0) continue;

      // If it's a sitemap index, fetch the first child sitemap
      if (text.includes("<sitemapindex") && locs.length > 0) {
        try {
          const childRes = await fetch(locs[0], { signal: AbortSignal.timeout(5000) });
          if (childRes.ok) {
            const childText = await childRes.text();
            const childLocs: string[] = [];
            let childMatch;
            const childRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
            while ((childMatch = childRegex.exec(childText)) !== null) {
              childLocs.push(childMatch[1]);
            }
            if (childLocs.length > 0) {
              locs.length = 0;
              locs.push(...childLocs);
            }
          }
        } catch {}
      }

      // Filter: only HTML pages, skip images/files
      const pageUrls = locs
        .filter(l => !l.match(/\.(jpg|jpeg|png|gif|svg|pdf|css|js|xml|txt|zip)$/i))
        .slice(0, 100); // max 100 pages

      if (pageUrls.length === 0) continue;

      // Fetch titles from each page (parallel, max 20 at a time)
      const batchSize = 20;
      for (let i = 0; i < Math.min(pageUrls.length, 60); i += batchSize) {
        const batch = pageUrls.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (pageUrl) => {
            try {
              const r = await fetch(pageUrl, {
                signal: AbortSignal.timeout(4000),
                headers: { "User-Agent": "8links-bot/1.0" },
              });
              if (!r.ok) return null;
              const html = await r.text();
              const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
              const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, " ") : "";
              if (!title) return null;
              const path = pageUrl.replace(/^https?:\/\/[^/]+/, "") || "/";
              return { url: path, title };
            } catch { return null; }
          })
        );
        for (const r of results) {
          if (r.status === "fulfilled" && r.value) pages.push(r.value);
        }
      }

      if (pages.length > 0) {
        source = "sitemap";
        break;
      }
    } catch { continue; }
  }

  // ── Step 2: Fallback to DataForSEO parsePageContent ──
  if (pages.length === 0 && process.env.DATAFORSEO_LOGIN) {
    try {
      const result = await parsePageContent(fullUrl);
      const pageContent = result?.tasks?.[0]?.result?.[0];
      if (pageContent) {
        const title = pageContent.title ?? "";
        const meta = pageContent.meta_description ?? "";
        const headings = [
          ...(pageContent.headings?.h1 ?? []),
          ...(pageContent.headings?.h2 ?? []),
          ...(pageContent.headings?.h3 ?? []),
        ].slice(0, 20);

        pages = [{ url: "/", title: title || domain }];
        source = "dataforseo";

        // Use headings as pseudo-pages for GPT context
        for (const h of headings) {
          if (h && h.length > 3) {
            pages.push({ url: "#", title: h });
          }
        }
      }
    } catch {}
  }

  // ── Step 3: GPT summary ──
  let gptSummary = "";
  let mainTopics: string[] = [];
  let suggestedNiches: string[] = [];

  if (process.env.OPENAI_API_KEY && pages.length > 0) {
    const titles = pages.slice(0, 30).map(p => p.title).join("\n");

    try {
      const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-nano",
          messages: [{
            role: "user",
            content: `Analise os títulos das páginas deste site e retorne um JSON com:
1. "summary": resumo de 2-3 frases do que o site é sobre, em português, linguagem simples
2. "topics": array com 3-5 temas principais do site
3. "niches": array com 2-3 nichos da lista abaixo que melhor descrevem o site

Lista de nichos: Tecnologia, Saúde, Finanças, Educação, E-commerce, Marketing, Jurídico, Imobiliário, Alimentação, Automotivo, Moda, Beleza, Pets, Viagem, Esportes, Jogos, Infantil, Agronegócio, Construção, Sustentabilidade

Títulos das páginas:
${titles}

Responda APENAS o JSON, nada mais.`,
          }],
          temperature: 0.2,
          max_tokens: 300,
        }),
      });

      if (gptRes.ok) {
        const gptData = await gptRes.json();
        const content = gptData.choices?.[0]?.message?.content?.trim() ?? "";
        try {
          const parsed = JSON.parse(content);
          gptSummary = parsed.summary ?? "";
          mainTopics = parsed.topics ?? [];
          suggestedNiches = parsed.niches ?? [];
        } catch {
          // Try to extract from non-JSON response
          gptSummary = content.slice(0, 300);
        }
      }
    } catch (e) {
      console.error("[ScrapesSite] GPT error:", e);
    }
  }

  return NextResponse.json({
    domain,
    pages: pages.slice(0, 50),
    totalPages: pages.length,
    source,
    gptSummary,
    mainTopics,
    suggestedNiches,
  });
}
