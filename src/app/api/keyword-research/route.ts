import { NextResponse } from "next/server";
import { getKeywordSuggestions } from "@/lib/apis/dataforseo";
import { createClient } from "@/lib/supabase/server";
import { useActionOrFail } from "@/lib/actions/usage";

/**
 * POST /api/keyword-research
 * Body: { keyword: string, siteId?: string }
 *
 * Manual keyword search (like Semrush Keyword Magic Tool).
 * Uses getKeywordSuggestions (cached) — $0.012 per unique seed.
 * Returns results with `inList` flag if keyword already saved.
 * Costs 1 "keyword_plan" per search.
 */
export async function POST(request: Request) {
  const { keyword, siteId } = await request.json();
  if (!keyword?.trim()) return NextResponse.json({ error: "Digite uma palavra-chave para pesquisar." }, { status: 400 });

  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sua sessão expirou. Recarregue a página e faça login novamente." }, { status: 401 });

  // Check daily search limit (separate from auto discovery)
  const usage = await useActionOrFail(user.id, "keyword_search", keyword.trim());
  if (usage.error) return NextResponse.json({ error: usage.error, usage }, { status: 429 });

  try {
    const result = await getKeywordSuggestions(keyword.trim());
    const items = result?.tasks?.[0]?.result?.[0]?.items ?? [];

    // Get user's existing keywords to mark "inList"
    let existingKeywords = new Set<string>();
    if (siteId) {
      const supabase = await createClient();
      const { data } = await supabase
        .from("keywords")
        .select("keyword")
        .eq("client_site_id", siteId)
        .eq("source", "dataforseo");
      if (data) existingKeywords = new Set(data.map(k => k.keyword.toLowerCase()));
    }

    const keywords = items
      .map((item: any) => ({
        keyword: item?.keyword ?? "",
        volume: item?.keyword_info?.search_volume ?? 0,
        difficulty: Math.round(item?.keyword_properties?.keyword_difficulty ?? 0),
        cpc: item?.keyword_info?.cpc ?? 0,
      }))
      .filter((k: any) => k.volume > 0 && k.keyword.length > 3)
      .sort((a: any, b: any) => b.volume - a.volume)
      .map((k: any) => ({
        ...k,
        inList: existingKeywords.has(k.keyword.toLowerCase()),
      }));

    return NextResponse.json({
      seed: keyword.trim(),
      keywords,
      total: keywords.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro ao pesquisar" }, { status: 500 });
  }
}
