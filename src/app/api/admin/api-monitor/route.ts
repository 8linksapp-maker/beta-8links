import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUsdBrlRate } from "@/lib/utils/exchange-rate";

/**
 * GET /api/admin/api-monitor?period=month|week|today|custom&from=ISO&to=ISO
 * Returns API usage stats with cost estimates.
 */
export async function GET(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "month";
  const customFrom = searchParams.get("from");
  const customTo = searchParams.get("to");

  const now = new Date();
  let periodStart: string;
  let periodEnd: string = now.toISOString();
  let periodLabel: string;

  switch (period) {
    case "today":
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      periodLabel = "Hoje";
      break;
    case "week":
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      periodStart = weekAgo.toISOString();
      periodLabel = "Últimos 7 dias";
      break;
    case "custom":
      periodStart = customFrom ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      periodEnd = customTo ?? now.toISOString();
      periodLabel = `${new Date(periodStart).toLocaleDateString("pt-BR")} — ${new Date(periodEnd).toLocaleDateString("pt-BR")}`;
      break;
    default: // month
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      periodLabel = now.toLocaleString("pt-BR", { month: "long", year: "numeric" });
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // ── Usage tracking ──
  const { data: usageRows } = await supabase
    .from("usage_tracking")
    .select("action, created_at, user_id, cost_usd, tokens_input, tokens_output")
    .gte("created_at", periodStart)
    .lte("created_at", periodEnd);

  const usageByAction: Record<string, {
    period: number;
    today: number;
    realCalls: number;
    realCostUsd: number;
    realTokensInput: number;
    realTokensOutput: number;
  }> = {};
  const uniqueUsers = new Set<string>();

  for (const row of usageRows ?? []) {
    if (!usageByAction[row.action]) {
      usageByAction[row.action] = { period: 0, today: 0, realCalls: 0, realCostUsd: 0, realTokensInput: 0, realTokensOutput: 0 };
    }
    const bucket = usageByAction[row.action];
    bucket.period++;
    if (row.created_at >= todayStart) bucket.today++;
    if (row.cost_usd != null) {
      bucket.realCalls++;
      bucket.realCostUsd += Number(row.cost_usd);
      bucket.realTokensInput += row.tokens_input ?? 0;
      bucket.realTokensOutput += row.tokens_output ?? 0;
    }
    uniqueUsers.add(row.user_id);
  }

  // ── Backlink stats for period ──
  const { count: totalBacklinks } = await supabase
    .from("backlinks").select("id", { count: "exact", head: true })
    .gte("created_at", periodStart).lte("created_at", periodEnd);

  const { count: publishedBacklinks } = await supabase
    .from("backlinks").select("id", { count: "exact", head: true })
    .eq("status", "published").gte("created_at", periodStart).lte("created_at", periodEnd);

  const { count: errorBacklinks } = await supabase
    .from("backlinks").select("id", { count: "exact", head: true })
    .eq("status", "error");

  const { count: queuedBacklinks } = await supabase
    .from("backlinks").select("id", { count: "exact", head: true })
    .eq("status", "queued");

  // ── Articles for period ──
  const { count: articlesCount } = await supabase
    .from("articles").select("id", { count: "exact", head: true })
    .gte("created_at", periodStart).lte("created_at", periodEnd);

  // ── Article status breakdown for period ──
  const { data: articleStatuses } = await supabase
    .from("articles").select("status, created_at, published_at")
    .gte("created_at", periodStart).lte("created_at", periodEnd);

  const articleByStatus: Record<string, number> = {};
  for (const a of articleStatuses ?? []) {
    articleByStatus[a.status] = (articleByStatus[a.status] ?? 0) + 1;
  }

  // ── Backlink success rate (period) ──
  const { count: errorBacklinksPeriod } = await supabase
    .from("backlinks").select("id", { count: "exact", head: true })
    .eq("status", "error").gte("created_at", periodStart).lte("created_at", periodEnd);

  const successDenominator = (publishedBacklinks ?? 0) + (errorBacklinksPeriod ?? 0);
  const successRate = successDenominator > 0
    ? Math.round(((publishedBacklinks ?? 0) / successDenominator) * 100)
    : null;

  // ── Inactive users (no usage in last 14 days) ──
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const { data: recentActiveRows } = await supabase
    .from("usage_tracking").select("user_id")
    .gte("created_at", fourteenDaysAgo.toISOString());
  const recentlyActiveIds = new Set((recentActiveRows ?? []).map(r => r.user_id));

  const { data: allProfiles } = await supabase
    .from("profiles").select("id, subscription_status").in("subscription_status", ["active", "trialing"]);
  const totalActiveProfiles = (allProfiles ?? []).length;
  const inactiveCount = (allProfiles ?? []).filter(p => !recentlyActiveIds.has(p.id)).length;

  // ── Cache stats ──
  const { count: cachedSeeds } = await supabase
    .from("keyword_suggestions_cache").select("id", { count: "exact", head: true });

  // ── Daily breakdown (for chart) ──
  const { data: dailyUsage } = await supabase
    .from("usage_tracking")
    .select("action, created_at")
    .gte("created_at", periodStart)
    .lte("created_at", periodEnd)
    .order("created_at");

  const dailyMap: Record<string, Record<string, number>> = {};
  for (const row of dailyUsage ?? []) {
    const day = row.created_at.split("T")[0];
    if (!dailyMap[day]) dailyMap[day] = {};
    dailyMap[day][row.action] = (dailyMap[day][row.action] ?? 0) + 1;
  }
  const dailyBreakdown = Object.entries(dailyMap)
    .map(([date, actions]) => ({ date, ...actions }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ── Recent backlinks ──
  const { data: recentBacklinks } = await supabase
    .from("backlinks")
    .select("id, anchor_text, status, error_message, article_title, created_at, published_at, user_id")
    .gte("created_at", periodStart)
    .lte("created_at", periodEnd)
    .order("created_at", { ascending: false })
    .limit(30);

  // ── Per-user usage ──
  const userUsage: Record<string, { total: number; actions: Record<string, number> }> = {};
  for (const row of usageRows ?? []) {
    if (!userUsage[row.user_id]) userUsage[row.user_id] = { total: 0, actions: {} };
    userUsage[row.user_id].total++;
    userUsage[row.user_id].actions[row.action] = (userUsage[row.user_id].actions[row.action] ?? 0) + 1;
  }

  // Get user emails for top users
  const topUserIds = Object.entries(userUsage).sort((a, b) => b[1].total - a[1].total).slice(0, 10).map(([id]) => id);
  const { data: userProfiles } = await supabase.from("profiles").select("id, email, name, plan_id").in("id", topUserIds);
  const userMap = new Map((userProfiles ?? []).map(p => [p.id, p]));

  const topUsers = topUserIds.map(id => ({
    id,
    email: userMap.get(id)?.email ?? "—",
    name: userMap.get(id)?.name ?? "",
    plan: userMap.get(id)?.plan_id ?? "starter",
    ...userUsage[id],
  }));

  // ── Costs (estimated unit costs — see KB/07-CUSTOS-DATAFORSEO.md) ──
  // Only includes actions that are actually tracked in usage_tracking.
  // Backlink/article costs vary by article size; values here are upper-bound estimates.
  const COST_PER_ACTION: Record<string, { dataforseo: number; openai: number; label: string }> = {
    keyword_search:  { dataforseo: 0.012, openai: 0,     label: "Pesquisa keyword" },
    keyword_plan:    { dataforseo: 0.120, openai: 0.007, label: "Descoberta automática" },
    backlink:        { dataforseo: 0.002, openai: 0.013, label: "Backlink (SERP+artigo)" },
    article:         { dataforseo: 0.002, openai: 0.011, label: "Artigo avulso" },
  };

  const costBreakdown: Record<string, {
    calls: number;
    dataforseo: number;
    openai: number;
    total: number;
    realCalls: number;
    realCostUsd: number;
    estimatedCalls: number;
  }> = {};
  let totalDataForSEO = 0;
  let totalOpenAI = 0;
  let totalRealCalls = 0;
  let totalEstimatedCalls = 0;

  for (const [action, unit] of Object.entries(COST_PER_ACTION)) {
    const bucket = usageByAction[action];
    const calls = bucket?.period ?? 0;
    const realCalls = bucket?.realCalls ?? 0;
    const realCost = bucket?.realCostUsd ?? 0;
    const estimatedCalls = calls - realCalls;

    // DataForSEO is fixed per call (no per-call tracking — every call costs the same).
    const df = calls * unit.dataforseo;
    // OpenAI: real cost where we have it, estimated for the rest.
    const ai = realCost + (estimatedCalls * unit.openai);

    costBreakdown[action] = {
      calls,
      dataforseo: df,
      openai: ai,
      total: df + ai,
      realCalls,
      realCostUsd: realCost,
      estimatedCalls,
    };
    totalDataForSEO += df;
    totalOpenAI += ai;
    totalRealCalls += realCalls;
    totalEstimatedCalls += estimatedCalls;
  }

  const totalUSD = totalDataForSEO + totalOpenAI;
  const usdBrlRate = getUsdBrlRate();
  const totalTrackedCalls = totalRealCalls + totalEstimatedCalls;
  const accuracyPct = totalTrackedCalls > 0
    ? Math.round((totalRealCalls / totalTrackedCalls) * 100)
    : 0;
  const costs = {
    perAction: COST_PER_ACTION,
    breakdown: costBreakdown,
    dataforseoTotal: totalDataForSEO,
    openaiTotal: totalOpenAI,
    totalUSD,
    totalBRL: totalUSD * usdBrlRate,
    usdBrlRate,
    realCalls: totalRealCalls,
    estimatedCalls: totalEstimatedCalls,
    accuracyPct,
  };

  return NextResponse.json({
    period: { label: periodLabel, start: periodStart, end: periodEnd, type: period },
    usage: usageByAction,
    uniqueUsers: uniqueUsers.size,
    backlinks: {
      total: totalBacklinks ?? 0,
      published: publishedBacklinks ?? 0,
      errors: errorBacklinks ?? 0,
      errorsPeriod: errorBacklinksPeriod ?? 0,
      queued: queuedBacklinks ?? 0,
      successRate,
    },
    articles: { count: articlesCount ?? 0, byStatus: articleByStatus },
    health: {
      activeProfiles: totalActiveProfiles,
      inactive14d: inactiveCount,
      recentlyActive: recentlyActiveIds.size,
    },
    cache: { keywordSeeds: cachedSeeds ?? 0 },
    costs,
    dailyBreakdown,
    topUsers,
    recentBacklinks: recentBacklinks ?? [],
  });
}
