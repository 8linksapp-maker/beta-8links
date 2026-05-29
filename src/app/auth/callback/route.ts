import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const token = searchParams.get("token");
  const next = searchParams.get("next") ?? "/dashboard";

  // Invite flow - redirect to accept invite page
  if (type === "invite") {
    return NextResponse.redirect(`${origin}/auth/accept-invite`);
  }

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const user = data.user;

      // Check if user has a profile with plan_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_id")
        .eq("id", user.id)
        .single();

      // If no profile or no plan_id, redirect to accept-invite
      if (!profile || !profile.plan_id) {
        return NextResponse.redirect(`${origin}/auth/accept-invite`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("[Auth Callback] Error exchanging code:", error);
    return NextResponse.redirect(`${origin}/login?error=auth&message=${encodeURIComponent(error.message)}`);
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
