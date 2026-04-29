import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Recovery flow → redirect to reset-password
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      // Normal auth flow (login, signup, magic link) → go to next or dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("[Auth Callback] Error exchanging code:", error);
    return NextResponse.redirect(`${origin}/login?error=auth&message=${encodeURIComponent(error.message)}`);
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
