/**
 * Live QA runner — Hotfix publish-status cache stale + cenarios legados.
 *
 * SEGURANCA:
 * - Senha NUNCA hardcoded. Le de process.env.QA_PASSWORD.
 * - Logs NUNCA imprimem senha (so confirma "login OK" / "login FAIL").
 *
 * Uso:
 *   $env:QA_PASSWORD = "..."
 *   $env:E2E_BASE_URL = "http://localhost:3001"   (opcional, default 3000)
 *   node scripts/qa/live-runner.mjs [stage]
 *
 * Stages:
 *   smoke-login    — Sanity: login + screenshot dashboard
 *   ha-deeplink    — Hotfix Cenario A: NoIntegrationDialog → click Conectar GH → volta → click Publicar → REFETCH /publish-status (FIX)
 *   hb-close-only  — Hotfix Cenario B: NoIntegrationDialog → Agora nao (ou ESC) → click Publicar → REFETCH /publish-status
 *   hd-regress     — Hotfix Cenario D: regressao cenario 4 (NoIntegrationDialog + deeplink + ESC limpa URL)
 *   c2-github      — Cenario 2 legado (bloqueado por OAuth)
 *   c4-noint       — Cenario 4 legado
 *   c5-empty       — Cenario 5.4 (TODO)
 *   cleanup        — deletar sites qa-teste (limitado por UI)
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const EMAIL = "novaeracomvisual@gmail.com"; // conta de teste autorizada pelo Bruno
const PASSWORD = process.env.QA_PASSWORD;
const STAGE = process.argv[2] ?? "smoke-login";

if (!PASSWORD) {
  console.error("[fatal] QA_PASSWORD env var ausente. Set antes de rodar.");
  process.exit(2);
}

mkdirSync("scripts/qa/screenshots", { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

// Auto-log requests pra Network tab (sem expor senha)
const apiCalls = [];
page.on("response", (resp) => {
  const url = resp.url();
  if (url.includes("/api/")) {
    apiCalls.push({ url: url.replace(BASE_URL, ""), status: resp.status(), method: resp.request().method() });
  }
});

async function shot(label, opts = {}) {
  if (!opts.skipWait) {
    try { await page.waitForLoadState("networkidle", { timeout: 8_000 }); } catch {}
    await page.waitForTimeout(500); // pequena folga pra animacoes
  }
  const path = `scripts/qa/screenshots/${label}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`[shot] ${path}`);
}

async function login() {
  console.log(`[step] login → ${BASE_URL}/login`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  // Tenta selectors em ordem: label, placeholder, name attr
  const emailLocator = page.getByLabel(/email/i).or(page.locator('input[type="email"]')).first();
  const passLocator = page.getByLabel(/senha|password/i).or(page.locator('input[type="password"]')).first();
  await emailLocator.fill(EMAIL);
  await passLocator.fill(PASSWORD);
  const submitBtn = page.getByRole("button", { name: /entrar|login|sign in/i }).first();
  await submitBtn.click();
  try {
    await page.waitForURL(/\/(dashboard|onboarding|sites|artigos)/, { timeout: 25_000 });
    console.log(`[ok] login → URL pós-login: ${page.url()}`);
    return true;
  } catch {
    console.log(`[fail] login: URL atual = ${page.url()}`);
    await shot("00-login-fail");
    return false;
  }
}

async function runSmokeLogin() {
  const ok = await login();
  await shot("00-post-login");
  console.log("apiCalls:", JSON.stringify(apiCalls, null, 2));
  return ok;
}

async function runC4NoIntegration() {
  const ok = await login();
  if (!ok) return false;

  // Skip criação de site novo — usa artigo existente da conta. Nenhum site
  // tem integração conectada (confirmado em /integracoes 0/2). Trocando o
  // contexto de site no header pra um que tenha artigo.
  console.log("[c4] Step 1 — trocar contexto pra site com artigos (marina-contadora)");
  await page.goto(`${BASE_URL}/articles`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await shot("c4-01-articles-initial");

  // Clica no site switcher do header (pode ter texto do site atual ou só URL)
  const siteSwitcher = page.locator('button:has-text("marina-contadora"), button:has-text("brunomedeiroseo"), button:has-text("qa-teste-blog-vazio")').first();
  await siteSwitcher.click({ timeout: 5_000 });
  await page.waitForTimeout(800);
  await shot("c4-02-switcher-open");

  // Seleciona marina-contadora
  await page.getByRole("option", { name: /marina-contadora/i })
    .or(page.locator("button:has-text('marina-contadora')").last())
    .or(page.getByText(/marina-contadora/).first())
    .first()
    .click({ timeout: 5_000 });
  await page.waitForTimeout(2000);
  await shot("c4-03-marina-context");

  console.log("[c4] Step 2 — clicar Publicar em artigo existente");
  const publicarCount = await page.getByRole("button", { name: /publicar/i }).count();
  console.log(`[c4] botões Publicar: ${publicarCount}`);
  if (publicarCount === 0) {
    console.log("[c4] FAIL — sem botão Publicar na lista de marina-contadora");
    return false;
  }

  // Limpa apiCalls pra capturar só o que acontecer no click
  apiCalls.length = 0;
  await page.getByRole("button", { name: /publicar/i }).first().click();
  await page.waitForTimeout(3000);
  await shot("c4-04-after-publicar-click");
  console.log("apiCalls publicar:", JSON.stringify(apiCalls, null, 2));

  // Procura sinais do NoIntegrationDialog
  const dialogTitle = await page.getByText(/Conecte uma integração primeiro/i).count();
  const wpLink = await page.locator('a[href*="/integracoes?open=wordpress"]').count();
  const ghLink = await page.locator('a[href*="/integracoes?open=github"]').count();
  console.log(`[c4] checks: dialogTitle=${dialogTitle}, wpLink=${wpLink}, ghLink=${ghLink}`);

  if (dialogTitle > 0 && wpLink > 0 && ghLink > 0) {
    console.log("[c4] [ok] NoIntegrationDialog ABERTO com 2 links corretos");
    await shot("c4-05-no-integration-dialog");

    // Testa deeplink WP: click → URL → auto-open dialog
    apiCalls.length = 0;
    await page.locator('a[href*="/integracoes?open=wordpress"]').first().click();
    await page.waitForTimeout(2500);
    await shot("c4-06-wp-deeplink");
    const urlAfter = page.url();
    console.log(`[c4] URL pós-click WP link: ${urlAfter}`);
    const wpDialogVisible = await page.getByText(/conectar com seu wordpress/i).count();
    const wpUrlOpenParam = urlAfter.includes("open=wordpress");
    console.log(`[c4] auto-open WP dialog: ${wpDialogVisible > 0 ? "[ok]" : "[X]"} | URL?open=wordpress: ${wpUrlOpenParam ? "[ok]" : "[X]"}`);

    // Fecha dialog e confirma URL volta pra /integracoes (sem ?open=)
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1500);
    await shot("c4-07-after-esc-close");
    const urlAfterClose = page.url();
    const urlClean = !urlAfterClose.includes("open=");
    console.log(`[c4] URL pós-close: ${urlAfterClose} | limpa: ${urlClean ? "[ok]" : "[X]"}`);

    return true;
  } else {
    console.log("[c4] [X] FAIL — NoIntegrationDialog não abriu ou faltam links");
    return false;
  }
}

async function runC2GithubOnly() {
  const ok = await login();
  if (!ok) return false;

  // Pra cenario 2 preciso ter site com GH conectado. Vou em /integracoes
  // e clicar Conectar GitHub. Vai redirecionar pra github.com OAuth — se o
  // browser ja tiver sessao GH do Bruno, completa. Senao bloqueio.
  console.log("[c2] Step 1 — abre /integracoes e tenta conectar GitHub");
  await page.goto(`${BASE_URL}/integracoes`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await shot("c2-01-integracoes");

  // Procura tr/row que contém "GitHub" e clica seu botão Configurar
  const githubRow = page.locator('tr').filter({ hasText: "GitHub" }).first();
  const ghConfigurar = githubRow.getByRole("button", { name: /configurar/i });
  await ghConfigurar.click({ timeout: 8_000 });
  await page.waitForTimeout(1500);
  await shot("c2-02-gh-config-dialog");
  console.log("[c2] URL após click Configurar GitHub:", page.url());

  // Procura o primeiro botão "Conectar" do site qa-teste-blog-vazio.
  // Como o nome aparece 2x (dup-submit), pega o PRIMEIRO row que tem esse texto.
  const conectarBtn = page.locator('button:has-text("Conectar")').nth(0);
  console.log("[c2] click Conectar no primeiro qa-teste-blog-vazio");
  await conectarBtn.click({ timeout: 5_000 });
  console.log("[c2] aguardando redirect ou novo dialog");
  await page.waitForTimeout(5000);
  await shot("c2-03-after-conectar-click");
  console.log("[c2] URL:", page.url());

  return true;
}

async function runC5Empty() {
  const ok = await login();
  if (!ok) return false;
  console.log("[stage c5-empty] reservado pra cenario 5.4 com artigo vazio — TODO");
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOTFIX: publish-status cache stale
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper: do login → trocar pra site sem integração → /articles → 1o click Publicar.
 * Retorna o articleId que foi clicado (extraído da chamada GET /publish-status).
 */
