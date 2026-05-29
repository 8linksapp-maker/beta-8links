import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VALID_PLANS = ["starter", "pro", "agency", "lifetime", "legacy"];

/**
 * Webhook Kiwify para processar pagamentos
 *
 * Eventos suportados:
 * - order_approved: Nova venda ou renovação aprovada
 * - order_refunded: Reembolso processado
 * - subscription_canceled: Assinatura cancelada
 * - subscription_renewed: Assinatura renovada
 * - subscription_failed: Pagamento da assinatura falhou
 */
export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const payload = await request.json();
    console.log("[Kiwify Webhook] Received:", JSON.stringify(payload, null, 2));

    // Kiwify envia os dados dentro de "order" ou na raiz
    const order = payload.order || payload;
    const eventType = order.webhook_event_type;

    if (!eventType) {
      console.error("[Kiwify] Event type not found");
      return NextResponse.json({ error: "Event type not found" }, { status: 400 });
    }

    if (eventType === "order_approved") {
      return handleOrderApproved(supabase, order);
    } else if (eventType === "order_refunded") {
      return handleOrderRefunded(supabase, order);
    } else if (eventType === "subscription_canceled") {
      return handleSubscriptionCanceled(supabase, order);
    } else if (eventType === "subscription_renewed") {
      return handleSubscriptionRenewed(supabase, order);
    } else if (eventType === "subscription_failed") {
      return handleSubscriptionFailed(supabase, order);
    }

    // Eventos como pix_created, pix_expired são ignorados
    console.log(`[Kiwify] Event type ignored: ${eventType}`);
    return NextResponse.json({ received: true, event: eventType });
  } catch (err) {
    console.error("[Kiwify Webhook] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}

async function handleOrderApproved(supabase: any, payload: any) {
  console.log("[Kiwify] Processing order_approved event...");

  const customerEmail = payload.Customer?.email;
  const subscriptionId = payload.subscription_id;
  const subscriptionStatus = payload.Subscription?.status || "active";
  const nextPaymentDate = payload.Subscription?.next_payment;

  // Detectar plano
  const rawPlanName = (payload.Subscription?.plan?.name || payload.Product?.name || "").toLowerCase();
  let planId = detectPlan(rawPlanName);

  console.log(`[Kiwify] Email: ${customerEmail}, Plan: ${planId}, Subscription: ${subscriptionId}`);

  if (!customerEmail || !planId) {
    console.error("[Kiwify] Validation failed: missing email or plan");
    return NextResponse.json({ error: "Payload missing required fields" }, { status: 400 });
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
    console.error("[Kiwify] Update failed, retrying in 3s...", error);
    await new Promise(resolve => setTimeout(resolve, 3000));

    const { error: retryError } = await supabase
      .from("profiles")
      .update({
        ...updateData,
        subscription_period_end: nextPaymentDate
          ? new Date(nextPaymentDate).toISOString()
          : null,
      })
      .eq("id", userId);

    if (retryError) {
      throw new Error(`Update failed on retry: ${retryError.message}`);
    }
  }

  console.log(`[Kiwify] Successfully processed for user ${userId}, plan ${planId}`);
  return NextResponse.json({ received: true, userId, planId });
}

async function handleOrderRefunded(supabase: any, payload: any) {
  console.log("[Kiwify] Processing order_refunded event...");

  const subscriptionId = payload.subscription_id;
  const orderStatus = "refunded";

  if (!subscriptionId) {
    console.error("[Kiwify] Validation failed: missing subscription_id");
    return NextResponse.json({ error: "Missing subscription_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ subscription_status: orderStatus })
    .eq("kiwify_subscription_id", subscriptionId);

  if (error) {
    throw new Error(`Failed to update refund: ${error.message}`);
  }

  console.log(`[Kiwify] Successfully processed refund for ${subscriptionId}`);
  return NextResponse.json({ received: true, subscriptionId });
}

async function handleSubscriptionCanceled(supabase: any, payload: any) {
  console.log("[Kiwify] Processing subscription_canceled event...");

  const subscriptionId = payload.subscription_id;
  const subscriptionStatus = payload.Subscription?.status || "canceled";

  if (!subscriptionId || !subscriptionStatus) {
    console.error("[Kiwify] Validation failed: missing subscription_id or status");
    return NextResponse.json({ error: "Missing subscription data" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ subscription_status: subscriptionStatus })
    .eq("kiwify_subscription_id", subscriptionId);

  if (error) {
    throw new Error(`Failed to update cancellation: ${error.message}`);
  }

  console.log(`[Kiwify] Successfully processed cancellation for ${subscriptionId}`);
  return NextResponse.json({ received: true, subscriptionId });
}

async function handleSubscriptionRenewed(supabase: any, payload: any) {
  console.log("[Kiwify] Processing subscription_renewed event...");

  const subscriptionId = payload.subscription_id;
  const nextPaymentDate = payload.Subscription?.next_payment;
  const subscriptionStatus = "active";

  if (!subscriptionId) {
    console.error("[Kiwify] Validation failed: missing subscription_id");
    return NextResponse.json({ error: "Missing subscription_id" }, { status: 400 });
  }

  const updateData = {
    subscription_status: subscriptionStatus,
    subscription_period_end: nextPaymentDate
      ? new Date(nextPaymentDate).toISOString()
      : null,
  };

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("kiwify_subscription_id", subscriptionId);

  if (error) {
    throw new Error(`Failed to update renewal: ${error.message}`);
  }

  console.log(`[Kiwify] Successfully processed renewal for ${subscriptionId}`);
  return NextResponse.json({ received: true, subscriptionId });
}

async function handleSubscriptionFailed(supabase: any, payload: any) {
  console.log("[Kiwify] Processing subscription_failed event...");

  const subscriptionId = payload.subscription_id;
  const subscriptionStatus = "past_due";

  if (!subscriptionId) {
    console.error("[Kiwify] Validation failed: missing subscription_id");
    return NextResponse.json({ error: "Missing subscription_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ subscription_status: subscriptionStatus })
    .eq("kiwify_subscription_id", subscriptionId);

  if (error) {
    throw new Error(`Failed to update failed payment: ${error.message}`);
  }

  console.log(`[Kiwify] Successfully processed failed payment for ${subscriptionId}`);
  return NextResponse.json({ received: true, subscriptionId });
}

function detectPlan(rawPlanName: string): string | null {
  if (!rawPlanName) return null;

  const planName = rawPlanName.toLowerCase();

  // Check exact matches first
  if (VALID_PLANS.includes(planName)) return planName;

  // Lifetime (inclui "8links lifetime", "8links lifetime 50%", etc)
  if (planName.includes("lifetime")) return "lifetime";

  // Legacy (inclui "Lançamento", "Pré lançamento", "Pre lancamento")
  if (planName.includes("lanç") || planName.includes("lanc") || planName.includes("pré") || planName.includes("pre")) return "legacy";

  // Bundle (Meu site com ia + 8links)
  if (planName.includes("meu site com ia") || planName.includes("meu_site_com_ia")) return "pro";

  // Mensais
  if (planName.includes("starter")) return "starter";
  if (planName.includes("pro")) return "pro";
  if (planName.includes("agency")) return "agency";

  return null;
}

async function findOrCreateUser(supabase: any, email: string): Promise<string | null> {
  // Try to find user by querying profiles directly
  console.log(`[Kiwify] Searching for user: ${email}`);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    console.warn(`[Kiwify] Profile query failed: ${profileError.message}`);
  }

  if (profile?.id) {
    console.log(`[Kiwify] User found: ${profile.id}`);
    return profile.id;
  }

  // Create new user via invite
  console.log(`[Kiwify] User not found, creating invite for: ${email}`);

  const { data: newUser, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);

  if (inviteError) {
    console.error(`[Kiwify] Failed to invite user: ${inviteError.message}`);
    throw new Error(`Failed to invite user: ${inviteError.message}`);
  }

  const userId = newUser.user.id;
  console.log(`[Kiwify] New user invited: ${userId}`);

  return userId;
}
