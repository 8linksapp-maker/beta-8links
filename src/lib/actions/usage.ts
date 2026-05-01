"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { PLANS, USAGE_LIMIT_MAP, USAGE_PERIOD, type UsageAction } from "@/lib/constants";

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Start of current month (UTC) */
function getMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/** Start of today (UTC) */
function getDayStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

/** Get the period start for an action */
function getPeriodStart(action: UsageAction): string {
  return USAGE_PERIOD[action] === "daily" ? getDayStart() : getMonthStart();
}

/** Get user's plan from profile */
async function getUserPlan(userId: string) {
  const admin = getAdmin();
  const { data } = await admin
    .from("profiles")
    .select("plan_id")
    .eq("id", userId)
    .single();

  const planId = (data?.plan_id || "starter") as keyof typeof PLANS;
  return PLANS[planId] ?? PLANS.starter;
}

/**
 * Check if user can perform an action
 */
export async function checkUsageLimit(
  userId: string,
  action: UsageAction
): Promise<{ allowed: boolean; used: number; limit: number; remaining: number; period: "daily" | "monthly" }> {
  const plan = await getUserPlan(userId);
  const limitKey = USAGE_LIMIT_MAP[action];
  const limit = plan.limits[limitKey] as number;
  const period = USAGE_PERIOD[action];
  const periodStart = getPeriodStart(action);

  const admin = getAdmin();
  const { count } = await admin
    .from("usage_tracking")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", periodStart);

  const used = count ?? 0;
  const remaining = Math.max(0, limit - used);

  return { allowed: remaining > 0, used, limit, remaining, period };
}

/**
 * Track a usage event
 */
export async function trackUsage(
  userId: string,
  action: UsageAction,
  referenceId?: string
): Promise<void> {
  const admin = getAdmin();
  await admin.from("usage_tracking").insert({
    user_id: userId,
    action,
    reference_id: referenceId,
  });
}

/**
 * Record real cost for a usage event after the underlying API calls finish.
 *
 * `useActionOrFail` inserts a row up-front (so we can enforce limits before
 * any work happens). This UPDATEs that row with the actual tokens/cost once
 * the OpenAI/Claude response is in. Matches by (user_id, action, reference_id)
 * — pass the same referenceId you used at trackUsage time.
 *
 * Silent failure: if the row isn't found we just log; we never want cost
 * tracking to break the user-facing flow.
 */
export async function recordUsageCost(
  userId: string,
  action: UsageAction,
  referenceId: string,
  payload: {
    tokensInput?: number;
    tokensOutput?: number;
    costUsd?: number;
    model?: string;
  }
): Promise<void> {
  if (!referenceId) return;
  const admin = getAdmin();
  const { error } = await admin
    .from("usage_tracking")
    .update({
      tokens_input: payload.tokensInput ?? null,
      tokens_output: payload.tokensOutput ?? null,
      cost_usd: payload.costUsd ?? null,
      model: payload.model ?? null,
    })
    .eq("user_id", userId)
    .eq("action", action)
    .eq("reference_id", referenceId);

  if (error) {
    console.error(`[recordUsageCost] failed for ${action}/${referenceId}: ${error.message}`);
  }
}

/**
 * Check limit + track in one call.
 * Returns error string if limit exceeded, null if OK.
 */
export async function useActionOrFail(
  userId: string,
  action: UsageAction,
  referenceId?: string
): Promise<{ error?: string; used?: number; limit?: number; remaining?: number }> {
  const { allowed, used, limit, remaining, period } = await checkUsageLimit(userId, action);

  if (!allowed) {
    const actionLabels: Record<UsageAction, string> = {
      keyword_search: "pesquisas de keywords",
      keyword_plan: "descobertas automáticas",
      article: "artigos IA",
      diagnostic: "diagnósticos",
      backlink: "backlinks",
    };
    const periodLabel = period === "daily" ? "diário" : "mensal";
    return {
      error: `Limite ${periodLabel} de ${actionLabels[action]} atingido (${used}/${limit}). ${period === "daily" ? "Tente novamente amanhã." : "Faça upgrade para continuar."}`,
      used,
      limit,
      remaining: 0,
    };
  }

  await trackUsage(userId, action, referenceId);
  return { used: used + 1, limit, remaining: remaining - 1 };
}

/**
 * Get all usage stats for a user
 */
export async function getUsageSummary(userId: string) {
  const plan = await getUserPlan(userId);
  const actions: UsageAction[] = ["keyword_search", "keyword_plan", "article", "diagnostic", "backlink"];
  const admin = getAdmin();

  const results: Record<string, { used: number; limit: number; remaining: number; period: "daily" | "monthly" }> = {};

  for (const action of actions) {
    const limitKey = USAGE_LIMIT_MAP[action];
    const limit = plan.limits[limitKey] as number;
    const period = USAGE_PERIOD[action];
    const periodStart = getPeriodStart(action);

    const { count } = await admin
      .from("usage_tracking")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", action)
      .gte("created_at", periodStart);

    const used = count ?? 0;
    results[action] = {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      period,
    };
  }

  return { planName: plan.name, planId: plan.id, usage: results };
}
