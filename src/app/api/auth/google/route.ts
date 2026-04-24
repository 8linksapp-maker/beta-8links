import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId") ?? "";
  const redirect = searchParams.get("redirect") ?? "s"; // "s" = settings, "i" = integrations/setup

  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json({ error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const scopes = [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
  ].join(" ");

  // Keep state short to avoid Google 500 error
  // d = site detail page (redirect to /sites/[siteId])
  const redirectCode = redirect.startsWith("/sites/") ? "d" : redirect === "/integrations/setup" ? "i" : redirect === "/onboarding" ? "o" : "s";
  const state = `${user.id}|${siteId}|${redirectCode}`;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
