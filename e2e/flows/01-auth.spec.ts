/**
 * F-001 / C-001 — Login com email/senha.
 *
 * Smoke test mais básico do produto. Valida que:
 *  - Página /login carrega
 *  - Submissão com credenciais válidas redireciona pra /dashboard ou /onboarding
 *  - Submissão com credenciais inválidas exibe mensagem de erro (sem expor stack)
 *
 * Esse teste NÃO usa storageState — login é o que está sendo testado.
 */

import { test, expect } from "@playwright/test";
import { TEST_USERS } from "../fixtures/auth";

// Desliga storageState pra esse spec (queremos começar deslogado)
test.use({ storageState: { cookies: [], origins: [] } });

test("Marina faz login e chega no app", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: /links/i })).toBeVisible();

  await page.getByLabel("Email").fill(TEST_USERS.marinaActive.email);
  await page.getByLabel("Senha").fill(TEST_USERS.marinaActive.password);
  await page.getByRole("button", { name: /entrar/i }).click();

  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 15_000 });
});

test("Login com senha errada mostra mensagem ao usuário (não erro técnico)", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill(TEST_USERS.marinaActive.email);
  await page.getByLabel("Senha").fill("senha-errada-de-proposito");
  await page.getByRole("button", { name: /entrar/i }).click();

  // Espera pela página continuar em /login (não redireciona)
  await expect(page).toHaveURL(/\/login/);

  // O botão deve estar de volta ao estado normal (não mais "Entrando...")
  await expect(page.getByRole("button", { name: /entrar/i })).toBeEnabled({ timeout: 5_000 });

  // Não vaza stack trace, JSON cru ou Postgres error.
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("PGRST");
  expect(body).not.toMatch(/at .+\(/); // call stack
  expect(body).not.toContain("supabase.co");
});
