import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error) return NextResponse.redirect(`${baseUrl}/settings?error=google_denied`);
  if (!code || !stateParam) return NextResponse.redirect(`${baseUrl}/settings?error=google_missing_code`);

  // Parse state: "userId|siteId|redirectCode"
  const parts = stateParam.split("|");
  const userId = parts[0];
  const siteId = parts[1] || "";
  const redirectCode = parts[2] || "s";
  const redirectPath = redirectCode === "d" && siteId ? `/sites/${siteId}` : redirectCode === "i" ? "/integrations/setup" : redirectCode === "o" ? "/onboarding" : "/settings";

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.refresh_token && !tokens.access_token) {
      return NextResponse.redirect(`${baseUrl}${redirectPath}?error=google_token_failed`);
    }

    const supabase = await createClient();

    if (siteId) {
      await supabase.from("client_sites").update({ google_refresh_token: tokens.refresh_token || tokens.access_token }).eq("id", siteId);
    } else {
      const { data: sites } = await supabase.from("client_sites").select("id").eq("user_id", userId).limit(1);
      if (sites?.[0]) {
        await supabase.from("client_sites").update({ google_refresh_token: tokens.refresh_token || tokens.access_token }).eq("id", sites[0].id);
      }
    }

    return NextResponse.redirect(`${baseUrl}${redirectPath}?success=google_connected`);
  } catch (err) {
    console.error("[Google OAuth] Error:", err);
    return NextResponse.redirect(`${baseUrl}${redirectPath}?error=google_error`);
  }
}
