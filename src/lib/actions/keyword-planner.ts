"use server";

import { getKeywordSuggestions, analyzeSERP } from "@/lib/apis/dataforseo";

interface KeywordResult {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  trend: number[];
  intent: string;
}

export async function researchKeywords(seedKeyword: string) {
  // Check if DataForSEO is configured
  if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
    return { error: "DataForSEO not configured. Using mock data." };
  }

  try {
    const response = await getKeywordSuggestions(seedKeyword);

    const results = response?.tasks?.[0]?.result ?? [];
    const keywords: KeywordResult[] = [];

    for (const item of results) {
      if (item.items) {
        for (const kw of item.items.slice(0, 50)) {
          keywords.push({
            keyword: kw.keyword ?? "",
            volume: kw.keyword_info?.search_volume ?? 0,
            difficulty: kw.keyword_properties?.keyword_difficulty ?? 0,
            cpc: kw.keyword_info?.cpc ?? 0,
            trend: kw.keyword_info?.monthly_searches?.map((m: { search_volume: number }) => m.search_volume) ?? [],
            intent: kw.search_intent_info?.main_intent ?? "informational",
          });
        }
      }
    }

    // Sort by volume
    keywords.sort((a, b) => b.volume - a.volume);

    // Calculate averages
    const totalKeywords = keywords.length;
    const avgVolume = totalKeywords > 0 ? Math.round(keywords.reduce((a, k) => a + k.volume, 0) / totalKeywords) : 0;
    const avgDifficulty = totalKeywords > 0 ? Math.round(keywords.reduce((a, k) => a + k.difficulty, 0) / totalKeywords) : 0;
    const avgCpc = totalKeywords > 0 ? Number((keywords.reduce((a, k) => a + k.cpc, 0) / totalKeywords).toFixed(2)) : 0;

    // Volume distribution
    const volumeDistribution = [
      { range: "0-100", count: keywords.filter(k => k.volume <= 100).length },
      { range: "100-500", count: keywords.filter(k => k.volume > 100 && k.volume <= 500).length },
      { range: "500-1K", count: keywords.filter(k => k.volume > 500 && k.volume <= 1000).length },
      { range: "1K-5K", count: keywords.filter(k => k.volume > 1000 && k.volume <= 5000).length },
      { range: "5K-10K", count: keywords.filter(k => k.volume > 5000 && k.volume <= 10000).length },
      { range: "10K+", count: keywords.filter(k => k.volume > 10000).length },
    ];

    // Extract questions
    const questions = keywords
      .filter(k => k.keyword.match(/^(como|qual|quanto|por que|o que|quando|onde|quem|vale a pena)/i))
      .slice(0, 10);

    return {
      data: {
        seed: seedKeyword,
        totalKeywords,
        avgVolume,
        avgDifficulty,
        avgCpc,
        keywords: keywords.slice(0, 50),
        questions,
        volumeDistribution,
      }
    };
  } catch (error) {
    return { error: `DataForSEO error: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}
