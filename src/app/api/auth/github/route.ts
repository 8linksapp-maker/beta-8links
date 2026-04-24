import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Redirect to GitHub OAuth.
 * Query: ?siteId=xxx
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  const redirect = searchParams.get("redirect") ?? "/settings";

  if (!process.env.GITHUB_CLIENT_ID) {
    return NextResponse.json({ error: "GitHub OAuth not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const state = JSON.stringify({ userId: user.id, siteId, redirect });

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`,
    scope: "repo",
    state,
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}
