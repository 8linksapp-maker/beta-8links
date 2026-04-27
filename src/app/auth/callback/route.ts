import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // After exchanging code, check if user has a session and where they should go
      const { data: { user } } = await supabase.auth.getUser();

      // If user just recovered password, they have a session but no metadata indicating recovery completion
      // We'll redirect to reset-password to let them set a new password
      // The reset-password page will verify if they have a valid session
      return NextResponse.redirect(`${origin}/reset-password`);
    }

    // If there was an error exchanging the code, redirect to login with error
    console.error("[Auth Callback] Error exchanging code:", error);
    return NextResponse.redirect(`${origin}/login?error=auth&message=${encodeURIComponent(error.message)}`);
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