async function setupNoIntegrationFirstClick(stagePrefix) {
  const ok = await login();
  if (!ok) return null;

  console.log(`[${stagePrefix}] Setup — troca contexto pra site SEM integracao (marina-contadora)`);
  await page.goto(`${BASE_URL}/articles`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Troca site context via header dropdown
  const siteSwitcher = page.locator('button:has-text("marina-contadora"), button:has-text("brunomedeiroseo"), button:has-text("qa-teste-blog")').first();
  await siteSwitcher.click({ timeout: 5_000 });
  await page.waitForTimeout(800);
  await page.getByText(/marina-contadora/).first().click({ timeout: 5_000 });
  await page.waitForTimeout(2000);
  await shot(`${stagePrefix}-01-marina-context`);

  // Conta calls antes
  apiCalls.length = 0;
  const publicarCount = await page.getByRole("button", { name: /publicar/i }).count();
  console.log(`[${stagePrefix}] botões Publicar: ${publicarCount}`);
  if (publicarCount === 0) {
    console.log(`[${stagePrefix}] FAIL — sem botão Publicar`);
    return null;
  }

  // 1o click Publicar
  await page.getByRole("button", { name: /publicar/i }).first().click();
  await page.waitForTimeout(2500);
  await shot(`${stagePrefix}-02-first-publicar`);

  const dialogOpen = await page.getByText(/Conecte uma integração primeiro/i).count();
  console.log(`[${stagePrefix}] NoIntegrationDialog aberto (1a vez): ${dialogOpen > 0 ? "[ok]" : "[X]"}`);
  if (dialogOpen === 0) return null;

  // Extrai articleId do call do /publish-status
  const statusCall = apiCalls.find(c => c.url.includes("/publish-status"));
  const articleId = statusCall ? statusCall.url.match(/articles\/([^/]+)\/publish-status/)?.[1] : null;
  console.log(`[${stagePrefix}] articleId capturado: ${articleId}`);
  console.log(`[${stagePrefix}] calls após 1o click:`, apiCalls.map(c => `${c.method} ${c.url} → ${c.status}`));

  return articleId;
}

/**
 * Cenário A — Hotfix:
 * 1o click Publicar → NoIntegrationDialog → click "Conectar GitHub" (Link onClick=onClose)
 * → navega pra /integracoes?open=github → volta pra /articles (sidebar)
 * → 2o click Publicar
 * VALIDAÇÃO: GET /publish-status é chamado DE NOVO (cache invalidado pelo fix).
 * Sem o fix, status[useState] persiste e o GET é pulado.
 */
async function runHotfixA() {
  const articleId = await setupNoIntegrationFirstClick("ha");
  if (!articleId) return false;

  console.log("[ha] Step 2 — click Conectar GitHub (dispara onClose → setStatus(null) + navega)");
  await page.locator('a[href*="/integracoes?open=github"]').first().click();
  await page.waitForTimeout(2500);
  await shot("ha-03-integracoes-open-github");
  console.log(`[ha] URL pós-click: ${page.url()}`);

  // Em /integracoes — não vou conectar GH de verdade (OAuth aponta beta).
  // Fecha o dialog auto-aberto via ESC.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1500);
  await shot("ha-04-dialog-closed");

  console.log("[ha] Step 3 — volta pra /articles via sidebar (preserva soft-nav)");
  await page.getByRole("link", { name: /^Artigos$/ }).first().click();
  await page.waitForURL(/\/articles$/, { timeout: 10_000 });
  await page.waitForTimeout(2000);
  await shot("ha-05-back-to-articles");

  // Re-trocar contexto pra marina (sidebar pode ter mudado)
  const siteSwitcherCtx = page.locator('button:has-text("marina-contadora"), button:has-text("brunomedeiroseo"), button:has-text("qa-teste-blog")').first();
  const ctxText = await siteSwitcherCtx.textContent().catch(() => "");
  if (!ctxText.includes("marina-contadora")) {
    await siteSwitcherCtx.click();
    await page.waitForTimeout(500);
    await page.getByText(/marina-contadora/).first().click();
    await page.waitForTimeout(2000);
  }
  await shot("ha-06-marina-restored");

  // 2o click Publicar — esse eh o teste do FIX
  apiCalls.length = 0;
  console.log("[ha] Step 4 — 2o click Publicar (esperado: REFETCH /publish-status)");
  await page.getByRole("button", { name: /publicar/i }).first().click();
  await page.waitForTimeout(3000);
  await shot("ha-07-second-publicar");

  const refetched = apiCalls.find(c => c.url.includes("/publish-status"));
  const dialogReopened = await page.getByText(/Conecte uma integração primeiro/i).count();
  console.log(`[ha] calls após 2o click:`, apiCalls.map(c => `${c.method} ${c.url} → ${c.status}`));
  console.log(`[ha] REFETCH /publish-status: ${refetched ? "[ok]" : "[X] FAIL — cache stale"}`);
  console.log(`[ha] Dialog reabriu: ${dialogReopened > 0 ? "sim (esperado, sem integração)" : "não"}`);

  return !!refetched;
}

/**
 * Cenário B — Hotfix:
 * 1o click Publicar → NoIntegrationDialog → ESC (sem navegar)
 * → 2o click Publicar
 * VALIDAÇÃO: GET /publish-status chamado DE NOVO (onClose dispara setStatus(null)).
 */
async function runHotfixB() {
  const articleId = await setupNoIntegrationFirstClick("hb");
  if (!articleId) return false;

  console.log("[hb] Step 2 — fecha dialog com ESC (dispara onClose → setStatus(null))");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1500);
  await shot("hb-03-after-esc");

  const dialogClosed = await page.getByText(/Conecte uma integração primeiro/i).count();
  console.log(`[hb] Dialog fechou: ${dialogClosed === 0 ? "[ok]" : "[X]"}`);

  // 2o click — teste do FIX
  apiCalls.length = 0;
  console.log("[hb] Step 3 — 2o click Publicar (esperado: REFETCH /publish-status)");
  await page.getByRole("button", { name: /publicar/i }).first().click();
  await page.waitForTimeout(3000);
  await shot("hb-04-second-publicar");

  const refetched = apiCalls.find(c => c.url.includes("/publish-status"));
  const dialogReopened = await page.getByText(/Conecte uma integração primeiro/i).count();
  console.log(`[hb] calls após 2o click:`, apiCalls.map(c => `${c.method} ${c.url} → ${c.status}`));
  console.log(`[hb] REFETCH /publish-status: ${refetched ? "[ok]" : "[X] FAIL — cache stale"}`);
  console.log(`[hb] Dialog reabriu: ${dialogReopened > 0 ? "[ok] (esperado)" : "[X]"}`);

  return !!refetched && dialogReopened > 0;
}

