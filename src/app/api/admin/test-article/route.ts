import { NextResponse } from "next/server";
import { analyzeSERP } from "@/lib/apis/dataforseo";
import { normalizeArticle } from "@/lib/utils/normalize-article";
import { fetchWithRetry } from "@/lib/utils/fetch-retry";
import { getUsdBrlRate } from "@/lib/utils/exchange-rate";

/**
 * POST /api/admin/test-article
 * Full content-first pipeline:
 * 1. SERP analysis → top 5 URLs
 * 2. Scrape headings from each
 * 3. GPT consolidates outline
 * 4. GPT writes article
 *
 * Body: { keyword: string, model?: string, siteContext?: string }
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  const { keyword, model = "gpt-4.1-mini", siteContext = "", backlink } = await request.json();
  // backlink: { url: string, anchor: string, clientDescription: string } — optional
  if (!keyword) return NextResponse.json({ error: "keyword required" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not configured" });

  const steps: Array<{ step: string; duration: number; data?: any }> = [];
  const startTotal = Date.now();

  // ── Step 1: SERP Analysis → top 5 URLs ──
  let serpUrls: string[] = [];
  const s1 = Date.now();
  try {
    const serpResult = await analyzeSERP(keyword);
    const items = serpResult?.tasks?.[0]?.result?.[0]?.items ?? [];
    serpUrls = items
      .filter((i: any) => i.type === "organic" && i.url)
      .slice(0, 5)
      .map((i: any) => i.url);
    steps.push({ step: "1. SERP Analysis", duration: Date.now() - s1, data: { urls: serpUrls } });
  } catch (e) {
    steps.push({ step: "1. SERP Analysis", duration: Date.now() - s1, data: { error: String(e) } });
  }

  // ── Step 2: Scrape headings from top 5 ──
  const s2 = Date.now();
  const competitorOutlines: Array<{ url: string; title: string; headings: Array<{ level: string; text: string }>; wordCount: number }> = [];

  await Promise.all(serpUrls.map(async (url) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "Mozilla/5.0 (compatible; 8links-bot/1.0)" } });
      if (!res.ok) return;
      const html = await res.text();

      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch?.[1]?.trim() ?? "";

      // Extract word count: strip non-content elements, then count
      let cleanHtml = html;
      // Remove elements that aren't article content
      cleanHtml = cleanHtml.replace(/<script[\s\S]*?<\/script>/gi, "");
      cleanHtml = cleanHtml.replace(/<style[\s\S]*?<\/style>/gi, "");
      cleanHtml = cleanHtml.replace(/<nav[\s\S]*?<\/nav>/gi, "");
      cleanHtml = cleanHtml.replace(/<header[\s\S]*?<\/header>/gi, "");
      cleanHtml = cleanHtml.replace(/<footer[\s\S]*?<\/footer>/gi, "");
      cleanHtml = cleanHtml.replace(/<aside[\s\S]*?<\/aside>/gi, "");
      cleanHtml = cleanHtml.replace(/<form[\s\S]*?<\/form>/gi, "");
      cleanHtml = cleanHtml.replace(/<!--[\s\S]*?-->/g, "");

      // Extract text from remaining HTML
      const plainText = cleanHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const allWords = plainText.split(/\s+/).filter(w => w.length > 1);
      const wordCount = allWords.length;

      // Extract headings h1-h4
      const headings: Array<{ level: string; text: string }> = [];
      const hRegex = /<(h[1-4])[^>]*>([\s\S]*?)<\/\1>/gi;
      let m;
      while ((m = hRegex.exec(html)) !== null) {
        const text = m[2].replace(/<[^>]+>/g, "").trim();
        if (text.length > 3 && text.length < 200) {
          headings.push({ level: m[1].toLowerCase(), text });
        }
      }

      competitorOutlines.push({ url, title, headings: headings.slice(0, 30), wordCount });
    } catch {}
  }));

  // Calculate word count target: avg of competitors + 20%
  const competitorWordCounts = competitorOutlines.filter(c => c.wordCount > 200).map(c => c.wordCount);
  const avgCompetitorWords = competitorWordCounts.length > 0 ? Math.round(competitorWordCounts.reduce((a, b) => a + b, 0) / competitorWordCounts.length) : 1500;
  const targetWordCount = Math.round(avgCompetitorWords * 1.20);

  steps.push({ step: "2. Scrape headings", duration: Date.now() - s2, data: {
    competitors: competitorOutlines.length,
    totalHeadings: competitorOutlines.reduce((s, c) => s + c.headings.length, 0),
    competitorWordCounts: competitorOutlines.map(c => ({ url: c.url.replace(/^https?:\/\/([^/]+).*/, '$1'), words: c.wordCount })),
    avgWords: avgCompetitorWords,
    targetWords: targetWordCount,
  }});

  // ── Step 3: GPT consolidates outline ──
  const s3 = Date.now();
  const outlinePrompt = `Sou um redator SEO. Preciso criar a MELHOR outline (estrutura) pra um artigo sobre "${keyword}".

Analisei os top 5 resultados do Google e extraí os headings de cada um:

${competitorOutlines.map((c, i) => `--- Resultado ${i + 1}: ${c.title} (${c.wordCount} palavras) ---\n${c.headings.map(h => `[${h.level}] ${h.text}`).join("\n")}`).join("\n\n")}

Com base nesses headings, crie UMA outline consolidada que:
1. Cubra TODOS os tópicos importantes (não deixe nenhum de fora)
2. Elimine repetições e sinônimos
3. Organize de forma semântica e lógica (do básico ao avançado)
4. Adicione 2-3 tópicos que os concorrentes NÃO cobriram (diferencial)
5. Use H2 e H3 de forma hierárquica
6. Inclua uma FAQ no final com 5 perguntas frequentes

REGRA DO TÍTULO: o "title" DEVE conter a keyword "${keyword}" de forma natural. A keyword deve aparecer preferencialmente no início do título.

TAMBÉM extraia os TERMOS NLP mais importantes do nicho "${keyword}". Esses são palavras/frases semanticamente relacionadas que o Google espera ver num artigo sobre esse tema. Para cada termo, indique quantas vezes deveria aparecer no artigo.

Retorne APENAS um JSON válido com as chaves:
- "title" (string com a keyword incluída)
- "metaDescription" (string 150-160 chars com a keyword)
- "outline" (array de objetos com "level" h2 ou h3 e "text")
- "faq" (array de objetos com "question" e "answer")
- "wordCountTarget" (number)
- "nlpTerms" (array de objetos com "term" string e "min" number e "max" number — frequência recomendada)

Para os nlpTerms: inclua 15-20 termos. Ex: para "marketing digital" → [{"term":"redes sociais","min":2,"max":5},{"term":"SEO","min":3,"max":7},...].

O wordCountTarget deve ser ${targetWordCount} (média dos concorrentes ${avgCompetitorWords} + 20%).

Não use "..." ou comentários dentro do JSON. Retorne o JSON completo e válido.`;

  let outline: any = null;
  let outlineInputTokens = 0;
  let outlineOutputTokens = 0;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const outlineRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4.1-mini", temperature: 0.3, max_tokens: 2000, messages: [{ role: "user", content: outlinePrompt }], response_format: { type: "json_object" } }),
      });
      const outlineData = await outlineRes.json();
      if (outlineData.error) throw new Error(outlineData.error.message ?? JSON.stringify(outlineData.error));
      let content = outlineData.choices[0].message.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      content = content.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      outline = JSON.parse(content);
      outlineInputTokens = outlineData.usage?.prompt_tokens ?? 0;
      outlineOutputTokens = outlineData.usage?.completion_tokens ?? 0;
      steps.push({ step: "3. Consolidate outline", duration: Date.now() - s3, data: { headingsCount: outline.outline?.length, title: outline.title, attempt, inputTokens: outlineInputTokens, outputTokens: outlineOutputTokens } });
      break;
    } catch (e) {
      if (attempt === 2) {
        steps.push({ step: "3. Consolidate outline", duration: Date.now() - s3, data: { error: String(e), attempts: 2 } });
        return NextResponse.json({ error: "Failed to generate outline", steps });
      }
      console.warn(`[test-article] Outline attempt ${attempt} failed: ${e}. Retrying...`);
    }
  }

  // ── Step 4: GPT writes article (test with specified model) ──
  const s4 = Date.now();

  // Calculate words per section
  const h2Count = outline.outline.filter((h: any) => h.level === "h2").length;
  const faqWords = (outline.faq?.length ?? 0) * 40;
  const availableWords = targetWordCount - faqWords;
  const wordsPerH2 = Math.round(availableWords / Math.max(h2Count, 1));

  // Build outline with word targets per H2
  let currentH2 = "";
  const outlineWithTargets = outline.outline.map((h: any) => {
    if (h.level === "h2") {
      currentH2 = h.text;
      const isFaq = h.text.toLowerCase().includes("faq") || h.text.toLowerCase().includes("perguntas");
      return `## ${h.text} ${isFaq ? "(~" + faqWords + " palavras)" : "(~" + wordsPerH2 + " palavras)"}`;
    }
    return `### ${h.text}`;
  }).join("\n");

  const articlePrompt = `Escreva um artigo completo em português brasileiro sobre "${keyword}".

TÍTULO: ${outline.title}

TOTAL DO ARTIGO: ${targetWordCount} palavras (média dos concorrentes: ${avgCompetitorWords} palavras + 20%)

OUTLINE — siga esta estrutura e RESPEITE o tamanho indicado em cada seção:
${outlineWithTargets}

FAQ (OBRIGATÓRIO — use ### para cada pergunta):
${outline.faq.map((f: any) => `### ${f.question}\n${f.answer}`).join("\n\n")}

