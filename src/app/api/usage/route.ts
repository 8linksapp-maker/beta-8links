import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS, USAGE_LIMIT_MAP, USAGE_PERIOD, type UsageAction } from "@/lib/constants";

/**
 * GET /api/usage
 * Returns current usage for the authenticated user.
 * Daily actions count from today, monthly from 1st of month.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const planId = (profile?.plan_id || "starter") as keyof typeof PLANS;
  const plan = PLANS[planId] ?? PLANS.starter;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const actions: UsageAction[] = ["keyword_search", "keyword_plan", "article", "diagnostic", "backlink"];
  const usage: Record<string, { used: number; limit: number; remaining: number; period: string }> = {};

  for (const action of actions) {
    const limitKey = USAGE_LIMIT_MAP[action];
    const limit = plan.limits[limitKey] as number;
    const period = USAGE_PERIOD[action];
    const periodStart = period === "daily" ? dayStart : monthStart;

    const { count } = await supabase
      .from("usage_tracking")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action", action)
      .gte("created_at", periodStart);

    const used = count ?? 0;
    usage[action] = { used, limit, remaining: Math.max(0, limit - used), period };
  }

  return NextResponse.json({
    planId: plan.id,
    planName: plan.name,
    usage,
  });
}