/**
 * Cenário D — Regressão do cenário 4 anterior.
 * Replica o fluxo dead-end + deeplink WP que JÁ tinha passado, garantindo
 * que o hotfix não quebrou nada.
 */
async function runHotfixD() {
  const articleId = await setupNoIntegrationFirstClick("hd");
  if (!articleId) return false;

  // Click "Conectar WordPress" → URL muda → auto-open dialog WP
  apiCalls.length = 0;
  console.log("[hd] Step 2 — click Conectar WordPress (deeplink)");
  await page.locator('a[href*="/integracoes?open=wordpress"]').first().click();
  await page.waitForTimeout(2500);
  await shot("hd-03-wp-deeplink");

  const urlAfter = page.url();
  const wpDialogVisible = await page.getByText(/^WordPress$/).count();
  const wpUrlOpenParam = urlAfter.includes("open=wordpress");
  console.log(`[hd] URL pós-click WP: ${urlAfter}`);
  console.log(`[hd] auto-open WP dialog: ${wpDialogVisible > 0 ? "[ok]" : "[X]"} | URL?open=wordpress: ${wpUrlOpenParam ? "[ok]" : "[X]"}`);

  // ESC fecha + URL volta limpa
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1500);
  await shot("hd-04-after-esc");
  const urlAfterClose = page.url();
  const urlClean = !urlAfterClose.includes("open=");
  console.log(`[hd] URL pós-close: ${urlAfterClose} | limpa: ${urlClean ? "[ok]" : "[X]"}`);

  return wpDialogVisible > 0 && wpUrlOpenParam && urlClean;
}

