import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await request.json();
  const { email, name, password, plan_id, subscription_status } = body;

  if (!email || !password || !plan_id) {
    return NextResponse.json({ error: "Email, senha e plano são obrigatórios" }, { status: 400 });
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const userId = authData.user.id;

  // Update profile (trigger on auth.users should create it, but we update with plan info)
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      name: name || email.split("@")[0],
      plan_id,
      subscription_status: subscription_status || "active",
      role: "client",
    })
    .eq("id", userId);

  // If profile doesn't exist yet (trigger not fired), insert it
  if (profileError) {
    await supabase.from("profiles").insert({
      id: userId,
      email,
      name: name || email.split("@")[0],
      plan_id,
      subscription_status: subscription_status || "active",
      role: "client",
    });
  }

  return NextResponse.json({
    user: {
      id: userId,
      email,
      name: name || email.split("@")[0],
      plan: plan_id,
      status: subscription_status || "active",
    },
  });
}
