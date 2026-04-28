import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { id, name, plan_id, subscription_status, role, email } = await request.json();

  if (!id) return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (plan_id !== undefined) updates.plan_id = plan_id;
  if (subscription_status !== undefined) updates.subscription_status = subscription_status;
  if (role !== undefined) updates.role = role;
  if (email !== undefined) updates.email = email;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // If email changed, update auth user too
  if (email) {
    await supabase.auth.admin.updateUserById(id, { email });
  }

  return NextResponse.json({ success: true, updates });
}