async function runCleanup() {
  const ok = await login();
  if (!ok) return false;

  console.log("[cleanup] navegando /sites pra ver estado");
  await page.goto(`${BASE_URL}/sites`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await shot("cleanup-01-sites-list");

  // Conta quantos qa-teste-* existem
  const qaRows = await page.locator('tr, [class*="row"]').filter({ hasText: "qa-teste-" }).count();
  console.log(`[cleanup] sites qa-teste encontrados: ${qaRows}`);

  // Itera deletando cada qa-teste — repetido até zerar
  let safety = 10;
  while (safety-- > 0) {
    const row = page.locator('tr').filter({ hasText: "qa-teste-" }).first();
    const visible = await row.isVisible().catch(() => false);
    if (!visible) {
      console.log("[cleanup] nenhum qa-teste-* restante");
      break;
    }
    // hover pra mostrar ação (se tiver), procura botão de delete/menu
    await row.hover();
    await page.waitForTimeout(300);
    // procura por icone de lixeira ou botão delete dentro da row
    const trashBtn = row.locator('button[aria-label*="lixeira" i], button[aria-label*="delete" i], button[title*="excluir" i], button:has-text("Excluir"), button:has-text("Deletar")').first();
    const trashVisible = await trashBtn.isVisible().catch(() => false);
    if (!trashVisible) {
      // tenta clicar na linha pra entrar no /sites/[id] e deletar lá
      console.log("[cleanup] sem botão direto na row, clico na linha pra abrir");
      await row.click();
      await page.waitForURL(/\/sites\/[^/]+$/, { timeout: 8_000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await shot(`cleanup-detail-${10 - safety}`);

      const deleteOnDetail = page.getByRole("button", { name: /excluir|deletar|remover|delete/i }).first();
      const deleteVisible = await deleteOnDetail.isVisible().catch(() => false);
      if (deleteVisible) {
        await deleteOnDetail.click();
        await page.waitForTimeout(800);
        // confirma se aparecer modal
        const confirmBtn = page.getByRole("button", { name: /confirmar|sim, excluir|deletar/i }).first();
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click();
          await page.waitForTimeout(2000);
        }
      } else {
        console.log("[cleanup] sem botão delete na página de detalhe — pulando");
        break;
      }
      await page.goto(`${BASE_URL}/sites`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
    } else {
      await trashBtn.click();
      await page.waitForTimeout(800);
      const confirmBtn = page.getByRole("button", { name: /confirmar|sim, excluir|deletar/i }).first();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  }

  await shot("cleanup-99-final");
  console.log("[cleanup] terminado");
  return true;
}

try {
  let success;
  switch (STAGE) {
    case "smoke-login":
      success = await runSmokeLogin();
      break;
    case "c2-github":
      success = await runC2GithubOnly();
      break;
    case "c4-noint":
      success = await runC4NoIntegration();
      break;
    case "c5-empty":
      success = await runC5Empty();
      break;
    case "cleanup":
      success = await runCleanup();
      break;
    case "ha-deeplink":
      success = await runHotfixA();
      break;
    case "hb-close-only":
      success = await runHotfixB();
      break;
    case "hd-regress":
      success = await runHotfixD();
      break;
    default:
      console.error(`[fatal] stage desconhecido: ${STAGE}`);
      success = false;
  }
  await browser.close();
  process.exit(success ? 0 : 1);
} catch (err) {
  console.error("[fatal]", err.message);
  await shot("99-fatal-error");
  await browser.close();
  process.exit(1);
}
