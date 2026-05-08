/**
 * Seed de usuários de teste no Supabase.
 *
 * Convenção: TODO email de teste termina em `@8links.test`. Filtros nos testes e em
 * dashboards excluem esse domínio pra evitar contaminação visual.
 *
 * Esses utilitários precisam de SUPABASE_SERVICE_ROLE_KEY (carregado pelo dotenv
 * em playwright.config.ts).
 */

import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";

// Garante que .auth/ existe pra Playwright salvar storageState
mkdirSync(".auth", { recursive: true });

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "[seed] NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios em .env.local",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

interface EnsureUserOpts {
  email: string;
  password: string;
  plan_id: "starter" | "pro" | "agency";
  subscription_status: "active" | "trialing" | "canceled" | "past_due";
  role: "client" | "admin";
  name?: string;
}

/**
 * Cria o usuário se não existe; reseta senha + profile se existe.
 * Retorna o ID do user na auth.users.
 */
export async function ensureUser(opts: EnsureUserOpts): Promise<string> {
  const supabase = adminClient();

  // 1. Achar profile existente
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", opts.email.toLowerCase())
    .maybeSingle();

  let userId = existing?.id;

  if (!userId) {
    // Criar
    const { data, error } = await supabase.auth.admin.createUser({
      email: opts.email,
      password: opts.password,
      email_confirm: true,
      user_metadata: { name: opts.name ?? "Marina Teste" },
    });
    if (error || !data.user) {
      throw new Error(`[seed] falhou criar ${opts.email}: ${error?.message ?? "sem user"}`);
    }
    userId = data.user.id;
    // Espera o trigger handle_new_user popular o profile
    await new Promise(r => setTimeout(r, 250));
  } else {
    // Reset senha
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: opts.password,
      email_confirm: true,
    });
    if (error) {
      throw new Error(`[seed] falhou resetar senha de ${opts.email}: ${error.message}`);
    }
  }

  // 2. Atualizar profile com os valores que o teste espera
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      plan_id: opts.plan_id,
      subscription_status: opts.subscription_status,
      role: opts.role,
      name: opts.name ?? "Marina Teste",
      onboarding_completed: true,
    })
    .eq("id", userId);
  if (profileErr) {
    throw new Error(`[seed] falhou atualizar profile ${opts.email}: ${profileErr.message}`);
  }

  return userId;
}

/**
 * Limpa dados gerados em testes anteriores: sites, backlinks, artigos, keywords.
 * Mantém o usuário e profile (a senha já foi resetada por ensureUser).
 */
export async function resetUserData(userId: string): Promise<void> {
  const supabase = adminClient();
  // client_sites tem cascade pra backlinks/keywords/articles
  await supabase.from("client_sites").delete().eq("user_id", userId);
  // Reseta usage_tracking pra não acumular
  await supabase.from("usage_tracking").delete().eq("user_id", userId);
}

/** Útil pra testes one-off que querem garantir limpeza total. */
export async function deleteTestUser(email: string): Promise<void> {
  const supabase = adminClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (existing) {
    await supabase.auth.admin.deleteUser(existing.id);
  }
}
