/**
 * C-013 + F-005 — Criar backlinks em massa com diversidade de âncora.
 *
 * Valida que ao pedir 10 backlinks:
 *  1. A API responde com 10 ids criados
 *  2. Os 10 NÃO usam todos a mesma âncora exact-match (anti-Penguin)
 *  3. Tem pelo menos 3 tipos distintos de âncora (exact, partial, branded, generic, url)
 *
 * Esse teste cobre indiretamente F-005 (planAnchors) — se a heurística regredir,
 * a distribuição vai ficar errada e o expect pega.
 */

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { STORAGE, TEST_USERS } from "../fixtures/auth";

test.use({ storageState: STORAGE.marinaActive });

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

test("Marina cria 10 backlinks com âncoras diversificadas", async ({ page }) => {
  const supabase = adminClient();

  // 1. Pré-condição: rede com pelo menos 3 sites ativos
  const { count: networkCount } = await supabase
    .from("network_sites")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  test.skip(
    (networkCount ?? 0) < 3,
    `Pula: network_sites tem ${networkCount ?? 0} sites ativos, mínimo 3. Popule a rede via /admin/network primeiro.`,
  );

  // 2. Garante site da Marina (limpa state anterior)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", TEST_USERS.marinaActive.email)
    .single();
  expect(profile, "profile da Marina active deve existir (rodou o setup?)").toBeTruthy();

  await supabase.from("client_sites").delete().eq("user_id", profile!.id);
  const { data: site, error: siteErr } = await supabase
    .from("client_sites")
    .insert({
      user_id: profile!.id,
      url: "https://contadora-teste.com.br",
      niche_primary: "Finanças",
      da_current: 20,
      seo_score: 0,
      phase: "planting",
      autopilot_active: true,
    })
    .select()
    .single();
  expect(siteErr).toBeNull();

  // 3. Aquece o context (carrega cookies da sessão)
  await page.goto("/dashboard");

  // 4. Chama a API com a sessão autenticada
  const res = await page.request.post("/api/backlinks/create-batch", {
    data: {
      siteId: site!.id,
      keyword: "contador online",
      targetUrl: "https://contadora-teste.com.br",
      count: 10,
    },
  });

  expect(res.ok(), `Esperava 200, recebi ${res.status()}: ${await res.text()}`).toBe(true);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.created).toBe(10);
  expect(body.ids).toHaveLength(10);

  // 5. Busca os backlinks criados pra inspecionar âncoras
  const { data: backlinks } = await supabase
    .from("backlinks")
    .select("anchor_type, anchor_text, network_site_id")
    .in("id", body.ids);

  expect(backlinks, "deveria conseguir ler os 10 backlinks criados").toHaveLength(10);

  const types = backlinks!.map(b => b.anchor_type);
  const exactCount = types.filter(t => t === "exact").length;

  // 6. Diversidade — não pode ser 100% exact (penalidade Penguin)
  expect(exactCount, "muitas âncoras exact — anchor diversity quebrou").toBeLessThanOrEqual(2);

  // Tem pelo menos 3 tipos distintos
  const distinct = new Set(types);
  expect(distinct.size, `só ${distinct.size} tipos distintos: ${[...distinct].join(", ")}`).toBeGreaterThanOrEqual(3);

  // Cada âncora tem texto não-vazio
  for (const bl of backlinks!) {
    expect(bl.anchor_text?.trim()).toBeTruthy();
  }

  // Limpeza — deixa o banco como começou
  await supabase.from("backlinks").delete().in("id", body.ids);
  await supabase.from("client_sites").delete().eq("id", site!.id);
});
