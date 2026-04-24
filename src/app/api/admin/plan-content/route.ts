import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getKeywordSuggestions } from "@/lib/apis/dataforseo";
import { useActionOrFail } from "@/lib/actions/usage";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

/**
 * POST /api/admin/plan-content
 * Body: { domain: string, niche?: string, context?: string, targetKeywords?: number }
 *
 * Generates a content calendar for a network site:
 * 1. GPT generates 25 diverse seeds based on niche
 * 2. DataForSEO validates volume for each seed
 * 3. GPT cleans duplicates and irrelevant keywords
 * 4. Returns top N keywords ranked by volume/difficulty ratio
 *
 * Costs 1 "keyword_plan" per execution.
 */
export async function POST(request: Request) {
  const { domain, niche, context, targetKeywords = 200 } = await request.json();
  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 });

  const supabase = await createClient();

  // Auth + usage limit check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const usage = await useActionOrFail(user.id, "keyword_plan", domain);
  if (usage.error) return NextResponse.json({ error: usage.error, usage }, { status: 429 });
  const startTime = Date.now();

  // Try to get site info from DB if niche/context not provided
  let siteNiche = niche ?? "";
  let siteContext = context ?? "";

  if (!siteNiche || !siteContext) {
    const { data: site } = await supabase.from("network_sites").select("niche, site_context, categories").eq("domain", domain).single();
    if (site) {
      siteNiche = siteNiche || site.niche || "";
      const ctx = site.site_context ?? {};
      siteContext = siteContext || [ctx.gptSummary, ...(ctx.categories ?? site.categories ?? [])].filter(Boolean).join(", ");
    }
  }

  if (!siteNiche) return NextResponse.json({ error: "Could not determine niche. Provide niche parameter." });

  // Step 1: GPT generates diverse seeds — 10 seeds = ~200 keywords after cleaning
  const seedCount = 10;

  const seedRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4.1-mini", temperature: 0.5, max_tokens: 600,
      messages: [{ role: "user", content: `Blog sobre ${siteNiche}. Contexto: ${siteContext}

Gere ${seedCount} seeds de keywords CURTAS (2-3 palavras) para Google Brasil.
Cada seed DEVE cobrir um SUBTEMA DIFERENTE. Começar com "como", "melhores", "quanto custa", "o que é", "dicas de", "tipos de".
NÃO inclua jogos, filmes ou coisas não relacionadas ao nicho.

JSON: {"seeds": ["seed1", ..., "seed${seedCount}"]}` }],
      response_format: { type: "json_object" },
    }),
  });

  let seeds: string[] = [];
  try {
    const parsed = JSON.parse((await seedRes.json()).choices[0].message.content);
    seeds = parsed.seeds || Object.values(parsed);
  } catch {}

  // Step 2: DataForSEO validates volume
  let allKeywords: Array<{ keyword: string; volume: number; difficulty: number; seed: string }> = [];
  let apiCalls = 0;

  for (const seed of seeds) {
    try {
      const result = await getKeywordSuggestions(seed);
      apiCalls++;
      const items = result?.tasks?.[0]?.result?.[0]?.items ?? [];

      for (const item of items) {
        const vol = item?.keyword_info?.search_volume ?? 0;
        const diff = Math.round(item?.keyword_properties?.keyword_difficulty ?? 0);
        const kw = item?.keyword ?? "";
        if (vol > 0 && diff <= 40 && kw.length > 5) {
          allKeywords.push({ keyword: kw, volume: vol, difficulty: diff, seed });
        }
      }
    } catch {}
  }

  // Deduplicate exact matches
  const seen = new Set<string>();
  allKeywords = allKeywords.filter(k => {
    if (seen.has(k.keyword)) return false;
    seen.add(k.keyword);
    return true;
  });

  // Deduplicate similar keywords (normalize and compare)
  function normalize(kw: string): string {
    return kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/\b(de|do|da|dos|das|em|no|na|nos|nas|um|uma|o|a|os|as|para|pra|por|com|que|e|é)\b/g, "")
      .replace(/[^a-z0-9]/g, "")
      .split("").sort().join("");
  }

  const normalizedSeen = new Map<string, { keyword: string; volume: number }>();
  allKeywords = allKeywords
    .sort((a, b) => b.volume - a.volume) // Keep highest volume version
    .filter(k => {
      const norm = normalize(k.keyword);
      if (normalizedSeen.has(norm)) return false;
      normalizedSeen.set(norm, { keyword: k.keyword, volume: k.volume });
      return true;
    });

  // Sort by volume desc and take top candidates for GPT cleaning
  allKeywords.sort((a, b) => b.volume - a.volume);
  const candidates = allKeywords.slice(0, Math.min(allKeywords.length, 300));

  // Step 3: GPT cleans duplicates and irrelevant — process in batches of 100
  let cleaned: Array<{ keyword: string; volume: number; difficulty: number }> = [];

  for (let i = 0; i < candidates.length; i += 100) {
    const batch = candidates.slice(i, i + 100);

    const cleanRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1-mini", temperature: 0.1, max_tokens: 3000,
        messages: [{ role: "user", content: `Tenho ${batch.length} keywords para um blog de ${siteNiche} (${siteContext}).

TAREFA — seja AGRESSIVO na limpeza:
1. AGRUPE keywords que são variações da mesma busca. Exemplos de variações que devem ser agrupadas:
   - "como abrir empresa nos eua" e "como abrir empresa no eua" → MESMA keyword, manter só 1
   - "tipos de piso para casa" e "tipos de pisos para casa" → MESMA, manter só 1
   - "quanto custa telhado" e "telhado quanto custa" → MESMA, manter só 1
   - "o que é drywall" e "drywall o que é" → MESMA, manter só 1
2. De cada grupo, mantenha APENAS a versão com MAIOR VOLUME
3. REMOVA keywords irrelevantes pro nicho ${siteNiche}
4. REMOVA keywords muito genéricas (1-2 palavras soltas) que não gerariam um artigo

Se duas keywords gerariam o MESMO artigo, são duplicatas. Mantenha só 1.

KEYWORDS:
${batch.map(k => `"${k.keyword}" (vol:${k.volume}, dif:${k.difficulty})`).join("\n")}

Retorne JSON: {"keywords": [{"keyword": "...", "volume": 0, "difficulty": 0}]}` }],
        response_format: { type: "json_object" },
      }),
    });

    try {
      const parsed = JSON.parse((await cleanRes.json()).choices[0].message.content);
      const batchCleaned = parsed.keywords || Object.values(parsed);
      if (Array.isArray(batchCleaned)) cleaned.push(...batchCleaned);
    } catch {
      cleaned.push(...batch);
    }
  }

  // Step 4: Final ranking by volume/difficulty ratio
  const ranked = cleaned
    .sort((a, b) => {
      const ratioA = a.volume / (a.difficulty + 1);
      const ratioB = b.volume / (b.difficulty + 1);
      return ratioB - ratioA;
    })
    .slice(0, targetKeywords);

  const totalVolume = ranked.reduce((s, k) => s + k.volume, 0);
  const avgDifficulty = ranked.length > 0 ? Math.round(ranked.reduce((s, k) => s + k.difficulty, 0) / ranked.length) : 0;

  return NextResponse.json({
    domain,
    niche: siteNiche,
    context: siteContext,
    keywords: ranked,
    stats: {
      seedsGenerated: seeds.length,
      apiCalls,
      rawKeywords: allKeywords.length,
      afterCleaning: cleaned.length,
      finalCount: ranked.length,
      totalVolume,
      avgDifficulty,
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    },
    seeds,
  });
}
