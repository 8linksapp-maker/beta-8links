import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/auth/quick-reset
 * Body: { email: string, newPassword: string }
 *
 * For migrated users who can't receive reset emails.
 * Sets the password directly via admin API.
 */
export async function POST(request: Request) {
  const { email, newPassword } = await request.json();
  if (!email || !newPassword) return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
  if (newPassword.length < 6) return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find user by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) return NextResponse.json({ error: "Erro interno" }, { status: 500 });

  const user = users?.find(u => u.email === email.toLowerCase().trim());
  if (!user) return NextResponse.json({ error: "Email não encontrado" }, { status: 404 });

  // Update password
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
    email_confirm: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
