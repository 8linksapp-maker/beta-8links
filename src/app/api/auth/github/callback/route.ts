import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !stateParam) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=github_denied`);
  }

  let state: { userId: string; siteId: string; redirect?: string };
  try {
    state = JSON.parse(stateParam);
  } catch {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=github_invalid_state`);
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=github_token_failed`);
    }

    // Get GitHub username
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const ghUser = await userRes.json();

    // Save token to client_sites
    const supabase = await createClient();

    const updateData = {
      github_token: tokens.access_token,
      github_username: ghUser.login,
    };

    if (state.siteId) {
      await supabase.from("client_sites").update(updateData).eq("id", state.siteId);
    } else {
      const { data: sites } = await supabase.from("client_sites").select("id").eq("user_id", state.userId).limit(1);
      if (sites?.[0]) {
        await supabase.from("client_sites").update(updateData).eq("id", sites[0].id);
      }
    }

    console.log(`[GitHub OAuth] Connected: ${ghUser.login}`);
    const redirectPath = state.redirect ?? "/settings";
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}${redirectPath}?success=github_connected`);
  } catch (err) {
    console.error("[GitHub OAuth] Error:", err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=github_error`);
  }
}
