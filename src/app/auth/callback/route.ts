import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Note: Supabase sends the type in the URL for password recovery
  // We need to check for both "type" and "code" params
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if this is a password recovery flow
      // The session will have a 'recovery' or 'email_change' type if it's a recovery flow
      const sessionType = type || searchParams.get("type");

      if (sessionType === "recovery") {
        // For password recovery, redirect to reset-password page
        // The session is now established and the user can call updateUser
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      // Normal auth flow - redirect to dashboard or next path
      return NextResponse.redirect(`${origin}${next}`);
    }

    // If there was an error exchanging the code, redirect to login with error
    console.error("[Auth Callback] Error exchanging code:", error);
    return NextResponse.redirect(`${origin}/login?error=auth&message=${encodeURIComponent(error.message)}`);
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
