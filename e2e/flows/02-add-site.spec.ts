/**
 * C-005 — Adicionar site novo (fluxo simplificado: URL → Nicho → Dashboard).
 *
 * 2 cenários:
 *  - Happy path: Marina ativa adiciona site em 2 passos e chega no /dashboard
 *  - Bloqueio: Marina past_due tenta e vê feedback claro (não vaza pra /sites/new)
 */

import { test, expect } from "@playwright/test";
import { STORAGE } from "../fixtures/auth";

// ─────────────────────────────────────────────────────────────────────
// Happy path — Marina ativa
// ─────────────────────────────────────────────────────────────────────

test.describe("Marina ativa", () => {
  test.use({ storageState: STORAGE.marinaActive });

  test("adiciona site em 2 passos (URL + nicho) e cai no dashboard", async ({ page }) => {
    await page.goto("/sites");

    // .first() porque pode haver 2 botões (header + EmptyState quando lista vazia).
    // Espera profile carregar antes de clicar (evita race com checkPlan effect).
    const addButton = page.getByRole("button", { name: /adicionar site/i }).first();
    await expect(addButton).toBeVisible({ timeout: 10_000 });
    await expect(addButton).toHaveAttribute("data-plan-status", "active", { timeout: 10_000 });
    await addButton.click();

    await expect(page).toHaveURL(/\/sites\/new/);

    // Step 1 — URL
    await page.getByPlaceholder(/meusite/i).fill("contadora-teste.com.br");
    await page.getByRole("button", { name: /^continuar/i }).click();

    // Step 2 — Nicho (escolhe e salva)
    await page.getByRole("button", { name: "Contabilidade" }).click();
    await page.getByRole("button", { name: /^adicionar site/i }).click();

    // Sucesso: cai no dashboard com o site novo já refletido
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────
// Bug aberto — Marina past_due
// ─────────────────────────────────────────────────────────────────────

test.describe("Marina com pagamento atrasado", () => {
  test.use({ storageState: STORAGE.marinaPastDue });

  test("vê feedback claro ao tentar adicionar site (não fica em silêncio)", async ({ page }) => {
    await page.goto("/sites");

    // .first() porque pode haver 2 botões (header + EmptyState).
    // Espera profile carregar — sem isso o teste cliente pode aparecer como "active"
    // por uns ms e o click vaza pra /sites/new antes da checagem do plano.
    const addButton = page.getByRole("button", { name: /adicionar site/i }).first();
    await expect(addButton).toBeVisible({ timeout: 10_000 });
    await expect(addButton).toHaveAttribute("data-plan-status", "blocked", { timeout: 10_000 });

    await addButton.click();

    // Esperamos feedback claro ao usuário em até 3s — toast, banner ou alert
    const feedback = page.getByText(/(pagamento|assinatura|renove|atualize|atrasad[ao]|pendência)/i);
    await expect(feedback).toBeVisible({ timeout: 3_000 });

    // E NÃO redirecionou pra /sites/new (porque past_due bloqueia)
    await expect(page).toHaveURL(/\/sites(\/?$|\?)/);
  });
});
