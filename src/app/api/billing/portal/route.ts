import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Stripe customer ID from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, subscription_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      // Redirect to pricing page if no Stripe customer
      return NextResponse.redirect(new URL("/pricing", process.env.NEXT_PUBLIC_APP_URL));
    }

    // Create Stripe billing portal session
    const { createCustomerPortal } = await import("@/lib/apis/stripe");
    const session = await createCustomerPortal(profile.stripe_customer_id, process.env.NEXT_PUBLIC_APP_URL + "/settings");

    // Redirect to the portal URL
    return NextResponse.redirect(session.url);
  } catch (error) {
    console.error("[Billing Portal] Error:", error);
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 }
    );
  }
}
