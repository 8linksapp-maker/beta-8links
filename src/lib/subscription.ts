import { createClient } from "@/lib/supabase/server";

export type SubscriptionStatus = "active" | "trialing" | "canceled" | "past_due" | "inactive";

export interface SubscriptionCheck {
  isValid: boolean;
  status: SubscriptionStatus | null;
  planId: string | null;
  userId: string | null;
}

/**
 * Verifica se o usuário autenticado tem assinatura válida (active ou trialing).
 * Retorna um objeto com o status e validade.
 */
export async function checkSubscription(): Promise<SubscriptionCheck> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { isValid: false, status: null, planId: null, userId: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, plan_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { isValid: false, status: null, planId: null, userId: user.id };
  }

  const status = profile.subscription_status as SubscriptionStatus;
  const isValid = status === "active" || status === "trialing";

  return {
    isValid,
    status,
    planId: profile.plan_id,
    userId: user.id,
  };
}

/**
 * Middleware para ações que exigem assinatura válida.
 * Retorna um erro se o usuário não tiver assinatura ativa.
 */
export async function requireSubscription() {
  const check = await checkSubscription();

  if (!check.isValid) {
    return {
      error: check.status === "canceled"
        ? "Sua assinatura foi cancelada. Regularize para continuar usando."
        : check.status === "past_due"
        ? "Sua assinatura está com pendência. Atualize o pagamento para continuar."
        : "Assinatura necessária para esta ação.",
      status: check.status,
    };
  }

  return { userId: check.userId, status: check.status };
}
