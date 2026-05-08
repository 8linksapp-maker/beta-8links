/**
 * Constantes compartilhadas entre o global.setup.ts e os testes.
 *
 * O global.setup.ts faz login uma vez por persona e salva storageState em .auth/.
 * Os testes apenas declaram qual storageState usar via test.use({ storageState }).
 */

export const TEST_USERS = {
  marinaActive: {
    email: "marina-test@8links.test",
    password: "Test-Password-2026!",
    plan_id: "pro" as const,
    subscription_status: "active" as const,
    role: "client" as const,
  },
  marinaPastDue: {
    email: "marina-pastdue@8links.test",
    password: "Test-Password-2026!",
    plan_id: "pro" as const,
    subscription_status: "past_due" as const,
    role: "client" as const,
  },
} as const;

export const STORAGE = {
  marinaActive: ".auth/marina-active.json",
  marinaPastDue: ".auth/marina-pastdue.json",
} as const;
