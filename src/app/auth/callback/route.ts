import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Check for recovery type from Supabase
  // Supabase sends: ?code=xxx&type=recovery
  const type = searchParams.get("type");

  console.log("[Auth Callback] Params:", { code: code?.slice(0, 10) + "...", type, url: request.url });

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      console.log("[Auth Callback] Session exchanged successfully, type:", type);

      // Check if this is a password recovery flow
      // The type param is sent by Supabase for password recovery
      if (type === "recovery") {
        console.log("[Auth Callback] Recovery flow detected, redirecting to /reset-password");
        // For password recovery, redirect to reset-password page
        // The session is now established and the user can call updateUser
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      // Normal auth flow - redirect to dashboard or next path
      console.log("[Auth Callback] Normal auth flow, redirecting to:", next);
      return NextResponse.redirect(`${origin}${next}`);
    }

    // If there was an error exchanging the code, redirect to login with error
    console.error("[Auth Callback] Error exchanging code:", error);
    return NextResponse.redirect(`${origin}/login?error=auth&message=${encodeURIComponent(error.message)}`);
  }

  // No code provided - redirect to login
  console.error("[Auth Callback] No code provided");
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
