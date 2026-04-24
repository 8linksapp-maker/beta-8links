import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getKeywordSuggestions } from "@/lib/apis/dataforseo";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

/**
 * POST /api/admin/plan-all-sites
 * Body: { batchSize?: number, targetPerSite?: number, siteId?: string }
 *
 * Runs content planning for all network sites (or one specific site).
 * Processes batchSize sites at a time. Call multiple times if needed.
 */
export async function POST(request: Request) {
  const { batchSize = 5, targetPerSite = 200, siteId } = await request.json().catch(() => ({}));
  const supabase = await createClient();
  const startTime = Date.now();

  // Get sites to plan — skip ones that already have keywords
  let query = supabase.from("network_sites").select("id, domain, niche, site_context, categories").eq("status", "active");

  if (siteId) {
    query = query.eq("id", siteId);
  }

  const { data: allSites } = await query.order("domain");
  if (!allSites?.length) return NextResponse.json({ message: "No sites found", processed: 0 });

  // Filter sites without enough keywords
  const sitesToPlan = [];
  for (const site of allSites) {
    const { count } = await supabase.from("content_calendar").select("id", { count: "exact", head: true }).eq("network_site_id", site.id);
    if ((count ?? 0) < targetPerSite * 0.5) {
      sitesToPlan.push({ ...site, existingCount: count ?? 0 });
    }
  }

  if (sitesToPlan.length === 0) return NextResponse.json({ message: "All sites already have enough keywords", totalSites: allSites.length });

  const batch = sitesToPlan.slice(0, batchSize);
  const results: Array<{ domain: string; success: boolean; keywords?: number; error?: string }> = [];

  for (const site of batch) {
    try {
      const ctx = site.site_context ?? {};
      const siteContext = [ctx.gptSummary, ...(ctx.categories ?? site.categories ?? [])].filter(Boolean).join(", ");
      const seedCount = 10;

      // Step 1: GPT generates seeds
      const seedRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4.1-mini", temperature: 0.5, max_tokens: 600,
          messages: [{ role: "user", content: `Site: ${site.domain}\nNicho: ${site.niche}\nContexto: ${siteContext}\n\nGere ${seedCount} seeds de keywords CURTAS (2-3 palavras) para Google Brasil.\nREGRAS:\n- Começar com: "como", "melhores", "quanto custa", "o que é", "dicas de", "tipos de", "qual melhor"\n- Cada seed DEVE cobrir um SUBTEMA DIFERENTE\n- Pense em ${seedCount} assuntos DISTINTOS dentro do nicho\n- NÃO inclua jogos, filmes, apps\n\nJSON: {"seeds": ["seed1", ..., "seed${seedCount}"]}` }],
          response_format: { type: "json_object" },
        }),
      });
      let seeds: string[] = [];
      try {
        const parsed = JSON.parse((await seedRes.json()).choices[0].message.content);
        seeds = parsed.seeds || Object.values(parsed);
      } catch {}

      // Step 2: DataForSEO validates volume
      let allKeywords: Array<{ keyword: string; volume: number; difficulty: number }> = [];
      const seen = new Set<string>();

      for (const seed of seeds) {
        try {
          const result = await getKeywordSuggestions(seed);
          const items = result?.tasks?.[0]?.result?.[0]?.items ?? [];
          for (const item of items) {
            const vol = item?.keyword_info?.search_volume ?? 0;
            const diff = Math.round(item?.keyword_properties?.keyword_difficulty ?? 0);
            const kw = item?.keyword ?? "";
            if (vol > 0 && diff <= 40 && kw.length > 5 && !seen.has(kw)) {
              seen.add(kw);
              allKeywords.push({ keyword: kw, volume: vol, difficulty: diff });
            }
          }
        } catch {}
      }

      // Deduplicate similar keywords
      function normalize(kw: string): string {
        return kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
          .replace(/\b(de|do|da|dos|das|em|no|na|nos|nas|um|uma|o|a|os|as|para|pra|por|com|que|e|é)\b/g, "")
          .replace(/[^a-z0-9]/g, "")
          .split("").sort().join("");
      }
      const normSeen = new Map<string, boolean>();
      allKeywords = allKeywords.sort((a, b) => b.volume - a.volume).filter(k => {
        const n = normalize(k.keyword);
        if (normSeen.has(n)) return false;
        normSeen.set(n, true);
        return true;
      });

      const candidates = allKeywords.slice(0, 300);

      // Step 3: GPT cleans — process in batches of 100
      let cleaned: Array<{ keyword: string; volume: number; difficulty: number }> = [];

      for (let i = 0; i < candidates.length; i += 100) {
        const batch100 = candidates.slice(i, i + 100);
        try {
          const cleanRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gpt-4.1-mini", temperature: 0.1, max_tokens: 3000,
              messages: [{ role: "user", content: `${batch100.length} keywords para blog de ${site.niche} (${siteContext}).\n\nTAREFA:\n1. AGRUPE variações da mesma busca (com/sem acento, ordem diferente)\n2. De cada grupo, ESCOLHA APENAS 1\n3. REMOVA irrelevantes pro nicho ${site.niche}\n4. REMOVA genéricas demais\n\nKEYWORDS:\n${batch100.map(k => `"${k.keyword}" (vol:${k.volume}, dif:${k.difficulty})`).join("\n")}\n\nJSON: {"keywords": [{"keyword": "...", "volume": 0, "difficulty": 0}]}` }],
              response_format: { type: "json_object" },
            }),
          });
          const parsed = JSON.parse((await cleanRes.json()).choices[0].message.content);
          const batchCleaned = parsed.keywords || Object.values(parsed);
          if (Array.isArray(batchCleaned)) cleaned.push(...batchCleaned);
        } catch {
          cleaned.push(...batch100);
        }
      }

      // Step 4: Rank and take top N
      const ranked = cleaned
        .sort((a, b) => (b.volume / (b.difficulty + 1)) - (a.volume / (a.difficulty + 1)))
        .slice(0, targetPerSite);

      // Step 5: Save to content_calendar (delete existing first if re-running)
      if (site.existingCount > 0) {
        await supabase.from("content_calendar").delete().eq("network_site_id", site.id);
      }

      if (ranked.length > 0) {
        const rows = ranked.map(k => ({
          network_site_id: site.id,
          keyword: k.keyword,
          volume: k.volume,
          difficulty: k.difficulty,
          status: "planned",
        }));

        // Insert in batches of 50
        for (let i = 0; i < rows.length; i += 50) {
          const insertBatch = rows.slice(i, i + 50);
          const { error } = await supabase.from("content_calendar").insert(insertBatch);
          if (error) console.error(`[PlanAll] Insert error for ${site.domain}:`, error.message);
        }
      }

      results.push({ domain: site.domain, success: true, keywords: ranked.length });
    } catch (error) {
      results.push({ domain: site.domain, success: false, error: String(error) });
    }
  }

  return NextResponse.json({
    processed: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    remaining: sitesToPlan.length - batch.length,
    duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    results,
  });
}
