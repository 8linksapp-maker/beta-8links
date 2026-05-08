import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Carrega variáveis de .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY etc.)
// pros fixtures de seed e auth funcionarem
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

// URL contra qual os testes rodam. Setando E2E_BASE_URL você diz ao Playwright
// "eu já estou rodando o dev server" — daí ele NÃO tenta subir um próprio.
// Útil quando você está usando outra porta (3001) ou apontando pra staging.
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOULD_MANAGE_SERVER = !process.env.CI && !process.env.E2E_BASE_URL;

/**
 * Configuração Playwright pro 8links.
 *
 * Convenções:
 *  - Roda contra o dev server local em http://localhost:3000
 *  - Mocka APIs caras/flakey (OpenAI, DataForSEO, Unsplash) via fixtures
 *  - Usuários de teste vivem no mesmo Supabase com email @8links.test
 *    (jamais aparecem em produção; veja e2e/fixtures/seed.ts)
 *  - storageState é gerado em .auth/ (gitignored) pra reaproveitar login
 */
export default defineConfig({
  testDir: "./e2e",

  /* Timeout total por teste */
  timeout: 60_000,

  /* Tempo máximo pra um único expect aguardar */
  expect: { timeout: 10_000 },

  /* Falha se .only ficou esquecido em PR (CI=true em GitHub Actions) */
  forbidOnly: !!process.env.CI,

  /* Retries em CI pra absorver flakiness ocasional; local 0 pra falha rápida */
  retries: process.env.CI ? 2 : 0,

  /* 1 worker em CI (escapa race em DB compartilhado), paralelo local */
  workers: process.env.CI ? 1 : undefined,

  /* Reporters: list (terminal) + html (relatório local) + json (consumido pela tab Cobertura no /admin/diagnostics) */
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],

  use: {
    baseURL: BASE_URL,

    /* Screenshot só em falha — economiza disco */
    screenshot: "only-on-failure",

    /* Trace SEMPRE em falha (a melhor parte do Playwright) */
    trace: "retain-on-failure",

    /* Vídeo só em falha */
    video: "retain-on-failure",

    /* Action default timeout */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    /* Setup: cria/reseta os usuários de teste e gera storageState */
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
    },
    /* Suite principal: roda só os specs em flows/ e depende do setup */
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /flows\/.*\.spec\.ts/,
      dependencies: ["setup"],
    },
  ],

  /* Sobe o dev server automaticamente só quando não tem E2E_BASE_URL (você gerencia) */
  webServer: SHOULD_MANAGE_SERVER
    ? {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
