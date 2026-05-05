import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { planAnchors, classifyAnchor, type AnchorPlan } from "@/lib/anchors";

const NICHE_COMPAT: Record<string, string[]> = {
  "Tecnologia": ["Marketing", "Jogos", "E-commerce", "Educação", "Finanças"],
  "Saúde": ["Esportes", "Alimentação", "Beleza", "Sustentabilidade", "Infantil"],
  "Finanças": ["E-commerce", "Marketing", "Educação", "Jurídico", "Tecnologia", "Imobiliário"],
  "Educação": ["Tecnologia", "Marketing", "Finanças", "Infantil"],
  "E-commerce": ["Marketing", "Tecnologia", "Moda", "Finanças", "Beleza"],
  "Marketing": ["Tecnologia", "E-commerce", "Educação", "Finanças"],
  "Jurídico": ["Finanças", "Imobiliário", "Educação"],
  "Imobiliário": ["Construção", "Finanças", "Jurídico"],
  "Alimentação": ["Saúde", "Sustentabilidade", "Agronegócio", "Viagem"],
  "Automotivo": ["Tecnologia", "E-commerce", "Esportes", "Finanças"],
  "Moda": ["Beleza", "E-commerce", "Sustentabilidade", "Viagem"],
  "Beleza": ["Saúde", "Moda", "E-commerce", "Alimentação"],
  "Pets": ["Saúde", "E-commerce", "Agronegócio"],
  "Viagem": ["Alimentação", "Esportes", "Sustentabilidade", "Moda"],
  "Esportes": ["Saúde", "Alimentação", "Tecnologia"],
  "Jogos": ["Tecnologia", "Esportes", "E-commerce"],
  "Infantil": ["Educação", "Saúde", "E-commerce", "Alimentação"],
  "Agronegócio": ["Alimentação", "Sustentabilidade", "Pets"],
  "Construção": ["Imobiliário", "Sustentabilidade", "Tecnologia"],
  "Sustentabilidade": ["Alimentação", "Construção", "Agronegócio", "Tecnologia"],
};

type NetworkSite = { id: string; niche: string | null; da: number };

/** Score a network site against the user's niche. Higher = better match. */
function scoreSite(site: NetworkSite, userNiche: string | null): number {
  const da = site.da ?? 0;
  // DA contributes up to ~30 points
  const daScore = Math.min(30, Math.round(da * 0.6));
  if (!userNiche || !site.niche) return daScore;

  const userLower = userNiche.toLowerCase();
  const netLower = site.niche.toLowerCase();

  if (netLower === userLower) return 70 + daScore;
  if (NICHE_COMPAT[userNiche]?.includes(site.niche) || NICHE_COMPAT[site.niche]?.includes(userNiche)) {
    return 50 + daScore;
  }
  // Related (shared neighbor)
  const userCompat = new Set(NICHE_COMPAT[userNiche] ?? []);
  const netCompat = NICHE_COMPAT[site.niche] ?? [];
  if (netCompat.some(n => userCompat.has(n))) return 35 + daScore;
  return daScore;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json();
  const { siteId, keyword, targetUrl, anchor, count, anchors: customAnchors } = body as {
    siteId?: string; keyword?: string; targetUrl?: string;
    anchor?: string; count?: number; anchors?: string[];
  };

  if (!siteId || !keyword || !targetUrl) {
    return NextResponse.json({ error: "Faltam dados pra criar o backlink" }, { status: 400 });
  }

  const requested = Math.max(1, Math.min(50, Number(count) || 1));

  // Verify ownership
  const { data: site } = await supabase
    .from("client_sites")
    .select("id, niche_primary, url")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .single();
  if (!site) return NextResponse.json({ error: "Site não encontrado" }, { status: 404 });

  // Domain lock: targetUrl must point to the registered site's domain.
  const hostOf = (u: string) => {
    try {
      return new URL(u.startsWith("http") ? u : `https://${u}`).hostname.replace(/^www\./, "");
    } catch { return ""; }
  };
  const siteHost = hostOf(site.url);
  const targetHost = hostOf(targetUrl);
  if (!siteHost || !targetHost || siteHost !== targetHost) {
    return NextResponse.json({
      error: "A página de destino precisa ser do seu site cadastrado.",
    }, { status: 400 });
  }

  const autoPlan = planAnchors({
    keyword,
    targetUrl,
    count: requested,
    customAnchor: anchor,
  });

  // If the user typed custom anchors line-by-line, use them. Empty lines fall
  // back to the auto plan for that index, so a partial override still works.
  const finalPlan: AnchorPlan[] = autoPlan.map((auto, i) => {
    const override = customAnchors?.[i]?.trim();
    if (!override) return auto;
    return { text: override, type: classifyAnchor({ text: override, keyword, targetUrl }) };
  });

  // Load active network sites
  const { data: networkSites } = await supabase
    .from("network_sites")
    .select("id, niche, da")
    .eq("status", "active");

  if (!networkSites || networkSites.length === 0) {
    return NextResponse.json({
      error: "Nenhum site parceiro disponível agora. Tente em alguns minutos.",
    }, { status: 503 });
  }

  // Score and pick top N
  const ranked = (networkSites as NetworkSite[])
    .map(s => ({ ...s, score: scoreSite(s, site.niche_primary) }))
    .sort((a, b) => b.score - a.score);

  // Round-robin pick: cycle through the top results to spread the backlinks across different domains
  const picked: NetworkSite[] = [];
  const pool = ranked.slice(0, Math.max(requested, Math.min(ranked.length, 10)));
  for (let i = 0; i < requested; i++) {
    picked.push(pool[i % pool.length]);
  }

  // Build rows — each backlink gets a distinct anchor from the plan to avoid
  // exact-match over-optimization (Penguin penalty).
  const rows = picked.map((p, i) => {
    const a = finalPlan[i] ?? finalPlan[finalPlan.length - 1];
    return {
      user_id: user.id,
      client_site_id: siteId,
      network_site_id: p.id,
      target_url: targetUrl,
      anchor_text: a.text,
      anchor_type: a.type,
      status: "queued" as const,
    };
  });

  const { data: inserted, error } = await supabase.from("backlinks").insert(rows).select("id");
  if (error) {
    console.error("[create-batch] insert failed:", error);
    return NextResponse.json({ error: "Não conseguimos criar agora. Tente de novo." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    created: inserted?.length ?? 0,
    ids: inserted?.map(b => b.id) ?? [],
  });
}
