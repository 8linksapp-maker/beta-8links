import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
        const email = session.customer_email;
        if (email) {
          // Find user by email and update subscription
          const { data: profiles } = await supabase.from("profiles").select("id").eq("email", email).limit(1);
          if (profiles?.[0]) {
            await supabase.from("profiles").update({
              subscription_status: "active",
              subscription_id: session.subscription,
              payment_provider: "stripe",
            }).eq("id", profiles[0].id);
          }
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        await supabase.from("profiles").update({
          subscription_status: subscription.status === "active" ? "active" : subscription.status === "trialing" ? "trialing" : "past_due",
        }).eq("subscription_id", subscription.id);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        await supabase.from("profiles").update({
          subscription_status: "canceled",
        }).eq("subscription_id", subscription.id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
