/**
 * Setup global do Playwright.
 *
 * Roda uma vez antes da suite. Cria/reseta os 2 usuários de teste, faz login
 * via UI e salva storageState. Cada teste depois só declara qual usuário usa:
 *
 *   test.use({ storageState: STORAGE.marinaActive });
 */

import { test as setup, expect } from "@playwright/test";
import { ensureUser, resetUserData } from "./fixtures/seed";
import { TEST_USERS, STORAGE } from "./fixtures/auth";

setup("seed + login: marina active", async ({ page, context }) => {
  const userId = await ensureUser(TEST_USERS.marinaActive);
  await resetUserData(userId);

  await page.goto("/login");
  await page.getByLabel("Email").fill(TEST_USERS.marinaActive.email);
  await page.getByLabel("Senha").fill(TEST_USERS.marinaActive.password);
  await page.getByRole("button", { name: /entrar/i }).click();

  // Aceita tanto /dashboard quanto /onboarding (depende se onboarding_completed=true)
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20_000 });
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/);

  await context.storageState({ path: STORAGE.marinaActive });
});

setup("seed + login: marina past_due", async ({ page, context }) => {
  const userId = await ensureUser(TEST_USERS.marinaPastDue);
  await resetUserData(userId);

  await page.goto("/login");
  await page.getByLabel("Email").fill(TEST_USERS.marinaPastDue.email);
  await page.getByLabel("Senha").fill(TEST_USERS.marinaPastDue.password);
  await page.getByRole("button", { name: /entrar/i }).click();

  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20_000 });
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/);

  await context.storageState({ path: STORAGE.marinaPastDue });
});