${siteContext ? `CONTEXTO DO BLOG: ${siteContext}` : ""}
${backlink ? `
BACKLINK A INSERIR (OBRIGATÓRIO):
- URL: ${backlink.url}
- Texto âncora: "${backlink.anchor}"
- Sobre o cliente: ${backlink.clientDescription || ""}
- Insira o link EXATAMENTE 1 vez no artigo, de forma NATURAL
- O link deve aparecer como uma recomendação útil pro leitor, NÃO como propaganda
- Use o formato markdown: [${backlink.anchor}](${backlink.url})
- Posicione numa seção onde o contexto faça sentido pro leitor clicar
` : ""}
REGRAS DE TAMANHO:
- Cada seção H2 deve ter EXATAMENTE o número de palavras indicado entre parênteses. Isso é CRÍTICO.
- Total do artigo: ${targetWordCount} palavras.

REGRAS DE FORMATAÇÃO (OBRIGATÓRIAS):
- Um parágrafo = 2 a 3 frases JUNTAS (separadas por ponto, na MESMA linha)
- Separe parágrafos com UMA linha em branco
- Cada parágrafo deve ter no máximo 3 frases
- NÃO coloque cada frase em uma linha separada — agrupe 2-3 frases por parágrafo
- NÃO escreva blocos com mais de 4 linhas seguidas
- As perguntas do FAQ devem ser formatadas como ### (H3)

