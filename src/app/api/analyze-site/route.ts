import { NextResponse } from "next/server";
import { getBacklinkSummary, getRankedKeywords, getCompetitorDomains, parsePageContent } from "@/lib/apis/dataforseo";
import { getMozDA } from "@/lib/apis/moz";
import { detectNiche, getCompatibleNiches } from "@/lib/niche-detector";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { url, hasGscKeywords, gscKeywords } = await request.json();
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const domain = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\/$/, "");
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;

  if (!process.env.DATAFORSEO_LOGIN) {
    return NextResponse.json({ error: "DataForSEO not configured" });
  }

  try {
    // If GSC keywords are available, skip parsePageContent to save credits
    // Always call getRankedKeywords — needed for CPC data ($0.001 per call)
    const skipPageContent = !!hasGscKeywords;

    console.log(`[Analyze] Starting analysis for: ${domain} (skipPageContent: ${skipPageContent})`);

    // ── Step 1: Fetch data in parallel ──
    const [backlinkRes, rankedRes, pageRes] = await Promise.allSettled([
      getBacklinkSummary(domain),
      getRankedKeywords(domain),
      skipPageContent ? Promise.resolve(null) : parsePageContent(fullUrl),
    ]);

    // ── Step 2: Parse backlink data + get Moz DA ──
    const backlinkData = backlinkRes.status === "fulfilled" ? backlinkRes.value : null;
    const summary = backlinkData?.tasks?.[0]?.result?.[0];
    const totalBacklinks = summary?.backlinks ?? 0;
    const referringDomains = summary?.referring_domains ?? 0;
    const dofollowRatio = summary?.backlinks ? Math.round((summary.backlinks_nofollow ?? 0) / summary.backlinks * 100) : 0;

    // Get real Moz DA
    let da = 0;
    try {
      const mozResult = await getMozDA(domain);
      da = mozResult.da;
    } catch (e) {
      console.error("[Analyze] Moz DA error:", e);
    }

    console.log(`[Analyze] DA (Moz): ${da}, Backlinks: ${totalBacklinks}, Ref Domains: ${referringDomains}`);

    // ── Step 3: Parse ranked keywords + CPC ──
    const rankedData = rankedRes.status === "fulfilled" ? rankedRes.value : null;
    const rankedItems = rankedData?.tasks?.[0]?.result?.[0]?.items ?? [];
    const keywords = rankedItems.slice(0, 20).map((item: any) => ({
      keyword: item.keyword_data?.keyword ?? "",
      volume: item.keyword_data?.keyword_info?.search_volume ?? 0,
      difficulty: item.keyword_data?.keyword_properties?.keyword_difficulty ?? 0,
      cpc: item.keyword_data?.keyword_info?.cpc ?? 0,
      position: item.ranked_serp_element?.serp_item?.rank_absolute ?? null,
      url: item.ranked_serp_element?.serp_item?.url ?? null,
    })).filter((k: any) => k.keyword);

    // Calculate average CPC from keywords that have CPC data
    const kwsWithCpc = keywords.filter((k: any) => k.cpc > 0);
    const avgCpc = kwsWithCpc.length > 0
      ? Math.round(kwsWithCpc.reduce((sum: number, k: any) => sum + k.cpc, 0) / kwsWithCpc.length * 100) / 100
      : 0;

    console.log(`[Analyze] Found ${keywords.length} ranked keywords, avgCPC: R$ ${avgCpc} (from ${kwsWithCpc.length} keywords)`);

    // ── Step 4: Parse page content ──
    const pageData = pageRes.status === "fulfilled" ? pageRes.value : null;
    const pageContent = pageData?.tasks?.[0]?.result?.[0];
    const pageTitle = pageContent?.title ?? "";
    const metaDescription = pageContent?.meta_description ?? "";
    const headings = [
      ...(pageContent?.headings?.h1 ?? []),
      ...(pageContent?.headings?.h2 ?? []),
      ...(pageContent?.headings?.h3 ?? []),
    ].slice(0, 20);

    // ── Step 5: Detect niche ──
    const nicheResult = detectNiche({
      keywords: keywords.map((k: any) => k.keyword),
      title: pageTitle,
      metaDescription,
      headings,
    });

    console.log(`[Analyze] Niche: ${nicheResult.primary} (${nicheResult.confidence}% confidence), Secondary: ${nicheResult.secondary}`);

    // ── Step 6: Count compatible partner sites (recalculated after GPT below) ──
    let compatibleNiches = getCompatibleNiches(nicheResult.primary);
    let partnerSitesCount = 0;

    try {
      const supabase = await createClient();
      const { count } = await supabase
        .from("network_sites")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      partnerSitesCount = count ?? 0;

      // If we have niche-specific sites, filter
      if (partnerSitesCount > 0) {
        const { count: nicheCount } = await supabase
          .from("network_sites")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .in("niche", compatibleNiches);
        // Use niche count if available, otherwise total
        partnerSitesCount = (nicheCount ?? 0) > 0 ? nicheCount! : partnerSitesCount;
      }
    } catch {
      // If no network sites in DB yet, estimate
      partnerSitesCount = 0;
    }

    // ── Step 7: Fetch competitors (filter out own domain, social media) ──
    const BLOCKED_DOMAINS = [
      domain,
      "instagram.com", "facebook.com", "youtube.com", "twitter.com", "x.com",
      "tiktok.com", "linkedin.com", "pinterest.com", "reddit.com",
      "google.com", "google.com.br", "wikipedia.org",
    ];

    let competitors: Array<{ domain: string; overlap: number }> = [];
    try {
      const compRes = await getCompetitorDomains(domain);
      const compItems = compRes?.tasks?.[0]?.result?.[0]?.items ?? [];
      competitors = compItems
        .map((c: any) => ({ domain: c.domain ?? "", overlap: c.avg_position ?? 0 }))
        .filter((c: { domain: string }) => {
          const d = c.domain.toLowerCase();
          return !BLOCKED_DOMAINS.some(blocked => d.includes(blocked) || blocked.includes(d));
        })
        .slice(0, 5);
    } catch {
      // Competitors are optional
    }

    console.log(`[Analyze] Competitors: ${competitors.length}, Partner sites: ${partnerSitesCount}`);

    // ── Step 8: Use GPT to suggest niches — prefer GSC keywords (real data) ──
    let gptNicheSuggestions: string[] = [];
    const top10Kws = (gscKeywords?.length > 0 ? gscKeywords : keywords
      .filter((k: any) => k.position && k.position <= 100)
      .sort((a: any, b: any) => (a.position ?? 999) - (b.position ?? 999))
      .map((k: any) => k.keyword)
    ).slice(0, 10);

    console.log(`[Analyze] GPT input: ${top10Kws.length} keywords: ${top10Kws.join(", ")}`);

    // Must match NICHE_OPTIONS in onboarding/page.tsx exactly
    const VALID_NICHES = [
      "Tecnologia", "Saúde", "Finanças", "Educação", "E-commerce",
      "Marketing", "Jurídico", "Imobiliário", "Alimentação", "Automotivo",
      "Moda", "Beleza", "Pets", "Viagem", "Esportes",
      "Jogos", "Infantil", "Agronegócio", "Construção", "Sustentabilidade",
    ];

    if (process.env.OPENAI_API_KEY && top10Kws.length > 0) {
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
              content: `Classifique o nicho de um site. Escolha APENAS da lista abaixo. JSON array com 2 ou 3, do mais provável ao menos.

Keywords que o site rankeia no Google: ${top10Kws.join(", ")}

LISTA (use EXATAMENTE estes nomes, sem inventar): ${VALID_NICHES.join(", ")}

Responda APENAS o JSON array, nada mais: ["X","Y"]`,
            }],
            temperature: 0.2,
            max_tokens: 60,
          }),
        });

        if (gptRes.ok) {
          const gptData = await gptRes.json();
          const content = gptData.choices?.[0]?.message?.content?.trim() ?? "";
          console.log(`[Analyze] GPT raw response: ${content}`);
          try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              // Only keep niches that exist in the valid list
              gptNicheSuggestions = parsed.filter((n: string) => VALID_NICHES.includes(n)).slice(0, 3);
              console.log(`[Analyze] GPT niche suggestions (validated): ${gptNicheSuggestions.join(", ")}`);
            }
          } catch {
            console.log(`[Analyze] GPT response not valid JSON: ${content}`);
          }
        }
      } catch (e) {
        console.error("[Analyze] GPT niche detection failed:", e);
      }
    } else {
      console.log(`[Analyze] GPT skipped: API key=${!!process.env.OPENAI_API_KEY}, keywords=${top10Kws.length}`);
    }

    // Recalculate compatible niches using GPT result if available
    const finalNiche = gptNicheSuggestions[0] ?? nicheResult.primary;
    if (finalNiche !== "Geral") {
      compatibleNiches = getCompatibleNiches(finalNiche);
    }

    return NextResponse.json({
      domain,
      fullUrl,

      // Metrics
      da,
      backlinks: totalBacklinks,
      referringDomains,
      dofollowRatio: 100 - dofollowRatio,
      avgCpc,

      // Niche (GPT suggestions take priority, fallback to local detection)
      niche: gptNicheSuggestions[0] ?? nicheResult.primary,
      nicheSecondary: gptNicheSuggestions[1] ?? nicheResult.secondary,
      nicheSuggestions: gptNicheSuggestions.length > 0 ? gptNicheSuggestions : [nicheResult.primary, nicheResult.secondary].filter(Boolean),
      nicheSource: gptNicheSuggestions.length > 0 ? "gpt" : "local",
      nicheConfidence: nicheResult.confidence,
      nicheTopTerms: nicheResult.topTerms,
      nicheAllScores: nicheResult.scores,

      // Keywords
      keywords,
      totalRankedKeywords: rankedItems.length,

      // Page content (used for niche detection)
      pageTitle,
      metaDescription,
      headings: headings.slice(0, 10), // For debugging what the detector saw

      // Competitors
      competitors,

      // Partner sites
      partnerSites: partnerSitesCount,
      compatibleNiches,
    });
  } catch (error) {
    console.error("[Analyze] Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) });
  }
}
