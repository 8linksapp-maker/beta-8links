import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";

/**
 * Endpoint de teste para simular webhook da Kiwify com produto real
 * USE APENAS PARA TESTES - remova após validar
 */
export async function POST() {
  const supabase = createClient();

  // Payload simulando produto REAL "Meu site com ia + 8links"
  const payload = {
    order_id: "test-" + Date.now(),
    order_status: "paid",
    webhook_event_type: "order_approved",
    Customer: {
      email: "bloghouse021@gmail.com",
    },
    Subscription: {
      id: "test-sub-" + Date.now(),
      status: "active",
      next_payment: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // +1 ano
      plan: {
        name: "Meu site com ia + 8links",
      },
    },
  };

  console.log("[Test Kiwify] Simulando webhook:", JSON.stringify(payload, null, 2));

  const customerEmail = payload.Customer?.email;
  const subscriptionId = payload.subscription_id;
  const subscriptionStatus = payload.Subscription?.status || "active";
  const nextPaymentDate = payload.Subscription?.next_payment;

  // Detectar plano
  const rawPlanName = (payload.Subscription?.plan?.name || "").toLowerCase();
  let planId = detectPlan(rawPlanName);

  console.log(`[Test Kiwify] Email: ${customerEmail}, Plan: ${planId}, Subscription: ${subscriptionId}`);

  if (!customerEmail || !planId) {
    console.error("[Test Kiwify] Validation failed: missing email or plan");
    return NextResponse.json({ error: "Payload missing required fields", planName: rawPlanName }, { status: 400 });
  }

  // Buscar ou criar usuário
  const userId = await findOrCreateUser(supabase, customerEmail);
  if (!userId) {
    throw new Error("Failed to find or create user");
  }

  // Preparar dados de atualização
  const updateData = {
    subscription_status: subscriptionStatus,
    plan_id: planId,
    payment_provider: "kiwify",
    subscription_id: subscriptionId || payload.order_id || null,
  };

  // Atualizar perfil
  const { error } = await supabase
    .from("profiles")
    .update({
      ...updateData,
      subscription_period_end: nextPaymentDate
        ? new Date(nextPaymentDate).toISOString()
        : null,
    })
    .eq("id", userId);

  if (error) {
    console.error("[Test Kiwify] Update failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[Test Kiwify] Successfully processed for user ${userId}, plan ${planId}`);
  return NextResponse.json({
    success: true,
    userId,
    planId,
    subscriptionId,
    nextPayment: nextPaymentDate
  });
}

function detectPlan(rawPlanName: string): string | null {
  if (!rawPlanName) return null;

  const planName = rawPlanName.toLowerCase();

  // Bundle (Meu site com ia + 8links)
  if (planName.includes("meu site com ia") || planName.includes("meu_site_com_ia")) return "pro";

  // Mensais
  if (planName.includes("starter")) return "starter";
  if (planName.includes("pro")) return "pro";
  if (planName.includes("agency")) return "agency";
  if (planName.includes("lifetime")) return "lifetime";
  if (planName.includes("lanç") || planName.includes("lanc") || planName.includes("pré") || planName.includes("pre")) return "legacy";

  return null;
}

async function findOrCreateUser(supabase: any, email: string): Promise<string | null> {
  console.log(`[Test Kiwify] Searching for user: ${email}`);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    console.warn(`[Test Kiwify] Profile query failed: ${profileError.message}`);
  }

  if (profile?.id) {
    console.log(`[Test Kiwify] User found: ${profile.id}`);
    return profile.id;
  }

  // Create new user via invite
  console.log(`[Test Kiwify] User not found, creating invite for: ${email}`);

  const { data: newUser, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);

  if (inviteError) {
    console.error(`[Test Kiwify] Failed to invite user: ${inviteError.message}`);
    throw new Error(`Failed to invite user: ${inviteError.message}`);
  }

  const userId = newUser.user.id;
  console.log(`[Test Kiwify] New user invited: ${userId}`);

  return userId;
}
