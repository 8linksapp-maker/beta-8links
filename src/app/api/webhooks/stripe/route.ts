import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mapeia Price ID do Stripe para o ID interno do plano
const PRICE_TO_PLAN: Record<string, string> = {
  "price_1S3PvoDssGMGr4ApVHjLcKBy": "starter",
  "price_1S3PwCDssGMGr4ApXhYzENaK": "pro",
  "price_1S3PwdDssGMGr4ApVu7rU8kB": "agency",
  "price_1S3finDssGMGr4ApW7wWdEOK": "club",
  "price_1S3fgvDssGMGr4Ap2KNREK4i": "legacy_monthly",
};

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SIGNING_SECRET) {
    console.log("[Stripe Webhook] Not configured");
    return NextResponse.json({ received: true });
  }

  try {
    const { constructWebhookEvent } = await import("@/lib/apis/stripe");
    const event = constructWebhookEvent(body, sig!);
    const supabase = await createClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;

        // Sessão de setup (adicionar método de pagamento)
        if (session.mode === "setup") {
          console.log(`[Stripe] SetupIntent concluído para customer: ${session.customer}`);
          break;
        }

        // Sessão de assinatura
        if (session.mode === "subscription") {
          const email = session.customer_details?.email;
          if (!email) {
            console.error("[Stripe] Session sem email do customer");
            break;
          }

          // Busca usuário pelo email
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, subscription_id")
            .eq("email", email)
            .limit(1);

          if (!profiles || profiles.length === 0) {
            console.error(`[Stripe] Usuário não encontrado: ${email}`);
            break;
          }

          const userId = profiles[0].id;
          const oldSubscriptionId = profiles[0].subscription_id;

          // Busca detalhes da assinatura para pegar o price_id
          const subscription = await fetchStripeSubscription(session.subscription);
          if (!subscription) {
            console.error("[Stripe] Não foi possível buscar assinatura");
            break;
          }

          const priceId = subscription.items?.data?.[0]?.price?.id;
          const planId = priceId ? PRICE_TO_PLAN[priceId] : null;

          // Determina status e período
          const isTrialing = subscription.status === "trialing";
          const periodEnd = isTrialing
            ? subscription.trial_end
            : subscription.current_period_end;

          // Cancela assinatura antiga se existir
          if (oldSubscriptionId && oldSubscriptionId !== session.subscription) {
            try {
              const oldSub = await fetchStripeSubscription(oldSubscriptionId);
              if (oldSub && ["active", "trialing", "past_due"].includes(oldSub.status)) {
                await cancelStripeSubscription(oldSubscriptionId);
                console.log(`[Stripe] Cancelada assinatura antiga: ${oldSubscriptionId}`);
              }
            } catch (err) {
              console.error(`[Stripe] Erro ao cancelar assinatura antiga: ${err}`);
            }
          }

          // Atualiza perfil com nova assinatura
          const updateData: Record<string, any> = {
            subscription_status: subscription.status,
            subscription_id: subscription.id,
            payment_provider: "stripe",
          };

          if (planId) {
            updateData.plan_id = planId;
          }

          if (periodEnd) {
            updateData.credits_reset_at = new Date(periodEnd * 1000).toISOString();
          }

          await supabase.from("profiles").update(updateData).eq("id", userId);
          console.log(`[Stripe] Usuário ${userId} atualizado para plano ${planId}`);
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as any;
        const email = await getCustomerEmail(subscription.customer);
        if (!email) break;

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .limit(1);

        if (profiles?.[0]) {
          await supabase.from("profiles").update({
            subscription_status: subscription.status,
            subscription_id: subscription.id,
            payment_provider: "stripe",
          }).eq("id", profiles[0].id);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;

        // Busca status atual no banco
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, subscription_id")
          .eq("subscription_id", subscription.id)
          .single();

        if (!profile) {
          // Tenta buscar pelo email do customer
          const email = await getCustomerEmail(subscription.customer);
          if (email) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", email)
              .limit(1);

            if (profiles?.[0]) {
              await supabase.from("profiles").update({
                subscription_status: subscription.status,
              }).eq("id", profiles[0].id);
            }
          }
        } else {
          await supabase.from("profiles").update({
            subscription_status: subscription.status,
          }).eq("id", profile.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("subscription_id", subscription.id)
          .single();

        if (profile) {
          await supabase.from("profiles").update({
            subscription_status: "canceled",
          }).eq("id", profile.id);
          console.log(`[Stripe] Assinatura cancelada: ${subscription.id}`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        if (!invoice.subscription) break;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, subscription_id")
          .eq("subscription_id", invoice.subscription)
          .single();

        if (profile) {
          const subscription = await fetchStripeSubscription(invoice.subscription as string);
          if (subscription) {
            const periodEnd = subscription.current_period_end;
            await supabase.from("profiles").update({
              subscription_status: subscription.status,
              credits_reset_at: new Date(periodEnd * 1000).toISOString(),
            }).eq("id", profile.id);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        if (!invoice.subscription) break;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("subscription_id", invoice.subscription)
          .single();

        if (profile) {
          await supabase.from("profiles").update({
            subscription_status: "past_due",
          }).eq("id", profile.id);
          console.log(`[Stripe] Pagamento falhou para usuário ${profile.id}`);
        }
        break;
      }

      default:
        console.log(`[Stripe] Evento não tratado: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}

// Helpers para chamar a API do Stripe
async function fetchStripeSubscription(subscriptionId: string) {
  try {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      headers: {
        "Authorization": `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Stripe-Version": "2025-02-24.acacia",
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function cancelStripeSubscription(subscriptionId: string) {
  try {
    await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Stripe-Version": "2025-02-24.acacia",
      },
    });
  } catch {}
}

async function getCustomerEmail(customerId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
      headers: {
        "Authorization": `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Stripe-Version": "2025-02-24.acacia",
      },
    });
    if (!res.ok) return null;
    const customer = await res.json();
    return customer.email || null;
  } catch {
    return null;
  }
}
