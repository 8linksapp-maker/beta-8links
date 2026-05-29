import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const token = searchParams.get("token");
  const next = searchParams.get("next") ?? "/dashboard";

  // Invite flow - redirect to accept invite page with token
  if (type === "invite" && token) {
    return NextResponse.redirect(`${origin}/auth/accept-invite?token=${token}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // next is set by the page that initiated the flow:
      // - forgot-password sets next=/reset-password
      // - login/register defaults to /dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("[Auth Callback] Error exchanging code:", error);
    return NextResponse.redirect(`${origin}/login?error=auth&message=${encodeURIComponent(error.message)}`);
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