REGRAS DE ESCRITA:
- Português brasileiro natural, não "português de Portugal"
- Tom: informativo e acessível, como se explicasse pra um amigo
- Use dados, números e exemplos concretos quando possível
- FAQ: responda cada pergunta em 2-3 frases
- NÃO use frases genéricas tipo "neste artigo vamos explorar" ou "é importante ressaltar"
- NÃO comece com "Você já se perguntou"
- Escreva em formato Markdown
- Comece direto com o conteúdo, sem repetir o título`;

  let article = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let usedModel = model;
  let fallbackUsed = false;
  const FALLBACK_MODEL = "gpt-4.1-nano";

  async function callGPT(m: string) {
    return fetchWithRetry("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: m, temperature: 0.5,
        ...(m.startsWith("gpt-5") ? { max_completion_tokens: 8000 } : { max_tokens: 4000 }),
        messages: [{ role: "user", content: articlePrompt }],
      }),
    }, { label: `test-article:write(${m})`, maxRetries: 1 });
  }

  try {
    let articleRes = await callGPT(model);
    let articleData = await articleRes.json();

    if (articleData.error && model !== FALLBACK_MODEL) {
      console.warn(`[test-article] ${model} failed (${articleData.error.code ?? "?"}): ${articleData.error.message}. Falling back to ${FALLBACK_MODEL}`);
      usedModel = FALLBACK_MODEL;
      fallbackUsed = true;
      articleRes = await callGPT(FALLBACK_MODEL);
      articleData = await articleRes.json();
    }

    if (articleData.error) {
      console.error(`[test-article] Article generation failed on ${usedModel}:`, articleData.error);
      steps.push({ step: `4. Write article (${usedModel})`, duration: Date.now() - s4, data: { error: articleData.error.message ?? JSON.stringify(articleData.error) } });
      return NextResponse.json({ error: "Article generation failed", articleError: articleData.error, keyword, model: usedModel, outline, steps, competitorOutlines });
    }

    article = articleData.choices?.[0]?.message?.content ?? "";
    inputTokens = articleData.usage?.prompt_tokens ?? 0;
    outputTokens = articleData.usage?.completion_tokens ?? 0;

    steps.push({
      step: `4. Write article (${usedModel}${fallbackUsed ? " — FALLBACK" : ""})`,
      duration: Date.now() - s4,
      data: { wordCount: article.split(/\s+/).length, inputTokens, outputTokens, fallback: fallbackUsed }
    });
  } catch (e) {
    steps.push({ step: `4. Write article (${usedModel})`, duration: Date.now() - s4, data: { error: String(e) } });
  }

  // Normalize article (fix GPT quirks: FAQ headings, paragraph length, etc.)
  if (article) {
    article = normalizeArticle(article);
  }

  // Word count check
  if (article) {
    const finalWords = article.split(/\s+/).length;
    const diff = finalWords - targetWordCount;
    const pct = Math.round((diff / targetWordCount) * 100);
    steps.push({ step: "4.5 Word count check", duration: 0, data: { words: finalWords, target: targetWordCount, diff, pct: `${pct > 0 ? "+" : ""}${pct}%`, wordsPerH2 } });
  }

  // ── Step 5: Find images (1 per 400 words) and insert into article ──
  const s5 = Date.now();
  const articleWordCount = article ? article.split(/\s+/).length : 0;
  const imageCount = Math.max(1, Math.floor(articleWordCount / 400));
  const h2sForImages = outline.outline?.filter((h: any) => h.level === "h2" && !h.text.toLowerCase().includes("faq") && !h.text.toLowerCase().includes("perguntas")) ?? [];

  // Pick H2s evenly spaced for image placement
  const imageH2s: any[] = [];
  if (h2sForImages.length > 0 && imageCount > 0) {
    const step = Math.max(1, Math.floor(h2sForImages.length / imageCount));
    for (let i = 0; i < imageCount && i * step < h2sForImages.length; i++) {
      imageH2s.push(h2sForImages[i * step]);
    }
  }

  const imageResults: Array<{ heading: string; url: string; description: string; source: string; credit: string }> = [];
  const usedImageUrls = new Set<string>();

  for (const h of imageH2s) {
    try {
      const baseUrl = request.url.replace(/\/api\/admin\/test-article.*/, "");
      const imgRes = await fetch(`${baseUrl}/api/admin/find-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heading: h.text, excludeUrls: Array.from(usedImageUrls) }),
      });
      const imgData = await imgRes.json();
      if (imgData.url && !usedImageUrls.has(imgData.url)) {
        usedImageUrls.add(imgData.url);
        imageResults.push({ heading: h.text, url: imgData.url, description: imgData.description ?? h.text, source: imgData.source ?? "unknown", credit: imgData.credit ?? "" });
      }
    } catch {}
  }

  // Insert images after the selected H2s
  if (imageResults.length > 0 && article) {
    for (const img of imageResults) {
      const h2Pattern = `## ${img.heading}`;
      const imgMarkdown = `\n\n![${img.description}](${img.url})\n*${img.credit || ""}*\n`;
      article = article.replace(h2Pattern, h2Pattern + imgMarkdown);
    }
  }

  steps.push({ step: "5. Find images", duration: Date.now() - s5, data: { articleWords: articleWordCount, imagesNeeded: imageCount, found: imageResults.length, images: imageResults.map(i => ({ heading: i.heading, source: i.source })) } });

  // Cost calculation — outline call (always gpt-4.1-mini) + write article (usedModel)
  const pricing: Record<string, { input: number; output: number }> = {
    "gpt-4.1-nano": { input: 0.10, output: 0.40 },
    "gpt-4.1-mini": { input: 0.40, output: 1.60 },
    "gpt-4.1": { input: 2.00, output: 8.00 },
  };
  const writePricing = pricing[usedModel] ?? { input: 1, output: 4 };
  const outlinePricing = pricing["gpt-4.1-mini"];
  const writeCost = (inputTokens * writePricing.input + outputTokens * writePricing.output) / 1_000_000;
  const outlineCost = (outlineInputTokens * outlinePricing.input + outlineOutputTokens * outlinePricing.output) / 1_000_000;
  const cost = writeCost + outlineCost;
  const totalInputTokens = inputTokens + outlineInputTokens;
  const totalOutputTokens = outputTokens + outlineOutputTokens;

  // Check if backlink was inserted
  const backlinkInserted = backlink?.url ? article.includes(backlink.url) : false;

  return NextResponse.json({
    keyword,
    model: usedModel,
    fallbackUsed,
    outline,
    article,
    nlpTerms: outline?.nlpTerms ?? [],
    guidelines: {
      wordCountTarget: targetWordCount,
      avgCompetitorWords,
      h2Target: h2Count,
      imageTarget: imageCount,
      maxParagraphLines: 3,
    },
    backlink: backlink ? { ...backlink, inserted: backlinkInserted } : undefined,
    stats: {
      wordCount: article.split(/\s+/).length,
      competitorsAnalyzed: competitorOutlines.length,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      writeInputTokens: inputTokens,
      writeOutputTokens: outputTokens,
      outlineInputTokens,
      outlineOutputTokens,
      costUsd: cost,
      cost: `$${cost.toFixed(4)}`,
      costBRL: `R$ ${(cost * getUsdBrlRate()).toFixed(2)}`,
      totalDuration: `${((Date.now() - startTotal) / 1000).toFixed(1)}s`,
      model: usedModel,
    },
    steps,
    competitorOutlines,
  });
}
