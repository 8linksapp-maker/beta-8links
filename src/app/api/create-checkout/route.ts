import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { planId } = await request.json();
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data: plan } = await supabase.from("plans").select("stripe_price_id").eq("id", planId).single();
    if (!plan?.stripe_price_id) return NextResponse.json({ error: "Plan has no Stripe price configured" });

    const { createCheckoutSession } = await import("@/lib/apis/stripe");
    const session = await createCheckoutSession({
      priceId: plan.stripe_price_id,
      customerEmail: user.email!,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
